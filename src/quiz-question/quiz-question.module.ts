import { Module } from '@nestjs/common';
import { QuizQuestionService } from './quiz-question.service';
import { QuizQuestionController } from './quiz-question.controller';
import { AuthModule } from 'src/auth/auth.module';

@Module({
  imports: [AuthModule], // Add this import
  controllers: [QuizQuestionController],
  providers: [QuizQuestionService],
  exports: [QuizQuestionService], // Export only if another module needs it
})
export class QuizQuestionModule {}
