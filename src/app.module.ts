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
import { PaymentController } from './payment/payment.controller';
import { PaymentModule } from './payment/payment.module';
import { QuizModule } from './quiz/quiz.module';
import { QuizQuestionController } from './quiz-question/quiz-question.controller';
import { QuizQuestionModule } from './quiz-question/quiz-question.module';
import { NoteController } from './note/note.controller';
import { NoteModule } from './note/note.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { RecommendCourseController } from './recommend-course/recommend-course.controller';
import { RecommendCourseModule } from './recommend-course/recommend-course.module';
import { CertificateService } from './certificate/certificate.service';
import { CertificateModule } from './certificate/certificate.module';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), AuthModule, UserModule, PrismaModule, CourseModule, LessonsModule, EnrollmentModule, CloudinaryModule, ModuleModule, PaymentModule, QuizModule, QuizQuestionModule, NoteModule, DashboardModule, RecommendCourseModule, CertificateModule],
  controllers: [AppController, CourseController, EnrollmentController, ModuleController, PaymentController, QuizQuestionController, NoteController, RecommendCourseController],
  providers: [AppService, CourseService, EnrollmentService, CloudinaryService, CertificateService, ],
})
export class AppModule {}
