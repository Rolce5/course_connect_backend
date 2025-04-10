import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { join } from 'path';
import { NestExpressApplication } from '@nestjs/platform-express'; // Import NestExpressApplication
import * as bodyParser from 'body-parser';


async function bootstrap() {
  // Specify the app type as NestExpressApplication
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Enable global validation pipes
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
    }),
  );

  // Serve static files from the 'uploads' directory
  app.useStaticAssets(join(__dirname, '..', 'uploads'), {
    prefix: '/uploads/',
  });

  // Enable CORS
  app.enableCors();

    // Increase body parser limit
    app.use(bodyParser.json({ limit: '10mb' })); // Adjust the limit as necessary
    app.use(bodyParser.urlencoded({ limit: '10mb', extended: true }));
  

  // Start the application
  await app.listen(process.env.PORT ?? 5000);
}
bootstrap();




// import { NestFactory } from '@nestjs/core';
// import { AppModule } from './app.module';
// import { ValidationPipe } from '@nestjs/common';
// import { join } from 'path';

// async function bootstrap() {
//   const app = await NestFactory.create(AppModule);
//   app.useGlobalPipes(
//     new ValidationPipe({
//       whitelist: true,
//     }),
//   );

//   // Serve static files from the 'uploads' directory
//   app.useStaticAssets(join(__dirname, '..', 'uploads'), {
//     prefix: '/uploads/',
//   });

//   // Enable CORS
//   app.enableCors();

//   await app.listen(process.env.PORT ?? 5000);
// }
// bootstrap();

// // main.ts
// import { NestFactory } from '@nestjs/core';
// import { AppModule } from './app.module';
// import { RolesGuard } from './roles.guard';
// import { Reflector } from '@nestjs/core';

// async function bootstrap() {
//     const app = await NestFactory.create(AppModule);
//     const reflector = app.get(Reflector);
//     app.useGlobalGuards(new RolesGuard(reflector)); // Apply globally
//     await app.listen(3000);
// }
// bootstrap();
