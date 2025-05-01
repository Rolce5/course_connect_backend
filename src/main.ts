import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { join } from 'path';
import { NestExpressApplication } from '@nestjs/platform-express';
import * as bodyParser from 'body-parser';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // =============================================
  // 1. Dynamic CORS Configuration
  // =============================================
  const isProduction = process.env.NODE_ENV === 'production';
  const localFrontendUrl = 'http://localhost:3000';
  const productionFrontendUrl =
    process.env.FRONTEND_URL || 'https://course-connect-henna.vercel.app';

  app.enableCors({
    origin: isProduction ? productionFrontendUrl : localFrontendUrl,
    credentials: true, // Required for cookies/auth
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'Accept',
    ],
    exposedHeaders: ['Authorization'], // For JWT tokens
    maxAge: 86400, // 24h cache for preflight requests
  });

  // =============================================
  // 2. Global Pipes
  // =============================================
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      disableErrorMessages: isProduction, // Hide details in production
    }),
  );

  // =============================================
  // 3. Static Assets & Body Parser
  // =============================================
  app.useStaticAssets(join(__dirname, '..', 'uploads'), {
    prefix: '/uploads/',
    maxAge: isProduction ? '7d' : '1h', // Longer cache in production
  });

  app.use(bodyParser.json({ limit: '10mb' }));
  app.use(bodyParser.urlencoded({ limit: '10mb', extended: true }));

  // =============================================
  // 4. Security (Production Only)
  // =============================================
  if (isProduction) {
    app.set('trust proxy', 1); // For secure cookies behind proxies
    const helmet = require('helmet');
    app.use(helmet());
  }

  // =============================================
  // 5. Start Application
  // =============================================
  const port = process.env.PORT || 5000;
  await app.listen(port);

  console.log(
    `🚀 Server running in ${isProduction ? 'PRODUCTION' : 'DEVELOPMENT'} mode`,
  );
  console.log(
    `🔗 Allowed Origin: ${isProduction ? productionFrontendUrl : localFrontendUrl}`,
  );
  console.log(`📡 Listening on port ${port}`);
}

bootstrap();