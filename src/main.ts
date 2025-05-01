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
 // =============================================
// 1. Enhanced CORS Configuration
// =============================================
const isProduction = process.env.NODE_ENV === 'production';
const allowedOrigins = [
  'http://localhost:3000',
  'https://course-connect-henna.vercel.app',
  // Add other environments/staging URLs if needed
];

// Allow Render's own domain for health checks if needed
if (process.env.RENDER_EXTERNAL_HOSTNAME) {
  allowedOrigins.push(`https://${process.env.RENDER_EXTERNAL_HOSTNAME}`);
}

app.enableCors({
  origin: isProduction 
    ? allowedOrigins.filter(origin => origin !== 'http://localhost:3000') 
    : allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
  ],
  exposedHeaders: ['Authorization'],
  maxAge: 86400,
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

  // console.log(
  //   `🚀 Server running in ${isProduction ? 'PRODUCTION' : 'DEVELOPMENT'} mode`,
  // );
  // console.log(
  //   `🔗 Allowed Origin: ${isProduction ? productionFrontendUrl : localFrontendUrl}`,
  // );
  // console.log(`📡 Listening on port ${port}`);
}

bootstrap();