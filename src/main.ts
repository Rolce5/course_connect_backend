import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { join } from 'path';
import { NestExpressApplication } from '@nestjs/platform-express';
import * as bodyParser from 'body-parser';
import helmet from 'helmet';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // =============================================
  // 1. Enhanced CORS Configuration
  // =============================================
  const isProduction = process.env.NODE_ENV === 'production';
  const allowedOrigins = [
    'http://localhost:3000', // Local development
    'https://course-connect-henna.vercel.app', // Production frontend
    ...(process.env.RENDER_EXTERNAL_HOSTNAME
      ? [`https://${process.env.RENDER_EXTERNAL_HOSTNAME}`]
      : []), // Render health checks
  ];

  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, etc)
      if (!origin) return callback(null, true);

      // Check against allowed origins
      const originAllowed = allowedOrigins.some(
        (allowed) =>
          origin === allowed ||
          (!isProduction &&
            (origin.startsWith('http://localhost:') ||
              origin.startsWith('http://127.0.0.1:'))),
      );

      originAllowed
        ? callback(null, true)
        : callback(new Error(`Origin '${origin}' not allowed by CORS`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    exposedHeaders: ['Authorization', 'Set-Cookie'],
    maxAge: 86400, // 24h preflight cache
  });

  // =============================================
  // 2. Security Middleware
  // =============================================
  app.use(helmet());
  app.set('trust proxy', 1); // For secure cookies behind proxies

  // =============================================
  // 3. Global Pipes
  // =============================================
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      disableErrorMessages: isProduction,
    }),
  );

  // =============================================
  // 4. Static Assets & Body Parser
  // =============================================
  app.useStaticAssets(join(__dirname, '..', 'uploads'), {
    prefix: '/uploads/',
    maxAge: isProduction ? '7d' : '1h',
  });

  app.use(bodyParser.json({ limit: '10mb' }));
  app.use(bodyParser.urlencoded({ limit: '10mb', extended: true }));

  // =============================================
  // 5. Start Application
  // =============================================
  const port = process.env.PORT || 5000;
  await app.listen(port);

  console.log(`
  🚀 Server running in ${isProduction ? 'PRODUCTION' : 'DEVELOPMENT'} mode
  🔗 Allowed Origins: ${allowedOrigins.join(', ')}
  📡 Listening on port ${port}
  `);
}

bootstrap();
