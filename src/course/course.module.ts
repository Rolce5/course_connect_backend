import { Module } from '@nestjs/common';
import { CourseController } from './course.controller';
import { CourseService } from './course.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { MulterModule } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import * as path from 'path';
import { randomUUID } from 'crypto'; // Use Node.js's built-in crypto module
import { AuthModule } from 'src/auth/auth.module';
import { CloudinaryModule } from 'src/cloudinary/cloudinary.module';

@Module({
  imports: [
    AuthModule,
    CloudinaryModule,
    // MulterModule.register({
    //   storage: diskStorage({
    //     destination: './uploads',
    //     filename: (req, file, callback) => {
    //       // Generate a unique filename using randomUUID and the original file extension
    //       const filename = `${randomUUID()}${path.extname(file.originalname)}`;
    //       callback(null, filename);
    //     },
    //   }),
    //   fileFilter: (req, file, callback) => {
    //     if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/)) {
    //       return callback(new Error('Only image files are allowed!'), false);
    //     }
    //     callback(null, true);
    //   },
    //   limits: {
    //     fileSize: 5 * 1024 * 1024, // Limit file size to 5MB
    //   },
    // }),
  ],
  controllers: [CourseController],
  providers: [CourseService, PrismaService],
})
export class CourseModule {}