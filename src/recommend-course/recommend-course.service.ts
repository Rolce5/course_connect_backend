import { Injectable } from '@nestjs/common';
import { Course, CourseCategory, DifficultyLevel, Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';

type CourseWithEnrollments = Prisma.CourseGetPayload<{
  include: { enrollments: true };
}>;


@Injectable()
export class RecommendCourseService {
  constructor(private prisma: PrismaService) {}

  async getRecommendations(userId?: number): Promise<Course[]> {
    // 1. Get base strategies (parallelized)
    const [
      popularCourses,
      highRatedCourses,
      trendingCourses,
      topInstructorCourses,
    ] = await Promise.all([
      this.getPopularCourses(),
      this.getHighRatedCourses(),
      this.getTrendingCourses(),
      this.getTopInstructorCourses(),
    ]);

    // 2. For logged-in users
    if (userId) {
      const userData = await this.getUserLearningData(userId);

      // Personalized strategies
      const [
        sameCategoryCourses,
        difficultyMatchedCourses,
        // completionBasedCourses,
      ] = await Promise.all([
        // this.getSameCategoryCourses(userData),
        this.getDifficultyMatchedCourses(userData),
        this.getCompletionBasedCourses(userData),
      ]);

      return this.mergeAndPrioritize(
        [
        //   ...completionBasedCourses, // Highest priority (user progress)
          ...sameCategoryCourses, // Second priority (category match)
          ...difficultyMatchedCourses, // Third priority (difficulty match)
          ...popularCourses,
          ...highRatedCourses,
          ...trendingCourses,
          ...topInstructorCourses,
        ],
        8,
      ); // Return top 8 recommendations
    }

    // 3. For non-logged-in users
    return this.mergeAndPrioritize(
      [
        ...popularCourses,
        ...highRatedCourses,
        ...trendingCourses,
        ...topInstructorCourses,
      ],
      6,
    );
  }

  // ========================
  // STRATEGY IMPLEMENTATIONS
  // ========================

  private async getTrendingCourses(): Promise<Course[]> {
    return this.prisma.course.findMany({
      orderBy: { created_at: 'desc' },
      where: {
        created_at: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
        },
      },
      take: 2,
    });
  }

  private async getTopInstructorCourses(): Promise<Course[]> {
    return this.prisma.course.findMany({
      where: { instructor: { rating: { gte: 4.8 } } },
      take: 2,
    });
  }

  private async getUserLearningData(userId: number) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        enrollments: {
          include: {
            course: {
              select: { category: true, difficulty: true, id: true },
            },
            lastLesson: true,
          },
        },
        lessonProgresses: {
          orderBy: { last_accessed_at: 'desc' },
          take: 5,
          include: { lesson: true },
        },
        certificates: {
          select: { course_id: true },
        },
      },
    });
  }

//   private async getSameCategoryCourses(userData: any): Promise<Course[]> {
//         const enrolledCategories = [
//           ...new Set(
//             userData.enrollments.map(
//               (e) => e.course.category as CourseCategory,
//             ),
//           ),
//         ];


//     if (enrolledCategories.length === 0) return [];

//     return this.prisma.course.findMany({
//       where: {
//         category: { in: enrolledCategories },
//         id: { notIn: userData.enrollments.map((e) => e.course.id) },
//       },
//       orderBy: { rating: 'desc' },
//       take: 4,
//     });
//   }

  private async getDifficultyMatchedCourses(userData: any): Promise<Course[]> {
    const preferredDifficulty = this.calculatePreferredDifficulty(userData);

    return this.prisma.course.findMany({
      where: {
        difficulty: preferredDifficulty,
        id: { notIn: userData.enrollments.map((e) => e.course.id) },
      },
      take: 2,
    });
  }

  private calculatePreferredDifficulty(userData: any): DifficultyLevel {
    // Logic to determine user's preferred difficulty level
    const completedCourses = userData.enrollments.filter(
      (e) => e.status === 'COMPLETED',
    ).length;

    if (completedCourses >= 5) return DifficultyLevel.ADVANCED;
    if (completedCourses >= 2) return DifficultyLevel.INTERMEDIATE;
    return DifficultyLevel.BEGINNER;
  }

  private async getCompletionBasedCourses(userData: any): Promise<Course[]> {
    // Get courses similar to ones user is actively progressing in
    const activeCourseIds = userData.lessonProgresses
      .filter((lp) => !lp.completed)
      .map((lp) => lp.course_id);

    if (activeCourseIds.length === 0) return [];

    const activeCourses = await this.prisma.course.findMany({
      where: { id: { in: activeCourseIds } },
      select: { category: true, difficulty: true },
    });

    return this.prisma.course.findMany({
      where: {
        OR: activeCourses.map((course) => ({
          category: course.category,
          difficulty: course.difficulty,
        })),
        id: { notIn: userData.enrollments.map((e) => e.course.id) },
      },
      take: 3,
    });
  }

  // ========================
  // HELPER METHODS
  // ========================

  private mergeAndPrioritize(courses: Course[], limit: number): Course[] {
    const uniqueCourses = this.deduplicateCourses(courses);

    // Simple scoring algorithm
    const scored = uniqueCourses.map((course) => ({
      ...course,
      score: this.calculateCourseScore(course),
    }));

    return scored.sort((a, b) => b.score - a.score).slice(0, limit);
  }

  private calculateCourseScore(course: CourseWithEnrollments | Course): number {
    let score = 0;
    if (course.rating) score += course.rating * 10;
    score += 'enrollments' in course ? course.enrollments.length : 0;
    return score;
  }

  // Update getPopularCourses to include enrollments
  private async getPopularCourses(): Promise<CourseWithEnrollments[]> {
    return this.prisma.course.findMany({
      orderBy: { enrollments: { _count: 'desc' } },
      take: 3,
      include: { enrollments: true }, // Include enrollments for scoring
    });
  }

  // Similarly update other base strategy methods that need scoring
  private async getHighRatedCourses(): Promise<CourseWithEnrollments[]> {
    return this.prisma.course.findMany({
      where: { rating: { gte: 4.5 } },
      take: 3,
      include: { enrollments: true },
    });
  }

  private deduplicateCourses(courses: Course[]): Course[] {
    return courses.filter(
      (course, index, self) =>
        index === self.findIndex((c) => c.id === course.id),
    );
  }
}
