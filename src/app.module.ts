import { Module, Logger, UnauthorizedException, ServiceUnavailableException } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloGatewayDriver, ApolloGatewayDriverConfig } from '@nestjs/apollo';
import { IntrospectAndCompose, RemoteGraphQLDataSource } from '@apollo/gateway';
import axios from 'axios';
import { ConfigModule } from '@nestjs/config';
import { GrpcModule } from './grpc/clients/grpc.client';
import { GrpcService } from './grpc/services/grpc.service';
import * as jwt from 'jsonwebtoken';
import { RedisModule } from 'libs/redis/redis.module';
import { RedisClientType } from 'redis';

// -----------------------------------------------------
// 🔹 Wait until subgraphs are UP (Fail if not reachable)
// -----------------------------------------------------
async function waitForServices(urls: string[], retries = 20) {
  for (const url of urls) {
    let attempts = 0;
    let ready = false;

    while (!ready && attempts < retries) {
      try {
        await axios.post(url, { query: '{ __typename }' });
        console.log(`✅ UP: ${url}`);
        ready = true;
      } catch {
        attempts++;
        console.log(`⏳ Waiting for: ${url} (${attempts}/${retries})`);
        await new Promise((r) => setTimeout(r, 2000));
      }
    }

    if (!ready) {
      throw new Error(`❌ Service not reachable: ${url}`);
    }
  }
}

@Module({
  imports: [
    RedisModule,
    GrpcModule,
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath:
        process.env.NODE_ENV === 'docker' ? '.env.docker' : '.env',
    }),

    GraphQLModule.forRootAsync<ApolloGatewayDriverConfig>({
      driver: ApolloGatewayDriver,
      imports: [RedisModule],
      inject: ['REDIS_CLIENT'],

      useFactory: async (redis: RedisClientType) => {
        const serviceUrls = [
          process.env.AUTH_SERVICE_URL!,
          process.env.FOOD_SERVER_URL!,
        ];

        await waitForServices(serviceUrls);

        return {
          gateway: {
            supergraphSdl: new IntrospectAndCompose({
              subgraphs: [
                { name: 'auth', url: process.env.AUTH_SERVICE_URL! },
                { name: 'food', url: process.env.FOOD_SERVER_URL! },
              ],
              pollIntervalInMs: 2000,
            }),

            buildService({ url }) {
              return new RemoteGraphQLDataSource({
                url,

                willSendRequest({ request, context }) {
                  // 🚨 Introspection phase → context undefined hota hai
                  if (!request.http) return;

                  // If no context, this is schema introspection call
                  if (!context || !context.req) {
                    return;
                  }

                  // Forward verified user only
                  if (context.user) {
                    request.http.headers.set(
                      'x-user',
                      JSON.stringify(context.user),
                    );
                  }

                  if (context.req.headers.authorization) {
                    request.http.headers.set(
                      'authorization',
                      context.req.headers.authorization,
                    );
                  }
                },

                didEncounterError(error) {
                  console.error('❌ Subgraph Runtime Error:', error);
                  throw new ServiceUnavailableException('Subgraph service unavailable');
                },
              });
            },
          },

          server: {
            playground: true,
            csrfPrevention: true,

            // 🔐 STRICT JWT VALIDATION
            context: async ({ req }) => {
              const operationName = req.body?.operationName;

              const PUBLIC_OPERATIONS = ['loginRestraurent', 'RefreshToken'];

              // 🟢 Skip auth for public operations
              if (PUBLIC_OPERATIONS.includes(operationName)) {
                return { req, isPublic: true };
              }

              const authHeader = req.headers.authorization;

              if (!authHeader) {
                throw new UnauthorizedException('Authorization header missing');
              }

              if (!authHeader.startsWith('Bearer ')) {
                throw new UnauthorizedException('Invalid auth format');
              }

              const token = authHeader.replace('Bearer ', '');

              try {
                const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);

                if (!decoded?.user_id) {
                  throw new UnauthorizedException('Invalid token payload');
                }

                return {
                  req,
                  user: {
                    userId: decoded.user_id,
                    roleId: decoded.roleId,
                  },
                };
              } catch (err: any) {
                console.error('JWT Verification Failed:', err.message);
                throw new UnauthorizedException('Token invalid or expired');
              }
            },
          },
        };
      },
    }),
  ],
  providers: [GrpcService],
  exports: [GrpcService],
})
export class AppModule {
  private readonly logger = new Logger(AppModule.name);

  constructor() {
    this.logger.log(`🚀 Secure Gateway started — ENV: ${process.env.NODE_ENV}`);
  }
}
