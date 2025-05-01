import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { createModuleDto } from './dto/create-module-dto';
import { editModuleDto } from './dto/edit-module-dto';
import { Module } from '@prisma/client'; // Importing the Module type from Prisma
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class ModuleService {
  constructor(
    private prisma: PrismaService,
    private readonly cloudinary: CloudinaryService,
  ) {}
  async getModuleById(moduleId: number) {
    try {
      const module = await this.prisma.module.findUnique({
        where: {
          id: moduleId,
        },
      });

      return module;
    } catch (error) {
      console.error('Error fetching course module:', error);
      throw new InternalServerErrorException('Failed fetch course module');
    }
  }
  async create(dto: createModuleDto) {
    try {
      // 1. First verify the course exists
      const courseExists = await this.prisma.course.findUnique({
        where: { id: dto.courseId },
      });

      if (!courseExists) {
        throw new NotFoundException(`Course with ID ${dto.courseId} not found`);
      }

      // 2. Get all modules in this course to find the list of orders
      const modulesInCourse = await this.prisma.module.findMany({
        where: { course_id: dto.courseId },
        orderBy: { order: 'asc' },
      });

      const existingOrders = modulesInCourse.map((m) => m.order);
      const maxOrder =
        existingOrders.length > 0 ? Math.max(...existingOrders) : 0;

      // 3. If no order was provided, calculate the next available order
      if (!dto.order) {
        dto.order = maxOrder + 1;
      } else {
        // 4. Validate the provided order doesn't create gaps
        if (dto.order > maxOrder + 1) {
          throw new BadRequestException(
            `Cannot create module with order ${dto.order}. The next available order is ${maxOrder + 1}`,
          );
        }

        // 5. Check if the order is already taken
        if (existingOrders.includes(dto.order)) {
          throw new BadRequestException(
            `Order ${dto.order} is already taken in this course.`,
          );
        }
      }

      // 6. Create the module
      const module = await this.prisma.module.create({
        data: {
          title: dto.title,
          description: dto.description,
          duration: dto.duration,
          order: dto.order,
          course_id: dto.courseId,
        },
      });

      return module;
    } catch (error) {
      console.error('Error creating module:', error);

      // Handle known error types
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }

      // Handle Prisma unique constraint violation
      if (error.code === 'P2002') {
        throw new BadRequestException(
          'A module with this order already exists in the course',
        );
      }

      throw new InternalServerErrorException('Failed to create module');
    }
  }

  async getModulesByCourseId(courseId: number) {
    // Verify course exists first
    const courseExists = await this.prisma.course.findUnique({
      where: { id: courseId },
    });

    if (!courseExists) {
      throw new NotFoundException(`Course with ID ${courseId} not found`);
    }
    try {
      const module = await this.prisma.module.findMany({
        where: {
          course_id: courseId,
        },
        include: { lessons: true, course: true },
        orderBy: {
          order: 'asc',
        },
      });

      return module;
    } catch (error) {
      console.error('Error fetching course module:', error);
      throw new InternalServerErrorException('Failed fetch course module');
    }
  }

  async fetchHighestOrder(courseId: number) {
    try {
      // Get only the highest order module (most efficient approach)
      const highestOrderModule = await this.prisma.module.findFirst({
        where: { course_id: courseId },
        select: { order: true }, // Only fetch the order field
        orderBy: { order: 'desc' },
      });

      console.log(highestOrderModule);

      // Return 0 if no modules exist (frontend will increment to 1)
      return highestOrderModule?.order || 0;
    } catch (error) {
      console.error('Error fetching highest order:', error);
      throw new InternalServerErrorException('Failed to fetch module order');
    }
  }

  async update(moduleId: number, updatedModule: editModuleDto) {
    // Find the existing module
    const module = await this.prisma.module.findUnique({
      where: { id: moduleId },
    });

    if (!module) {
      throw new BadRequestException('Module not found');
    }

    try {
      // Prepare the data to update (excluding order for now)
      const updatedModuleData: any = {
        title: updatedModule.title ?? module.title,
        description: updatedModule.description ?? module.description,
        duration: updatedModule.duration ?? module.duration,
      };

      // If order is being updated, handle the reordering
      if (
        updatedModule.order !== undefined &&
        updatedModule.order !== module.order
      ) {
        return await this.handleOrderUpdate(
          module,
          updatedModule.order,
          updatedModuleData,
        );
      }

      // If no order change, just update the module
      const result = await this.prisma.module.update({
        where: { id: moduleId },
        data: updatedModuleData,
      });

      return { message: 'Module updated successfully', module: result };
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

  private async handleOrderUpdate(
    module: Module,
    newOrder: number,
    updatedData: any,
  ) {
    // Fetch all modules in the same course, sorted by order
    const modules = await this.prisma.module.findMany({
      where: { course_id: module.course_id },
      orderBy: { order: 'asc' },
    });

    // Validate newOrder is within bounds
    if (newOrder < 1 || newOrder > modules.length) {
      throw new BadRequestException(
        `Order must be between 1 and ${modules.length}`,
      );
    }

    const oldOrder = module.order;

    // No change needed if order is the same
    if (newOrder === oldOrder) {
      const result = await this.prisma.module.update({
        where: { id: module.id },
        data: updatedData,
      });
      return { message: 'Module updated successfully', module: result };
    }

    // Create transaction for atomic updates
    return await this.prisma.$transaction(async (prisma) => {
      // Temporarily set the module's order to a value outside the range
      await prisma.module.update({
        where: { id: module.id },
        data: { order: -1 }, // Temporary value
      });

      // Shift other modules to make space for the new order
      if (newOrder < oldOrder) {
        // Moving up - increment orders of modules between new and old positions
        await prisma.module.updateMany({
          where: {
            course_id: module.course_id,
            order: { gte: newOrder, lt: oldOrder },
          },
          data: { order: { increment: 1 } },
        });
      } else {
        // Moving down - decrement orders of modules between old and new positions
        await prisma.module.updateMany({
          where: {
            course_id: module.course_id,
            order: { gt: oldOrder, lte: newOrder },
          },
          data: { order: { decrement: 1 } },
        });
      }

      // Finally update the target module with its new order and other changes
      const result = await prisma.module.update({
        where: { id: module.id },
        data: {
          ...updatedData,
          order: newOrder,
        },
      });

      return { message: 'Module order updated successfully', module: result };
    });
  }

  async updateModuleOrder(
    courseId: number,
    updates: Array<{ id: number; order: number }>,
  ) {
    try {
      // Validate all modules belong to the course
      const moduleIds = updates.map((u) => u.id);
      const modules = await this.prisma.module.findMany({
        where: {
          id: { in: moduleIds },
          course_id: courseId,
        },
      });

      if (modules.length !== updates.length) {
        throw new BadRequestException(
          'Some modules do not belong to this course',
        );
      }

      // Get current maximum order value in the course
      const maxOrderResult = await this.prisma.module.aggregate({
        where: { course_id: courseId },
        _max: { order: true },
      });
      const maxOrder = maxOrderResult._max.order || 0;

      // Generate temporary offset that's higher than any existing order
      const tempOffset = maxOrder + 1000;

      // Update all modules in the course to temporary unique values
      await this.prisma.module.updateMany({
        where: { course_id: courseId },
        data: {
          order: {
            // This creates unique temporary values by adding the offset to current order
            increment: tempOffset,
          },
        },
      });

      // Now update the modules to their new orders
      await this.prisma.$transaction(
        updates.map((update) =>
          this.prisma.module.update({
            where: { id: update.id },
            data: { order: update.order },
          }),
        ),
      );

      return { success: true, message: 'Module order updated successfully' };
    } catch (error) {
      console.error('Error updating module order:', error);
      throw new InternalServerErrorException('Failed to update module order');
    }
  }

  async delete(moduleId: number) {
    // Find the module to be deleted along with its courseId and order
    const module = await this.prisma.module.findUnique({
      where: {
        id: moduleId,
      },
      select: {
        order: true,
        course_id: true,
      },
    });
  
    if (!module) {
      throw new NotFoundException(`Module with ID ${moduleId} not found`);
    }
  
    const { order, course_id } = module;
  
    // Start a transaction to ensure atomic operations
    const transaction = await this.prisma.$transaction(async (prisma) => {
      try {
        // 1. Find and delete all lessons associated with the module
        const lessons = await prisma.lesson.findMany({
          where: {
            module_id: moduleId,
          },
          select: {
            videoUrl: true,
          },
        });
  
        // Delete each lesson's video from Cloudinary
        for (const lesson of lessons) {
          if (lesson.videoUrl) {
            const publicId = lesson.videoUrl.split('/').pop()?.split('.')[0];
            if (publicId) {
              await this.cloudinary.deleteFile(publicId, 'video');
            }
          }
        }
  
        // 2. Delete the lessons from the database
        await prisma.lesson.deleteMany({
          where: {
            module_id: moduleId,
          },
        });
  
        // 3. Get all modules in the course to calculate temporary values
        const allModules = await prisma.module.findMany({
          where: {
            course_id: course_id,
          },
          orderBy: {
            order: 'asc',
          },
        });
  
        // 4. Calculate temporary negative orders to avoid conflicts
        const tempOffset = allModules.length * -1 - 1;
  
        // 5. First set all modules to temporary negative orders
        await prisma.module.updateMany({
          where: {
            course_id: course_id,
          },
          data: {
            order: {
              increment: tempOffset,
            },
          },
        });
  
        // 6. Now update orders properly, skipping the deleted module
        let newOrder = 1;
        for (const mod of allModules) {
          if (mod.id !== moduleId) {
            await prisma.module.update({
              where: { id: mod.id },
              data: { order: newOrder++ },
            });
          }
        }
  
        // 7. Finally, delete the module
        await prisma.module.delete({
          where: {
            id: moduleId,
          },
        });
  
        return {
          message: 'Module and associated lessons deleted successfully',
        };
      } catch (error) {
        console.error('Error deleting module:', error);
        throw new InternalServerErrorException(
          'Failed to delete module and lessons',
        );
      }
    }, {
      isolationLevel: 'Serializable', // Highest isolation level
      maxWait: 5000, // Maximum wait time for the transaction
      timeout: 10000, // Maximum execution time
    });
  
    return transaction;
  }


}
