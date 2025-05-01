import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { createQuizDto } from './dto/create-quiz-dto';
import { SubmitQuizAnswersDto } from './dto/submit-quiz-answers.dto';

@Injectable()
export class QuizService {
  private readonly logger = new Logger(QuizService.name);
  constructor(private readonly prisma: PrismaService) {}

  async createQuiz(dto: createQuizDto) {
    const lesson = await this.prisma.lesson.findUnique({
      where: {
        id: dto.lessonId,
      },
    });
    if (!lesson) {
      this.logger.error(`Lesson not found with ID: ${dto.lessonId}`);

      throw new NotFoundException(`lesson with ID ${lesson} not found`);
    }
    try {
      const quiz = await this.prisma.quiz.create({
        data: {
          lesson_id: dto.lessonId,
          title: dto.title,
          description: dto.description,
        },
      });
      this.logger.log(`Quiz created successfully with ID: ${quiz.id}`);

      return quiz;
    } catch (error) {
      this.logger.error(`Failed to create quiz: ${error.message}`, error.stack);
      throw error; // Re-throw to let NestJS handle it
    }
  }

  async getQuizById(quizId: number) {
    try {
      const quiz = this.prisma.quiz.findUnique({
        where: {
          id: quizId,
        },
      });
      this.logger.error('Quiz fetched successfully');
      return quiz;
    } catch (error) {
      this.logger.error(`failed to fetch quiz: ${error.message}`, error.stack);
    }
  }

  async getLessonQuizId(lessonId: number) {
    const lesson = await this.prisma.lesson.findUnique({
      where: {
        id: lessonId,
      },
    });
    if (!lesson) {
      this.logger.error(`Lesson not found with ID: ${lessonId}`);
      throw new NotFoundException(`Lesson with ID: ${lessonId} not found`);
    }

    try {
      const quiz = await this.prisma.quiz.findFirst({
        where: {
          lesson_id: lessonId,
        },
        include: {
          questions: {
            include: {
              options: true,
            },
          },
        },
      });
      this.logger.log(`${quiz}`);
      return quiz;
    } catch (error) {
      this.logger.error(`Failed to fetch lesson quiz`);
      throw error;
    }
  }

  async updateQuiz(quizId: number, dto: createQuizDto) {
    const quiz = await this.prisma.quiz.findUnique({
      where: {
        id: quizId,
      },
    });

    if (!quiz) {
      this.logger.error(`Quiz with ID ${quizId} not found`);
    }

    return this.prisma.quiz.update({
      where: {
        id: quizId,
      },
      data: {
        ...dto,
      },
    });
  }

  async deleteQuiz(quizId: number) {
    const quiz = await this.prisma.quiz.findUnique({
      where: {
        id: quizId,
      },
    });

    if (!quiz) {
      this.logger.error(`Quiz with ID ${quizId} not found`);
      throw new NotFoundException('Quiz not found');
    }

    try {
      await this.prisma.$transaction([
        // First delete all options for all questions in this quiz
        this.prisma.quizQuestionOption.deleteMany({
          where: {
            quizQuestion: {
              quiz_id: quizId,
            },
          },
        }),
        // Then delete all questions
        this.prisma.quizQuestion.deleteMany({
          where: {
            quiz_id: quizId,
          },
        }),
        // Finally delete the quiz
        this.prisma.quiz.delete({
          where: { id: quizId },
        }),
      ]);

      return {
        success: true,
        message:
          'Quiz and all associated questions and options deleted successfully',
      };
    } catch (error) {
      // You might want to handle specific error types here
      throw new Error(`Failed to delete quiz: ${error.message}`);
    }
  }

  async getQuizAttempts(userId: number, quizId: number) {
    return this.prisma.quizAttempt.findMany({
      where: {
        user_id: userId,
        quiz_id: quizId,
      },
      include: {
        answers: {
          include: {
            question: true,
            selectedOption: true,
          },
        },
      },
    });
  }

  async submitQuizAnswers(
    userId: number,
    quizId: number,
    dto: SubmitQuizAnswersDto,
  ) {
    console.log('hit');
    // 1. Validate the quiz exists and has questions
    const quiz = await this.prisma.quiz.findUnique({
      where: { id: quizId },
      include: {
        questions: {
          include: {
            options: true,
          },
        },
      },
    });

    if (!quiz) {
      throw new NotFoundException(`Quiz with ID ${quizId} not found`);
    }

    if (!quiz.questions || quiz.questions.length === 0) {
      throw new BadRequestException('This quiz has no questions');
    }

    // 2. Calculate score (with validation for missing answers)
    let correctCount = 0;
    const answerRecords = quiz.questions.map((question) => {
      const selectedOptionId = dto.answers[question.id];

      if (selectedOptionId === undefined) {
        throw new BadRequestException(
          `No answer provided for question ${question.id}`,
        );
      }

      const isCorrect = question.options.some(
        (option) => option.id === selectedOptionId && option.is_correct,
      );

      if (isCorrect) correctCount++;

      return {
        question_id: question.id,
        selected_option_id: selectedOptionId,
        is_correct: isCorrect,
      };
    });

    const score = Math.round((correctCount / quiz.questions.length) * 100);

    // 3. Create attempt first, then answers
    const attempt = await this.prisma.quizAttempt.create({
      data: {
        user_id: userId,
        quiz_id: quizId,
        score,
      },
    });
    

    // 4. Create all answers in a single query
    await this.prisma.quizAnswer.createMany({
      data: answerRecords.map((answer) => ({
        attempt_id: attempt.id,
        question_id: answer.question_id,
        selected_option_id: answer.selected_option_id,
        is_correct: answer.is_correct,
      })),
    });

    return {
      id: attempt.id,
      score: attempt.score,
      correctCount,
      totalQuestions: quiz.questions.length,
    };
  }
  async getNewQuizVersion(quizId: number) {
    const originalQuiz = await this.prisma.quiz.findUnique({
      where: { id: quizId },
      include: {
        questions: {
          include: { options: true },
          orderBy: { id: 'asc' }, // Original order from DB
        },
      },
    });

    if (!originalQuiz) {
      throw new NotFoundException(`Quiz with ID ${quizId} not found`);
    }

    // Improved Fisher-Yates shuffle with cryptographic randomness
    const shuffle = <T>(array: T[]): T[] => {
      const shuffled = [...array];
      for (let i = shuffled.length - 1; i > 0; i--) {
        // Cryptographically secure random index
        const j = Math.floor(
          (crypto.getRandomValues(new Uint32Array(1))[0] / (0xffffffff + 1)) *
            (i + 1),
        );
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      return shuffled;
    };

    // Create new shuffled instance
    return {
      ...originalQuiz,
      questions: shuffle([...originalQuiz.questions]).map((question) => ({
        ...question,
        options: shuffle([...question.options]), // Shuffle options separately
      })),
    };
  }

 
}
