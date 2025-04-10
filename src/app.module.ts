import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { PrismaModule } from './prisma/prisma.module';
import { ConfigModule } from '@nestjs/config';
import { CourseService } from './course/course.service';
import { CourseController } from './course/course.controller';
import { CourseModule } from './course/course.module';
import { LessonsModule } from './lessons/lessons.module';
import { EnrollmentService } from './enrollment/enrollment.service';
import { EnrollmentController } from './enrollment/enrollment.controller';
import { EnrollmentModule } from './enrollment/enrollment.module';
import { CloudinaryService } from './cloudinary/cloudinary.service';
import { CloudinaryModule } from './cloudinary/cloudinary.module';
import { ModuleController } from './module/module.controller';
import { ModuleModule } from './module/module.module';
import { StudentService } from './student/student.service';
import { StudentModule } from './student/student.module';
import { PaymentController } from './payment/payment.controller';
import { PaymentModule } from './payment/payment.module';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), AuthModule, UserModule, PrismaModule, CourseModule, LessonsModule, EnrollmentModule, CloudinaryModule, ModuleModule, StudentModule, PaymentModule],
  controllers: [AppController, CourseController, EnrollmentController, ModuleController, PaymentController],
  providers: [AppService, CourseService, EnrollmentService, CloudinaryService, StudentService],
})
export class AppModule {}
