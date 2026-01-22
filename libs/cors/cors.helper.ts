import { INestApplication } from '@nestjs/common';

interface CorsOptions {
  origin?: string | string[];
  methods?: string;
  credentials?: boolean;
}

export function enableGlobalCors(app: INestApplication, options?: CorsOptions) {
  const defaultOptions: CorsOptions = {
    origin: ['http://localhost:4200'],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  };

  app.enableCors({ ...defaultOptions, ...options });
}
