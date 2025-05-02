import {
  Injectable,
  ConflictException,
  NotFoundException,
  InternalServerErrorException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';  // Add this import
import { PrismaService } from '../prisma/prisma.service';
import { createCourseDto } from 'src/course/dto';
import { createLessonDto } from './dto/create-lesson.dto';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';
import { editLessonDto } from './dto/edit-lesson.dto';

@Injectable()
export class LessonsService {
  constructor(
    private prisma: PrismaService,
    private readonly cloudinary: CloudinaryService,
  ) {}
  // async create(
  //   dto: createLessonDto,
  //   videoFile?: Express.Multer.File,
  // ) {
  //   try {
  //     let videoUrl: string | undefined;

  //     if (videoFile) {
  //       console.log("Uploading video:", videoFile); // Log video file details
  //       const videoUploadResponse = await this.cloudinary.uploadVideo(videoFile);
  //       videoUrl = videoUploadResponse?.secure_url;
  //       console.log("Video uploaded, URL:", videoUrl); // Log the uploaded video URL
  //     }

  //     const course = await this.prisma.lesson.create({
  //       data: {
  //         videoUrl,
  //         ...dto,
  //       },
  //     });

  //     return course;
  //   } catch (error) {
  //     console.error('Error in adding lesson to this course:', error);
  //     throw new InternalServerErrorException('Failed to create course');
  //   }
  // }
  async create(dto: createLessonDto, videoFile?: Express.Multer.File) {
    try {
      // Check for existing lesson with same order
      const existingLesson = await this.prisma.lesson.findFirst({
        where: {
          module_id: dto.moduleId,
          order: dto.order,
        },
      });

      if (existingLesson) {
        // Increment orders of subsequent lessons
        await this.prisma.lesson.updateMany({
          where: {
            module_id: dto.moduleId,
            order: { gte: dto.order },
          },
          data: {
            order: { increment: 1 },
          },
        });
      }

      let videoUrl: string | undefined;
      if (videoFile) {
        const videoUploadResponse =
          await this.cloudinary.uploadVideo(videoFile);
        videoUrl = videoUploadResponse?.secure_url;
      }

      return await this.prisma.lesson.create({
        data: {
          videoUrl,
          module_id: dto.moduleId,
          title: dto.title,
          content: dto.content,
          description: dto.description,
          duration: dto.duration,
          order: dto.order,
        },
      });
    } catch (error) {
      console.error('Error creating lesson:', error);
      if (error.code === 'P2002') {
        throw new ConflictException(
          'A lesson with this order already exists in this module',
        );
      }
      throw new InternalServerErrorException('Failed to create lesson');
    }
  }

  async getLessonsByModuleeId(moduleId: number) {
    return this.prisma.lesson.findMany({
      where: { module_id: moduleId },
      orderBy: { order: 'asc' }, // Ensure lessons are returned in order
    });
  }

  async update(lessonId: number, updateLessonDto: editLessonDto) {
    // Find the existing lesson
    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
    });

    if (!lesson) {
      throw new BadRequestException('Lesson not found');
    }

    // Update the fields in the lesson
    const updatedLessonData: any = {};
    if (updateLessonDto.title) updatedLessonData.title = updateLessonDto.title;
    if (updateLessonDto.content)
      updatedLessonData.content = updateLessonDto.content;
    if (updateLessonDto.description)
      updatedLessonData.description = updateLessonDto.description;
    if (updateLessonDto.duration)
      updatedLessonData.duration = updateLessonDto.duration;

    // If the order is provided, we need to handle ordering logic
    if (updateLessonDto.order) {
      const newOrder = updateLessonDto.order;

      // Fetch all lessons in the same module
      const lessons = await this.prisma.lesson.findMany({
        where: { module_id: lesson.module_id },
        orderBy: { order: 'asc' },
      });

      // Validate newOrder
      if (newOrder < 1 || newOrder > lessons.length) {
        throw new BadRequestException('Invalid lesson order');
      }

      const oldOrder = lesson.order;

      const updates: Prisma.PrismaPromise<any>[] = []; // Explicitly type the updates array

      if (newOrder < oldOrder) {
        // Moving up: Shift lessons down
        updates.push(
          ...lessons
            .filter((l) => l.order >= newOrder && l.order < oldOrder)
            .map((l) =>
              this.prisma.lesson.update({
                where: { id: l.id },
                data: { order: l.order + 1 },
              }),
            ),
        );
      } else if (newOrder > oldOrder) {
        // Moving down: Shift lessons up
        updates.push(
          ...lessons
            .filter((l) => l.order > oldOrder && l.order <= newOrder)
            .map((l) =>
              this.prisma.lesson.update({
                where: { id: l.id },
                data: { order: l.order - 1 },
              }),
            ),
        );
      }

      // Update the target lesson to the new order
      updates.push(
        this.prisma.lesson.update({
          where: { id: lessonId },
          data: { ...updatedLessonData, order: newOrder },
        }),
      );

      // Perform the transaction
      await this.prisma.$transaction(updates);
    } else {
      // If no order change, just update the lesson
      await this.prisma.lesson.update({
        where: { id: lessonId },
        data: updatedLessonData,
      });
    }

    return { message: 'Lesson updated successfully' };
  }

  async remove(id: number) {
    const lesson = await this.prisma.lesson.findUnique({ where: { id } });

    if (!lesson) {
      throw new NotFoundException('Lesson not found');
    }

    // Delete the course video from Cloudinary if it exists
    if (lesson.videoUrl) {
      const publicId = lesson.videoUrl.split('/').pop()?.split('.')[0]; // Extract publicId from the URL
      if (publicId) {
        await this.cloudinary.deleteFile(publicId, 'video'); // Delete the image from Cloudinary
      }
    }

    // Delete the lesson
    await this.prisma.lesson.delete({ where: { id } });

    // Decrement the order of all lessons with an order greater than the deleted lesson's order
    await this.prisma.lesson.updateMany({
      where: {
        module_id: lesson.module_id,
        order: { gt: lesson.order },
      },
      data: { order: { decrement: 1 } },
    });

    return { message: 'Lesson deleted successfully' };
  }

  async fetchHighestOrder(moduleId: number) {
    try {
      // Get only the highest order lesson (most efficient approach)
      const highestOrderLesson = await this.prisma.lesson.findFirst({
        where: { module_id: moduleId },
        select: { order: true }, // Only fetch the order field
        orderBy: { order: 'desc' },
      });

      console.log(highestOrderLesson);

      // Return 0 if no lesson exist (frontend will increment to 1)
      return highestOrderLesson?.order || 0;
    } catch (error) {
      console.error('Error fetching highest order:', error);
      throw new InternalServerErrorException('Failed to fetch module order');
    }
  }

  async completeLesson(userId: number, lessonId: number) {
    try {
      await this.validateLessonAccess(userId, lessonId);

      const lesson = await this.prisma.lesson.findUnique({
        where: { id: lessonId },
        include: {
          module: {
            select: {
              id: true,
              course_id: true,
              lessons: {
                orderBy: { order: 'asc' },
                select: { id: true },
              },
            },
          },
        },
      });

      if (!lesson) {
        throw new NotFoundException('Lesson not found');
      }

      return await this.prisma.$transaction(async (tx) => {
        // 1. Verify enrollment exists
        const enrollment = await tx.enrollment.findFirst({
          where: {
            user_id: userId,
            course_id: lesson.module.course_id,
          },
        });

        if (!enrollment) {
          throw new BadRequestException('User is not enrolled in this course');
        }

        // 2. Update lesson progress
        const progress = await tx.lessonProgress.upsert({
          where: {
            user_id_lesson_id: {
              user_id: userId,
              lesson_id: lessonId,
            },
          },
          create: {
            user_id: userId,
            lesson_id: lessonId,
            module_id: lesson.module_id, // Add this
            course_id: lesson.module.course_id, // Add this

            completed: true,
            completed_at: new Date(),
          },
          update: {
            completed: true,
            completed_at: new Date(),
          },
        });

        // 3. Update enrollment last lesson
        await tx.enrollment.updateMany({
          where: {
            user_id: userId,
            course_id: lesson.module.course_id,
          },
          data: {
            last_lesson_id: lessonId,
          },
        });

        // 4. Calculate and update course progress (optimized parallel queries)
        const [totalLessons, completedLessons] = await Promise.all([
          tx.lesson.count({
            where: {
              module: {
                course_id: lesson.module.course_id,
              },
            },
          }),
          tx.lessonProgress.count({
            where: {
              user_id: userId,
              course_id: lesson.module.course_id,
              completed: true,
            },
          }),
        ]);

        const newProgress = Math.round((completedLessons / totalLessons) * 100);

        await tx.enrollment.updateMany({
          where: {
            user_id: userId,
            course_id: lesson.module.course_id,
          },
          data: {
            progress: newProgress,
            status: newProgress === 100 ? 'COMPLETED' : 'IN_PROGRESS',
          },
        });

        return progress;
      });
    } catch (error) {
      // this.logger.error(`Error completing lesson ${lessonId}`, error.stack);
      throw error;
    }
  }

  private async validateLessonAccess(userId: number, lessonId: number) {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
      include: {
        module: {
          select: {
            course_id: true,
            lessons: {
              orderBy: { order: 'asc' },
              select: { id: true },
            },
          },
        },
      },
    });

    if (!lesson) {
      throw new NotFoundException('Lesson not found');
    }

    // Find the lesson's position in the module
    const lessonIndex = lesson.module.lessons.findIndex(
      (l) => l.id === lessonId,
    );

    // If it's not the first lesson, check previous lessons
    if (lessonIndex > 0) {
      const previousLessonId = lesson.module.lessons[lessonIndex - 1].id;

      const previousCompleted = await this.prisma.lessonProgress.findUnique({
        where: {
          user_id_lesson_id: {
            user_id: userId,
            lesson_id: previousLessonId,
          },
        },
      });

      if (!previousCompleted?.completed) {
        throw new BadRequestException(
          'You must complete the previous lesson first',
        );
      }
    }

    return true;
  }

  // Helper function to validate the order
  private async validateOrder(
    moduleId: number,
    order: number,
    currentOrder?: number,
  ) {
    const maxOrder = await this.getMaxOrder(moduleId);

    // If the order is being updated, allow for a more lenient check
    if (currentOrder !== undefined && currentOrder === order) {
      // No need to validate if the order is the same
      return;
    }

    // Check if the order is sequential and not less than the next available order
    if (order > maxOrder + 1) {
      throw new ConflictException(
        `Invalid order. The next available order is ${maxOrder + 1}.`,
      );
    }

    if (order < 1) {
      throw new ConflictException('Order must be at least 1.');
    }

    if (order <= maxOrder) {
      throw new ConflictException(
        `Invalid order. The next available order is ${maxOrder + 1}.`,
      );
    }
  }

  // Helper function to get the maximum order for a course
  private async getMaxOrder(moduleId: number): Promise<number> {
    const lastLesson = await this.prisma.lesson.findFirst({
      where: { module_id: moduleId },
      orderBy: { order: 'desc' },
    });

    return lastLesson ? lastLesson.order : 0;
  }
}
