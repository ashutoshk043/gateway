import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { dirname, join } from 'path';
import * as fs from 'fs';

/**
 * Dynamically resolve proto path from installed package
 */
export function resolveProto(service: 'auth' | 'restaurant'): string {
  const fallbackPaths = [
    // 1️⃣ Try node_modules (production build)
    join(__dirname, '../../node_modules/@tivr/grpc-protos/proto', service, `${service}.proto`),
    // 2️⃣ Try cwd (dev / ts-node)
    join(process.cwd(), 'node_modules/@tivr/grpc-protos/proto', service, `${service}.proto`),
    // 3️⃣ Optional: direct link (workspace symlink)
    join(process.cwd(), 'libs/grpc-protos/proto', service, `${service}.proto`),
  ];

  for (const path of fallbackPaths) {
    if (fs.existsSync(path)) {
      console.log(`✅ Using protoPath for ${service}:`, path);
      return path;
    }
  }

  throw new Error(
    `❌ ${service}.proto not found in grpc-protos package. Tried paths:\n${fallbackPaths
      .map(p => `  - ${p}`)
      .join('\n')}`,
  );
}
@Module({
  imports: [
    ClientsModule.register([
      {
        name: 'AUTH_PACKAGE',
        transport: Transport.GRPC,
        options: {
          package: 'auth',
          protoPath: resolveProto('auth'),
          url: process.env.AUTH_GRPC_URL || 'localhost:50051',
        },
      },
      {
        name: 'RESTAURANT_PACKAGE',
        transport: Transport.GRPC,
        options: {
          package: 'restaurant',
          protoPath: resolveProto('restaurant'),
          url: process.env.RESTAURANT_GRPC_URL || 'localhost:50052',
        },
      },
    ]),
  ],
  exports: [ClientsModule],
})
export class GrpcModule {}
