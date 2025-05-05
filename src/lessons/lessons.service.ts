import {
  Injectable,
  ConflictException,
  NotFoundException,
  InternalServerErrorException,
  BadRequestException,
} from '@nestjs/common';
import { Lesson, Prisma } from '@prisma/client';  // Add this import
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

  async update(
    lessonId: number,
    dto: editLessonDto,
    videoFile?: Express.Multer.File,
  ) {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
    });

    if (!lesson) {
      throw new NotFoundException('Lesson not found');
    }

    try {
      const updateData: any = {
        title: dto.title,
        description: dto.description,
        content: dto.content,
        duration: dto.duration,
        order: dto.order,
      };

      // Handle video update
      if (videoFile) {
        // Upload new video and get URL
        const videoUrl = await this.cloudinary.uploadVideo(videoFile);
        updateData.videoUrl = videoUrl?.secure_url;
      } else if (dto.videoUrl) {
        updateData.videoUrl = dto.videoUrl;
      }

      return this.prisma.lesson.update({
        where: { id: lessonId },
        data: updateData,
      });
    } catch (error) {
      console.error('Error updating module:', error);

      if (error.code === 'P2002') {
        throw new BadRequestException('Duplicate module order detected');
      }

      throw new InternalServerErrorException(
        'An error occurred while updating the module',
      );
    }
  }
  // async update(lessonId: number, updatedLesson: editLessonDto,
  //   videoFile?: Express.Multer.File,) {
  //   // Find the existing module
  //   const lesson = await this.prisma.lesson.findUnique({
  //     where: { id: lessonId },
  //   });

  //   if (!lesson) {
  //     throw new BadRequestException('lesson not found');
  //   }

  //   try {
  //     // Prepare the data to update (excluding order for now)
  //     const updatedLessonData: any = {
  //       title: updatedLesson.title ?? lesson.title,
  //       description: updatedLesson.description ?? lesson.description,
  //       content: updatedLesson.content ?? lesson.content,
  //       duration: updatedLesson.duration ?? lesson.duration,
  //     };

  //     // Handle video update
  //     if (videoFile) {
  //       // Upload new video and get URL
  //       const videoUrl = await this.cloudinary.uploadVideo(videoFile);
  //       updatedLessonData.videoUrl = videoUrl?.secure_url;
  //     } else if (updatedLesson.videoUrl) {
  //       updatedLessonData.videoUrl = updatedLesson.videoUrl;
  //     }

  //     // If order is being updated, handle the reordering
  //     if (
  //       updatedLesson.order !== undefined &&
  //       updatedLesson.order !== lesson.order
  //     ) {
  //       return await this.handleOrderUpdate(
  //         lesson,
  //         updatedLesson.order,
  //         updatedLessonData,
  //       );
  //     }

  //     // If no order change, just update the module
  //     const result = await this.prisma.module.update({
  //       where: { id: lessonId },
  //       data: updatedLessonData,
  //     });

  //     return { message: 'Lesson updated successfully', lesson: result };
  //   } catch (error) {
  //     console.error('Error updating lesson:', error);

  //     if (error.code === 'P2002') {
  //       throw new BadRequestException('Duplicate lesson order detected');
  //     }

  //     throw new InternalServerErrorException(
  //       'An error occurred while updating the lesson',
  //     );
  //   }
  // }

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

  // async completeLesson(userId: number, lessonId: number) {
  //   try {
  //     await this.validateLessonAccess(userId, lessonId);

  //     const lesson = await this.prisma.lesson.findUnique({
  //       where: { id: lessonId },
  //       include: {
  //         module: {
  //           select: {
  //             id: true,
  //             course_id: true,
  //             lessons: {
  //               orderBy: { order: 'asc' },
  //               select: { id: true },
  //             },
  //           },
  //         },
  //       },
  //     });

  //     if (!lesson) {
  //       throw new NotFoundException('Lesson not found');
  //     }

  //     return await this.prisma.$transaction(async (tx) => {
  //       // 1. Verify enrollment exists
  //       const enrollment = await tx.enrollment.findFirst({
  //         where: {
  //           user_id: userId,
  //           course_id: lesson.module.course_id,
  //         },
  //       });

  //       if (!enrollment) {
  //         throw new BadRequestException('User is not enrolled in this course');
  //       }

  //       // 2. Update lesson progress
  //       const progress = await tx.lessonProgress.upsert({
  //         where: {
  //           user_id_lesson_id: {
  //             user_id: userId,
  //             lesson_id: lessonId,
  //           },
  //         },
  //         create: {
  //           user_id: userId,
  //           lesson_id: lessonId,
  //           module_id: lesson.module_id, // Add this
  //           course_id: lesson.module.course_id, // Add this

  //           completed: true,
  //           completed_at: new Date(),
  //         },
  //         update: {
  //           completed: true,
  //           completed_at: new Date(),
  //         },
  //       });

  //       // 3. Update enrollment last lesson
  //       await tx.enrollment.updateMany({
  //         where: {
  //           user_id: userId,
  //           course_id: lesson.module.course_id,
  //         },
  //         data: {
  //           last_lesson_id: lessonId,
  //         },
  //       });

  //       // 4. Calculate and update course progress (optimized parallel queries)
  //       const [totalLessons, completedLessons] = await Promise.all([
  //         tx.lesson.count({
  //           where: {
  //             module: {
  //               course_id: lesson.module.course_id,
  //             },
  //           },
  //         }),
  //         tx.lessonProgress.count({
  //           where: {
  //             user_id: userId,
  //             course_id: lesson.module.course_id,
  //             completed: true,
  //           },
  //         }),
  //       ]);

  //       const newProgress = Math.round((completedLessons / totalLessons) * 100);

  //       await tx.enrollment.updateMany({
  //         where: {
  //           user_id: userId,
  //           course_id: lesson.module.course_id,
  //         },
  //         data: {
  //           progress: newProgress,
  //           status: newProgress === 100 ? 'COMPLETED' : 'IN_PROGRESS',
  //         },
  //       });

  //       return progress;
  //     });
  //   } catch (error) {
  //     // this.logger.error(`Error completing lesson ${lessonId}`, error.stack);
  //     throw error;
  //   }
  // }

  // Helper function to validate the order
  private async handleOrderUpdate(
    lesson: Lesson,
    newOrder: number,
    updatedData: any,
  ) {
    // Fetch all lessons in the same course, sorted by order
    const lessons = await this.prisma.lesson.findMany({
      where: { module_id: lesson.module_id },
      orderBy: { order: 'asc' },
    });

    // Validate newOrder is within bounds
    if (newOrder < 1 || newOrder > lessons.length) {
      throw new BadRequestException(
        `Order must be between 1 and ${lessons.length}`,
      );
    }

    const oldOrder = lesson.order;

    // No change needed if order is the same
    if (newOrder === oldOrder) {
      const result = await this.prisma.lesson.update({
        where: { id: lesson.id },
        data: updatedData,
      });
      return { message: 'lesson updated successfully', lesson: result };
    }

    // Create transaction for atomic updates
    return await this.prisma.$transaction(async (prisma) => {
      // Temporarily set the lesson's order to a value outside the range
      await prisma.lesson.update({
        where: { id: lesson.id },
        data: { order: -1 }, // Temporary value
      });

      // Shift other lessons to make space for the new order
      if (newOrder < oldOrder) {
        // Moving up - increment orders of lessons between new and old positions
        await prisma.lesson.updateMany({
          where: {
            module_id: lesson.module_id,
            order: { gte: newOrder, lt: oldOrder },
          },
          data: { order: { increment: 1 } },
        });
      } else {
        // Moving down - decrement orders of lessons between old and new positions
        await prisma.lesson.updateMany({
          where: {
            module_id: lesson.module_id,
            order: { gt: oldOrder, lte: newOrder },
          },
          data: { order: { decrement: 1 } },
        });
      }

      // Finally update the target lesson with its new order and other changes
      const result = await prisma.lesson.update({
        where: { id: lesson.id },
        data: {
          ...updatedData,
          order: newOrder,
        },
      });

      return { message: 'lesson order updated successfully', lesson: result };
    });
  }
}
