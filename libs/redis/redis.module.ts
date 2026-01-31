// libs/redis/src/redis.module.ts

import { Module, Global } from '@nestjs/common';
import { createClient, RedisClientType } from 'redis';

@Global()
@Module({
  providers: [
    {
      provide: 'REDIS_CLIENT',
      useFactory: async (): Promise<RedisClientType> => {
        const client: RedisClientType = createClient({
          url: process.env.REDIS_URL || 'redis://localhost:6379',
        });

        client.on('error', (err) => console.error('❌ Redis Error', err));
        client.on('connect', () => console.log('✅ Redis Connected On Gateway'));

        await client.connect();

        return client;
      },
    },
  ],
  exports: ['REDIS_CLIENT'],
})
export class RedisModule {}
