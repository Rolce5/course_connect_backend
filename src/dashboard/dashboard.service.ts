import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getDashboardData(role: string, instructorId: number) {
    // Parallelize queries for performance
    const [totalStudents, totalCourses, recentCourses, recentEnrollments] =
      await Promise.all([
        // 1. Count students (role-aware)
        role === 'ADMIN'
          ? this.prisma.user.count({ where: { role: 'STUDENT' } }) // All students for admin
          : this.getInstructorStudentCount(instructorId), // Only students enrolled in instructor's courses

        // 2. Count courses (role-aware)
        role === 'INSTRUCTOR'
          ? this.prisma.course.count({ where: { instructor_id: instructorId } })
          : this.prisma.course.count(),

        // 3. Fetch 4 recent courses (role-aware)
        this.prisma.course.findMany({
          take: 4,
          orderBy: { created_at: 'desc' },
          where: role === 'INSTRUCTOR' ? { instructor_id: instructorId } : {},
          include: { instructor: true, enrollments: true },
        }),

        // 4. Fetch 5 recent enrollments (role-aware)
        this.prisma.enrollment.findMany({
          take: 5,
          orderBy: { created_at: 'desc' },
          where:
            role === 'INSTRUCTOR'
              ? { course: { instructor_id: instructorId } }
              : {},
          include: {
            user: { select: { id: true, first_name: true, last_name: true } },
            course: { select: { title: true } },
          },
        }),
      ]);

    return {
      stats: {
        totalStudents,
        totalCourses,
      },
      recentCourses,
      recentEnrollments,
    };
  }

  private async getInstructorStudentCount(instructorId: number): Promise<number> {
    const uniqueStudents = await this.prisma.enrollment.findMany({
      where: {
        course: { instructor_id: instructorId },
        user: { role: 'STUDENT' }
      },
      select: {
        user_id: true
      },
      distinct: ['user_id']
    });

    return uniqueStudents.length;
  }
}