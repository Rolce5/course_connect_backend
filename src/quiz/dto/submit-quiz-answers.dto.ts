import { IsNotEmpty, IsObject } from 'class-validator';

export class SubmitQuizAnswersDto {
  @IsNotEmpty()
  @IsObject()
  answers: Record<number, number>; // { [questionId]: selectedOptionId }
}