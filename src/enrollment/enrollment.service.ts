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
}
