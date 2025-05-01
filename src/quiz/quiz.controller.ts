import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { QuizService } from './quiz.service';
import { JwtGuard } from 'src/auth/guard';
import { createQuizDto } from './dto/create-quiz-dto';
import { SubmitQuizAnswersDto } from './dto/submit-quiz-answers.dto';
import { GetUser } from 'src/auth/decorator';

@UseGuards(JwtGuard)
@Controller('api/quizzes')
export class QuizController {
  constructor(private quizService: QuizService) {}

  @Post()
  createQuiz(@Body() dto: createQuizDto) {
    return this.quizService.createQuiz(dto);
  }

  @Get(':id')
  getLessonQuiz(@Param('id', ParseIntPipe) lessonId: number) {
    return this.quizService.getLessonQuizId(lessonId);
  }

  @Patch(':id')
  updateQuiz(
    @Param('id', ParseIntPipe) lessonId: number,
    @Body() dto: createQuizDto,
  ) {
    return this.quizService.updateQuiz(lessonId, dto);
  }

  @Delete()
  deleteQuiz(@Param('id', ParseIntPipe) quizId: number) {
    return this.quizService.deleteQuiz(quizId);
  }

  @Get(':id/attempts')
  getQuizAttempts(@Req() req, @Param('id', ParseIntPipe) quizId: number) {
    return this.quizService.getQuizAttempts(req.user.id, quizId);
  }

  @Post(':id/submit')
  submitQuizAnswers(
    @GetUser('id') userId: number,
    @Param('id', ParseIntPipe) quizId: number,
    @Body() dto: SubmitQuizAnswersDto,
  )
  {
    return this.quizService.submitQuizAnswers(userId, quizId, dto);
  }

  @Get(':id/new-version')
  getNewQuizVersion(@Param('id', ParseIntPipe) quizId: number) {
    return this.quizService.getNewQuizVersion(quizId);
  }

}
