import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Put,
  Delete,
  UseGuards,
  UsePipes,
  ValidationPipe,
  UseInterceptors,
  UploadedFiles,
  ParseIntPipe,
  Patch,
  HttpCode,
  NotFoundException,
  InternalServerErrorException,
  BadRequestException,
} from '@nestjs/common';
import { LessonsService } from './lessons.service';
import { JwtGuard } from 'src/auth/guard';
import { RoleGuard } from 'src/auth/guard/role.guard';
import { createLessonDto } from './dto/create-lesson.dto';
import { FilesInterceptor } from '@nestjs/platform-express';
import { editLessonDto } from './dto/edit-lesson.dto';
import { GetUser } from 'src/auth/decorator';

@UseGuards(JwtGuard)
@Controller('api/lessons')
export class LessonsController {
  constructor(private readonly lessonsService: LessonsService) {}

  // @Post()
  // @UseGuards(RoleGuard) // Ensure only admins can create courses
  // @UsePipes(new ValidationPipe({ transform: true })) // Enable validation
  // @UseInterceptors(FilesInterceptor('files', 2)) // 'files' is the field name, 2 is the max number of files
  // create(
  //   @Body() dto: createLessonDto,
  //   @UploadedFiles() files?: Express.Multer.File[],
  // ) {
  //   // Extract video files (if provided)
  //   const videoFile = files?.find((file) => file.mimetype.startsWith('video'));
  //   return this.lessonsService.create(dto, videoFile);
  // }
  @Post()
  @UseGuards(RoleGuard) // Ensure only admins can create course
  @UseInterceptors(FilesInterceptor('files', 1)) // Handle single file upload
  @UsePipes(new ValidationPipe({ transform: true }))
  async create(
    @Body() dto: createLessonDto,
    @UploadedFiles() files?: Express.Multer.File[],
  ) {
    // Manual validation for video
    if (!dto.videoUrl && (!files || files.length === 0)) {
      throw new BadRequestException(
        'Either video file or URL must be provided',
      );
    }

    const videoFile = files?.[0];
    //   const videoFile = files?.find((file) => file.mimetype.startsWith('video'));
    return this.lessonsService.create(dto, videoFile);
  }

  @Get(':moduleId')
  getLessonsByModuleId(@Param('moduleId', ParseIntPipe) moduleId: number) {
    return this.lessonsService.getLessonsByModuleeId(moduleId);
  }

  @Get(':id/highest-order')
  fetchHighestOrder(@Param('id', ParseIntPipe) moduleId: number) {
    return this.lessonsService.fetchHighestOrder(moduleId);
  }

  @Patch(':lessonId')
  @UseInterceptors(FilesInterceptor('files', 1))
  async updateLesson(
    @Param('lessonId', ParseIntPipe) lessonId: number,
    @Body() updateLessonDto: editLessonDto,
    @UploadedFiles() files?: Express.Multer.File[],
  ) {
    // Manual validation for video
    if (!updateLessonDto.videoUrl && (!files || files.length === 0)) {
      throw new BadRequestException(
        'Either video file or URL must be provided',
      );
    }

    const videoFile = files?.[0];
    return this.lessonsService.update(lessonId, updateLessonDto, videoFile);
  }

  // @Get(':id/progress')
  // @UseGuards(JwtGuard)
  // async getLessonProgress(
  //   @GetUser('id') userId: number,
  //   @Param('id', ParseIntPipe) lessonId: number,
  // ) {
  //   return this.lessonsService.getLessonProgress(userId, lessonId);
  // }

  // @Post(':id/complete')
  // @HttpCode(200) // Explicit success status
  // async completeLesson(
  //   @GetUser('id') userId: number,
  //   @Param('id', ParseIntPipe) lessonId: number,
  // ) {
  //   try {
  //     const result = await this.lessonsService.completeLesson(userId, lessonId);
  //     return {
  //       success: true,
  //       data: result,
  //     };
  //   } catch (error) {
  //     if (error instanceof NotFoundException) {
  //       throw new NotFoundException('Lesson not found');
  //     }
  //     throw new InternalServerErrorException('Failed to complete lesson');
  //   }
  // }

  // @Get('lesson/:lessonId/progress')
  // async getLessonProgress(
  //   @GetUser('id') userId: number,
  //   @Param('lessonId', ParseIntPipe) lessonId: number,
  // ) {
  //   return this.lessonsService.getLessonProgress(userId, lessonId);
  // }
  // lessons.controller.ts
  

  @Delete(':id')
  @UseGuards(RoleGuard) // Ensure only admins can create courses
  remove(@Param('id', ParseIntPipe) lessonId: number) {
    return this.lessonsService.remove(lessonId);
  }
}
