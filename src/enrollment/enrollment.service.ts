import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { PaymentRequiredException } from 'src/exceptions/payment-required.exception';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class EnrollmentService {
  constructor(private prisma: PrismaService) {}

  async enroll(userId: number, courseId: number) {
    // Check if the user is already enrolled in the course
    const existingEnrollment = await this.prisma.enrollment.findUnique({
      where: {
        userId_courseId: {
          userId,
          courseId,
        },
      },
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
        originalPrice: true,
        isActive: true
      }
    });
  
    if (!course) {
      throw new NotFoundException('Course not found');
    }
  
    if (!course.isActive) {
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
        courseId,
        userId,
        progress: 0,
        lastLessonId: null
      },
      include: {
        course: {
          select: {
            title: true,
            imageUrl: true
          }
        }
      }
    });
  
    return {
      success: true,
      message: 'Enrollment successful',
      data: enrollment
    };
  }

  async getUserEnrollments(userId: number) {
    const enrollments = await this.prisma.enrollment.findMany({
      where: {
        userId,
      },
      include: { course: true }, // Include course details
    });

    return enrollments
  }

  async getRecentEnrollments() {
    try {
      const recentEnrollments = await this.prisma.enrollment.findMany({
        orderBy: {
          createdAt: 'desc',
        },
        include: { users: true, course: true}, // Include course details
      });
      return recentEnrollments;
    } catch (error) {
      console.error('Error in fetch recent enrollments:', error);
      throw new InternalServerErrorException(
        'Failed to fetch recent enrollments',
      );
    }
  }
}
