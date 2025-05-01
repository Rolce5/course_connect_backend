import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateQuestionDto } from './dto/create-question-dto';
import { UpdateQuestionDto } from './dto/update-question-dto';

@Injectable()
export class QuizQuestionService {
  constructor(private readonly prisma: PrismaService) {}

  async createQuestion(quizId: number, dto: CreateQuestionDto) {
    console.log('Incoming DTO:', JSON.stringify(dto, null, 2));

    const quiz = await this.prisma.quiz.findUnique({
      where: {
        id: quizId,
      },
    });

    if (!quiz) {
      throw new NotFoundException(`Quiz with id ${quizId} not found`);
    }

    return this.prisma.quizQuestion.create({
      data: {
        question_text: dto.question,
        quiz_id: quizId,
        options: {
          create: dto.options.map((option) => ({
            option_text: option.optionText,
            is_correct: option.isCorrect,
          })),
        },
      },
      include: {
        options: true,
      },
    });
  }

  // async updateQuestion(questionId: number, dto: UpdateQuestionDto) {
  //   const question = await this.prisma.quizQuestion.findUnique({
  //     where: {
  //       id: questionId,
  //     },
  //     include: { options: true },
  //   });

  //   if (!question) {
  //     throw new NotFoundException(`Question with ID ${questionId} not found`);
  //   }

  //   return this.prisma.quizQuestion.update({
  //     where: {
  //       id: questionId,
  //     },
  //     data: {
  //       question_text: dto.question,
  //       options: {
  //         // Delete options that aren't in the new list
  //         deleteMany: {
  //           id: {
  //             notIn: dto.options
  //               .filter((opt) => opt.id !== undefined)
  //               .map((opt) => opt.id as number),
  //           },
  //         },

  //         // Update existing options
  //         updateMany: dto.options
  //           .filter((opt) => opt.id !== undefined)
  //           .map((option) => ({
  //             where: { id: option.id },
  //             data: {
  //               option_text: option.optionText,
  //               is_correct: option.isCorrect,
  //             },
  //           })),
  //         // Create new options
  //         create: dto.options
  //           .filter((opt) => opt.id === undefined)
  //           .map((option) => ({
  //             option_text: option.optionText,
  //             is_correct: option.isCorrect,
  //           })),
  //       },
  //     },

  //     include: {
  //       options: true,
  //     },
  //   });
  // }
  async updateQuestion(questionId: number, dto: UpdateQuestionDto) {
    const question = await this.prisma.quizQuestion.findUnique({
      where: { id: questionId },
      include: { options: true },
    });

    if (!question) {
      throw new NotFoundException(`Question with ID ${questionId} not found`);
    }

    // First, delete all answers associated with this question
    await this.prisma.quizAnswer.deleteMany({
      where: { question_id: questionId },
    });

    // Then perform the question update
    return this.prisma.quizQuestion.update({
      where: { id: questionId },
      data: {
        question_text: dto.question,
        options: {
          deleteMany: {
            id: {
              notIn: dto.options
                .filter((opt) => opt.id !== undefined)
                .map((opt) => opt.id as number),
            },
          },
          updateMany: dto.options
            .filter((opt) => opt.id !== undefined)
            .map((option) => ({
              where: { id: option.id },
              data: {
                option_text: option.optionText,
                is_correct: option.isCorrect,
              },
            })),
          create: dto.options
            .filter((opt) => opt.id === undefined)
            .map((option) => ({
              option_text: option.optionText,
              is_correct: option.isCorrect,
            })),
        },
      },
      include: { options: true },
    });
  }

  async deleteQuestion(questionId: number) {
    return this.prisma.$transaction(async (tx) => {
      // 1. First check if question exists
      const question = await tx.quizQuestion.findUnique({
        where: { id: questionId },
      });

      if (!question) {
        throw new NotFoundException(`Question with ID ${questionId} not found`);
      }

      // 2. Delete all answers referencing this question
      await tx.quizAnswer.deleteMany({
        where: { question_id: questionId },
      });

      // 3. Delete all options for this question
      await tx.quizQuestionOption.deleteMany({
        where: { quiz_question_id: questionId },
      });

      // 4. Finally delete the question
      await tx.quizQuestion.delete({
        where: { id: questionId },
      });

      return { message: 'Question deleted successfully' };
    });
  }
}
