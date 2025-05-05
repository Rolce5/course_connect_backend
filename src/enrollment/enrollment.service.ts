import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { EnrollmentStatus } from '@prisma/client';
import { PaymentRequiredException } from 'src/exceptions/payment-required.exception';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class EnrollmentService {
  constructor(private prisma: PrismaService) {}

  async enroll(userId: number, courseId: number) {
    // Check if the user is already enrolled in the course
    const existingEnrollment = await this.prisma.enrollment.findUnique({
      where: { user_id_course_id: { user_id: userId, course_id: courseId } },
    });

    if (existingEnrollment) {
      throw new ConflictException('You are already enrolled in this course');
    }

    // Get course details including pricing
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      select: {
        id: true,
        pricing: true,
        original_price: true,
        is_active: true,
      },
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    if (!course.is_active) {
      throw new BadRequestException('This course is not currently available');
    }

    // Check payment requirement for paid courses
    // if (course.pricing && course.pricing > 0) {
    //   const payment = await this.prisma.payment.findFirst({
    //     where: {
    //       userId,
    //       courseId,
    //       status: 'COMPLETED'
    //     }
    //   });

    //   if (!payment) {
    //     throw new PaymentRequiredException(
    //       'Payment required for this course',
    //       {
    //         courseId,
    //         amount: course.pricing,
    //         originalPrice: course.originalPrice,
    //         paymentRequired: true
    //       }
    //     );
    //   }
    // }

    // Create enrollment
    const enrollment = await this.prisma.enrollment.create({
      data: {
        course_id: courseId,
        user_id: userId,
        progress: 0,
        last_lesson_id: null,
      },
      include: {
        course: {
          select: {
            title: true,
            imageUrl: true,
          },
        },
      },
    });

    return {
      success: true,
      message: 'Enrollment successful',
      data: enrollment,
    };
  }

  async getUserEnrollments(userId: number) {
    try {
      const enrollments = await this.prisma.enrollment
        .findMany({
          where: { user_id: userId },
          select: {
            progress: true,
            status: true,
            last_lesson_id: true,
            course: {
              select: {
                id: true,
                title: true,
                short_description: true,
                imageUrl: true,
                category: true,
                instructor: {
                  select: {
                    first_name: true,
                    last_name: true,
                  },
                },
              },
            },
          },
        })
        .then((enrollments) =>
          enrollments.map((e) => ({
            ...e.course,
            courseId: e.course.id,
            progress: e.progress,
            status: e.status,
            lastLessonId: e.last_lesson_id,
            instructor: e.course.instructor,
          })),
        );

      return enrollments;
    } catch (error) {
      throw new Error(`Failed to fetch enrollments: ${error.message}`);
    }
  }

  async getRecentEnrollments() {
    try {
      const recentEnrollments = await this.prisma.enrollment.findMany({
        orderBy: {
          created_at: 'desc',
        },
        include: { user: true, course: true }, // Include course details
        take: 4,
      });
      return recentEnrollments;
    } catch (error) {
      console.error('Error in fetch recent enrollments:', error);
      throw new InternalServerErrorException(
        'Failed to fetch recent enrollments',
      );
    }
  }

  async getUserEnrollment(userId: number, courseId: number) {
    return this.prisma.enrollment.findUnique({
      where: {
        user_id_course_id: {
          user_id: userId,
          course_id: courseId,
        },
      },
    });
  }

  // async updateEnrollmentProgress(
  //   userId: number,
  //   courseId: number,
  //   lastLessonId: number,
  //   markComplete: boolean = false,
  // ) {
  //   // Get course to calculate progress
  //   const course = await this.prisma.course.findUnique({
  //     where: { id: courseId },
  //     include: {
  //       modules: {
  //         include: {
  //           lessons: true,
  //         },
  //       },
  //     },
  //   });

  //   if (!course) {
  //     throw new NotFoundException(`Course with ID ${courseId} not found`);
  //   }

  //   // Calculate total lessons
  //   const totalLessons = course.modules.reduce(
  //     (sum, module) => sum + module.lessons.length,
  //     0,
  //   );

  //   // Find current lesson index
  //   let currentIndex = 0;
  //   for (const module of course.modules) {
  //     const lessonIndex = module.lessons.findIndex(
  //       (l) => l.id === lastLessonId,
  //     );
  //     if (lessonIndex !== -1) {
  //       currentIndex += lessonIndex + 1;
  //       break;
  //     }
  //     currentIndex += module.lessons.length;
  //   }

  //   const progress = markComplete
  //     ? 100
  //     : Math.round((currentIndex / totalLessons) * 100);

  //   return this.prisma.enrollment.update({
  //     where: {
  //       user_id_course_id: {
  //         user_id: userId,
  //         course_id: courseId,
  //       },
  //     },
  //     data: {
  //       last_lesson_id: lastLessonId,
  //       progress,
  //       status: markComplete ? 'COMPLETED' : 'IN_PROGRESS',
  //     },
  //   });
  // }
  // enrollment.service.ts
  async updateEnrollmentProgress(
    userId: number,
    courseId: number,
    lastLessonId: number,
  ) {
    // 1. Fetch course with ordered lessons
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      include: {
        modules: {
          include: { lessons: { orderBy: { order: 'asc' } } },
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!course) throw new NotFoundException('Course not found');

    // 2. Get all lessons in order
    const allLessons = course.modules.flatMap((m) => m.lessons);
    const totalLessons = allLessons.length;

    // 3. Validate lesson exists in course
    const currentLesson = allLessons.find((l) => l.id === lastLessonId);
    if (!currentLesson) throw new NotFoundException('Invalid lesson');

    // 4. Calculate progress and status
    const currentIndex = allLessons.indexOf(currentLesson);
    const isLastLesson = currentIndex === totalLessons - 1;
    const progress = Math.round(((currentIndex + 1) / totalLessons) * 100);

    // 5. Determine status
    let status: EnrollmentStatus;
    if (progress === 0) {
      status = EnrollmentStatus.NOT_STARTED;
    } else if (isLastLesson) {
      status = EnrollmentStatus.COMPLETED;
    } else {
      status = EnrollmentStatus.IN_PROGRESS;
    }

    // 6. Update enrollment
    return this.prisma.enrollment.update({
      where: { user_id_course_id: { user_id: userId, course_id: courseId } },
      data: { last_lesson_id: lastLessonId, progress, status },
    });
  }

  async completeLesson(userId: number, lessonId: number) {
    return this.prisma.$transaction(async (tx) => {
      // 1. Get lesson with course info
      const lesson = await tx.lesson.findUnique({
        where: { id: lessonId },
        include: { module: { select: { course_id: true } } },
      });
      if (!lesson) throw new NotFoundException('Lesson not found');

      // 2. Verify enrollment
      const enrollment = await tx.enrollment.findUnique({
        where: {
          user_id_course_id: {
            user_id: userId,
            course_id: lesson.module.course_id,
          },
        },
      });
      if (!enrollment) throw new BadRequestException('Not enrolled');

      // 3. Update lesson progress
      const now = new Date();
      const progress = await tx.lessonProgress.upsert({
        where: { user_id_lesson_id: { user_id: userId, lesson_id: lessonId } },
        create: {
          user_id: userId,
          lesson_id: lessonId,
          module_id: lesson.module_id,
          course_id: lesson.module.course_id,
          completed: true,
          completed_at: now,
          first_completed_at: now,
        },
        update: {
          completed: true,
          completed_at: now,
          first_completed_at: { set: now }, // Only set if null
        },
      });

      // 4. Update enrollment
      await tx.enrollment.update({
        where: { id: enrollment.id },
        data: { last_lesson_id: lessonId },
      });

      // 5. Update course progress (simplified)
      const [completed, total] = await Promise.all([
        tx.lessonProgress.count({
          where: {
            user_id: userId,
            course_id: lesson.module.course_id,
            completed: true,
          },
        }),
        tx.lesson.count({
          where: { module: { course_id: lesson.module.course_id } },
        }),
      ]);

      const newProgress = Math.round((completed / total) * 100);
      await tx.enrollment.update({
        where: { id: enrollment.id },
        data: {
          progress: newProgress,
          status: newProgress === 100 ? 'COMPLETED' : 'IN_PROGRESS',
        },
      });

      return progress;
    });
  }

  private async validateLessonAccess(userId: number, lessonId: number) {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
      include: {
        module: {
          select: {
            course_id: true,
            lessons: { orderBy: { order: 'asc' }, select: { id: true } },
          },
        },
      },
    });

    if (!lesson) throw new NotFoundException('Lesson not found');

    // Check if previous lesson is completed (if not first lesson)
    const lessonIndex = lesson.module.lessons.findIndex(
      (l) => l.id === lessonId,
    );
    if (lessonIndex > 0) {
      const prevLessonId = lesson.module.lessons[lessonIndex - 1].id;
      const prevCompleted = await this.prisma.lessonProgress.findUnique({
        where: {
          user_id_lesson_id: { user_id: userId, lesson_id: prevLessonId },
        },
        select: { completed: true },
      });

      if (!prevCompleted?.completed) {
        throw new BadRequestException('Complete previous lesson first');
      }
    }

    return true;
  }

  // async getLessonProgress(userId: number, lessonId: number) {
  //   const progress = await this.prisma.lessonProgress.findUnique({
  //     where: {
  //       user_id_lesson_id: {
  //         user_id: userId,
  //         lesson_id: lessonId,
  //       },
  //     },
  //     select: {
  //       completed: true,
  //       video_progress: true,
  //       last_accessed_at: true,
  //       first_completed_at: true,
  //     },
  //   });

  //   return {
  //     completed: progress?.completed || false,
  //     videoProgress: progress?.video_progress || 0,
  //     lastAccessed: progress?.last_accessed_at,
  //     firstCompleted: progress?.first_completed_at,
  //   };
  // }
  async getLessonProgress(userId: number, lessonId: number) {
    const progress = await this.prisma.lessonProgress.findUnique({
      where: {
        user_id_lesson_id: {
          user_id: userId,
          lesson_id: lessonId,
        },
      },
      select: {
        completed: true,
        video_progress: true,
        last_accessed_at: true,
        first_completed_at: true,
      },
    });

    // Get all quizzes associated with this lesson
    const quizzes = await this.prisma.quiz.findMany({
      where: { lesson_id: lessonId },
      select: { id: true },
    });

    // Check for passing attempts in any of the lesson's quizzes
    const hasPassingQuiz =
      quizzes.length > 0
        ? await this.prisma.quizAttempt.findFirst({
            where: {
              user_id: userId,
              quiz_id: { in: quizzes.map((q) => q.id) },
              score: { gte: 70 },
            },
          })
        : null;

    return {
      completed: progress?.completed || hasPassingQuiz !== null,
      videoProgress: progress?.video_progress || 0,
      lastAccessed: progress?.last_accessed_at,
      firstCompleted: progress?.first_completed_at,
    };
  }

  async updateVideoProgress(
    userId: number,
    lessonId: number,
    progress: number,
  ) {
    // First get the lesson to obtain module_id and course_id
    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
      select: {
        module_id: true,
        module: {
          select: {
            course_id: true,
          },
        },
      },
    });

    if (!lesson) {
      throw new NotFoundException('Lesson not found');
    }

    return this.prisma.lessonProgress.upsert({
      where: { user_id_lesson_id: { user_id: userId, lesson_id: lessonId } },
      create: {
        user_id: userId,
        lesson_id: lessonId,
        module_id: lesson.module_id,
        course_id: lesson.module.course_id,
        video_progress: Math.min(100, Math.max(0, progress)),
        last_accessed_at: new Date(),
      },
      update: {
        video_progress: Math.min(100, Math.max(0, progress)),
        last_accessed_at: new Date(),
      },
    });
  }

  async getCourseLessonProgress(userId: number, courseId: number) {
    return this.prisma.lessonProgress.findMany({
      where: {
        user_id: userId,
        course_id: courseId,
      },
      select: {
        lesson_id: true,
        completed: true,
        first_completed_at: true,
      },
    });
  }
}
