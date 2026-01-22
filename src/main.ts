import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { enableGlobalCors } from 'libs/cors/cors.helper';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS
  enableGlobalCors(app);

  // Select port for Gateway (ENV driven)
  const PORT = process.env.PORT || 3000;

  await app.listen(Number(PORT), '0.0.0.0');  // Required for Docker networking

  console.log(`🚀 Gateway running at http://localhost:${PORT}/graphql`);
}

bootstrap();
