import {
  Body,
  Controller,
  Delete,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { QuizQuestionService } from './quiz-question.service';
import { CreateQuestionDto } from './dto/create-question-dto';
import { UpdateQuestionDto } from './dto/update-question-dto';
import { JwtGuard } from 'src/auth/guard';
import { RoleGuard } from 'src/auth/guard/role.guard';

@UseGuards(JwtGuard, RoleGuard)
@Controller('api/quizzes/')
export class QuizQuestionController {
  constructor(private quizQuestionService: QuizQuestionService) {}

  //   @UseGuards(RoleGuard)
  @Post(':quizId/questions')
  createQuestion(
    @Param('quizId', ParseIntPipe) quizId: number,
    @Body() dto: CreateQuestionDto,
  ) {
    console.log(dto);
    return this.quizQuestionService.createQuestion(quizId, dto);
  }

  @Patch('questions/:questionId/update')
  updateQuestion(
    @Param('questionId', ParseIntPipe) questionId: number,
    @Body() dto: UpdateQuestionDto,
  ) {
    return this.quizQuestionService.updateQuestion(questionId, dto);
  }

  @Delete('questions/:questionId/delete')
  deleteQuestion(@Param('questionId', ParseIntPipe) questionId: number) {
    return this.quizQuestionService.deleteQuestion(questionId);
  }
}
