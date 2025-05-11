import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EditUserDto } from './dto';
import { Role } from '@prisma/client';
import { first } from 'rxjs';

@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) {}

  async getAllUsers() {
    return this.prisma.user.findMany();
  }

  async getStudents(page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;
    const [students, totalCount] = await Promise.all([
      this.prisma.user.findMany({
        where: {
          role: Role.STUDENT,
        },
        skip,
        take: limit,
        select: {
          first_name: true,
          last_name: true,
          email: true,
          enrollments: { select: { status: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count({
        where: {
          role: Role.STUDENT,
        },
      }),
    ]);
    return {
      data: students,
      pagination: {
        total: totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit),
        hasNextPage: page * limit < totalCount,
        hasPreviousPage: page > 1,
      },
    };
  }

  async getInstructors(page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;

    const [instructors, totalCount] = await Promise.all([
      this.prisma.user.findMany({
        where: {
          role: Role.INSTRUCTOR,
        },
        skip,
        take: limit,
        select: {
          id: true,
          first_name: true,
          last_name: true,
          email: true,
          profilePic: true,
          rating: true,
          // Count of courses they teach
          _count: {
            select: {
              courses: true,
            },
          },
          // Count of students enrolled in their courses
          courses: {
            select: {
              enrollments: {
                select: {
                  user_id: true,
                },
              },
            },
          },
          // Get reviews for rating calculation
          reviews: {
            select: {
              rating: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count({
        where: {
          role: Role.INSTRUCTOR,
        },
      }),
    ]);

    // Transform the data to include calculated fields
    const formattedInstructors = instructors.map((instructor) => {
      // Calculate unique students across all courses
      const allStudentIds = instructor.courses.flatMap((course) =>
        course.enrollments.map((e) => e.user_id),
      );
      const uniqueStudentCount = new Set(allStudentIds).size;

      // Calculate average rating from reviews
      const avgRating =
        instructor.reviews.length > 0
          ? instructor.reviews.reduce((sum, review) => sum + review.rating, 0) /
            instructor.reviews.length
          : instructor.rating || 0; // Fallback to stored rating if no reviews

      return {
        ...instructor,
        course_count: instructor._count.courses,
        student_count: uniqueStudentCount,
        rating: parseFloat(avgRating.toFixed(1)), // Round to 1 decimal place
        // Remove the temporary fields we don't need in response
        courses: undefined,
        reviews: undefined,
        _count: undefined,
      };
    });

    return {
      instructors: formattedInstructors,
      pagination: {
        total: totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit),
        hasNextPage: page * limit < totalCount,
        hasPreviousPage: page > 1,
      },
    };
  }

  async editUser(userId: number, dto: EditUserDto) {
    const user = await this.prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        ...dto,
      },
    });

    // delete user.password;

    return user;
  }
}
