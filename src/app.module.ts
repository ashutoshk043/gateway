import { Module, Logger } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloGatewayDriver, ApolloGatewayDriverConfig } from '@nestjs/apollo';
import { IntrospectAndCompose, RemoteGraphQLDataSource } from '@apollo/gateway';
import axios from 'axios';
import { ConfigModule } from '@nestjs/config';

// -----------------------------------------------------
// 🔹 Wait until all subgraph services become available
// -----------------------------------------------------
async function waitForServices(urls: string[], interval = 2000) {
  for (const url of urls) {
    let ready = false;

    while (!ready) {
      try {
        await axios.post(url, { query: '{ __typename }' });
        console.log(`✅ UP: ${url}`);
        ready = true;
      } catch (err) {
        console.log(`⏳ Waiting for: ${url} ... retrying in ${interval}ms`);
        await new Promise((r) => setTimeout(r, interval));
      }
    }
  }
}

@Module({
  imports: [
    // Load correct env file
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath:
        process.env.NODE_ENV === 'docker'
          ? '.env.docker'
          : '.env',
    }),

    GraphQLModule.forRootAsync<ApolloGatewayDriverConfig>({
      driver: ApolloGatewayDriver,

      useFactory: async () => {
        // 🔹 Force convert undefined → '' to avoid type errors
        const serviceUrls: string[] = [
          process.env.AUTH_SERVICE_URL || '',
          process.env.FOOD_SERVER_URL || '',
        ];

        // 🔹 Validate that no empty URL exists
        serviceUrls.forEach((url, index) => {
          if (!url.trim()) {
            throw new Error(`❌ Missing ENV URL at index: ${index}`);
          }
        });

        // 🔹 Wait until all microservices are up
        await waitForServices(serviceUrls);

        return {
          // -----------------------------------------------------
          // 🔹 Apollo Federation Setup (ENV-based)
          // -----------------------------------------------------
          gateway: {
            supergraphSdl: new IntrospectAndCompose({
              subgraphs: [
                { name: 'auth', url: process.env.AUTH_SERVICE_URL! },
                { name: 'food', url: process.env.FOOD_SERVER_URL! },
              ],
              pollIntervalInMs: 2000,
            }),
          // 🔥🔥🔥 THIS IS THE KEY FIX
            buildService({ url }) {
              return new RemoteGraphQLDataSource({
                url,

                willSendRequest({ request, context }) {
                  const authHeader =
                    context.req?.headers?.authorization;

                  if (authHeader && request.http) {
                    request.http.headers.set(
                      'authorization',
                      authHeader,
                    );
                  }
                },
              });
            },
          },
          // 🔥 REQUIRED: expose req to gateway
          context: ({ req }) => ({ req }),

          // No CORS — removed as requested
          server: {
            playground: true,
          },
        };
      },
    }),
  ],
})
export class AppModule {
  private readonly logger = new Logger(AppModule.name);

  constructor() {
    this.logger.log(
      `🚀 Gateway initialized successfully — ENV: ${process.env.NODE_ENV}`,
    );
  }
}
