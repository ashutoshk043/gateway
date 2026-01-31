import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { enableGlobalCors } from 'libs/cors/cors.helper';
import { Logger, ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const logger = new Logger('Gateway');

  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  // ✅ Global CORS
  enableGlobalCors(app);

  // ✅ Global validation (important if REST endpoints exist later)
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  // ✅ Graceful shutdown (Docker / Kubernetes safe)
  app.enableShutdownHooks();

  // ✅ Body size limit (avoid payload crash)
  app.getHttpAdapter().getInstance().use(require('express').json({ limit: '2mb' }));

  const PORT = Number(process.env.PORT) || 3000;

  await app.listen(PORT, '0.0.0.0');

  logger.log(`🚀 Gateway running on port ${PORT}`);
  logger.log(`📡 GraphQL endpoint ready`);
}

bootstrap();
