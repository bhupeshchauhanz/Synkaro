import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import * as express from 'express';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  const config = app.get(ConfigService);
  const logger = new Logger('Bootstrap');
  const isProd = config.get<string>('NODE_ENV') === 'production';

  app.setGlobalPrefix('api');

  // Increase JSON body limit for avatar uploads (base64 images can be ~2MB)
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ limit: '10mb', extended: true }));

  // Global BigInt serialization fix — Prisma uses BigInt for fileSize
  // JSON.stringify can't handle BigInt natively, so we patch it globally
  (BigInt.prototype as unknown as { toJSON: () => string }).toJSON = function () {
    return this.toString();
  };

  // Helmet with proper CSP + security headers
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'", 'https://accounts.google.com'],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:', 'https:'],
          connectSrc: ["'self'", 'wss:', 'ws:', 'https:', 'http:'],
          frameSrc: ["'self'", 'https://accounts.google.com'],
          mediaSrc: ["'self'", 'blob:'],
          objectSrc: ["'none'"],
          upgradeInsecureRequests: isProd ? [] : null,
        },
      },
      crossOriginEmbedderPolicy: false,
      crossOriginResourcePolicy: { policy: 'cross-origin' }, // Allow video serving cross-origin
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
      hsts: isProd ? { maxAge: 63072000, includeSubDomains: true, preload: true } : false,
    }),
  );

  app.use(cookieParser());

  // Serve uploaded files (videos, backgrounds) with security headers
  const uploadDir = config.get<string>('UPLOAD_DIR') ?? './uploads';
  app.use(
    '/uploads',
    express.static(uploadDir, {
      maxAge: '1h',
      setHeaders: (res) => {
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('Cache-Control', 'public, max-age=3600');
      },
    }),
  );

  const webUrl = config.get<string>('WEB_URL') ?? 'http://localhost:3000';
  app.enableCors({
    origin: isProd
      ? [webUrl]
      : (origin, cb) => {
          // Dev mode: allow localhost + any LAN IP on common dev ports
          if (!origin) return cb(null, true);
          const allowed =
            origin === webUrl ||
            /^http:\/\/localhost:\d+$/.test(origin) ||
            /^http:\/\/127\.0\.0\.1:\d+$/.test(origin) ||
            /^http:\/\/10\.\d+\.\d+\.\d+:\d+$/.test(origin) ||
            /^http:\/\/192\.168\.\d+\.\d+:\d+$/.test(origin) ||
            /^http:\/\/172\.(1[6-9]|2\d|3[01])\.\d+\.\d+:\d+$/.test(origin);
          if (allowed) cb(null, true);
          else cb(new Error(`CORS blocked: ${origin}`));
        },
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());

  // Swagger only in non-production
  if (!isProd) {
    const swagger = new DocumentBuilder()
      .setTitle('Synkaro API')
      .setDescription('Watch-together platform API')
      .setVersion('1.0')
      .addCookieAuth('access_token')
      .build();
    const document = SwaggerModule.createDocument(app, swagger);
    SwaggerModule.setup('api/docs', app, document);
    logger.log('Swagger docs available at /api/docs');
  }

  const port = Number(config.get<string>('PORT') ?? 3001);
  await app.listen(port, '0.0.0.0');
  logger.log(`Synkaro API listening on port ${port}`);
}

void bootstrap();
