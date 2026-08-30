import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  const jwtSecret = config.get<string>('JWT_SECRET');
  if (process.env.NODE_ENV === 'production' && (!jwtSecret || jwtSecret.length < 32 || jwtSecret.includes('replace-with'))) {
    throw new Error('JWT_SECRET must be a strong value of at least 32 characters in production.');
  }

  app.setGlobalPrefix('api');

  const configuredOrigins = (config.get<string>('ALLOWED_ORIGINS') || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);

  const allowedOrigins = new Set([
    config.get<string>('FRONTEND_URL') || 'http://localhost:5173',
    'http://localhost:5174',
    'http://127.0.0.1:5174',
    'http://127.0.0.1:5173',
    ...configuredOrigins,
  ]);

  app.enableCors({
    origin(origin, callback) {
      // Native/Electron file renderers commonly send no origin or "null".
      if (!origin || origin === 'null' || allowedOrigins.has(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error(`Origin ${origin} is not allowed by CORS`), false);
    },
    credentials: false,
  });

  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, transform: true }),
  );

  const port = Number(config.get('PORT') || 3000);
  await app.listen(port);
  console.log(`API running at http://localhost:${port}/api`);
}

bootstrap();
