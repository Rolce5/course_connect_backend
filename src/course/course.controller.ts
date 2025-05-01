import {
  Body,
  Controller,
  Delete,
  Get,
  InternalServerErrorException,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UploadedFile,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { JwtGuard } from 'src/auth/guard';
import { CourseService } from './course.service';
import { GetUser } from 'src/auth/decorator';
import { createCourseDto, editCourseDto } from './dto';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { RoleGuard } from 'src/auth/guard/role.guard';
import { Course } from '@prisma/client';

@UseGuards(JwtGuard)
@Controller('api/courses')
export class CourseController {
  constructor(private courseService: CourseService) {}

@Get()
async getAllCourses(@GetUser('id') instructorId: number, @GetUser('role') role: string) {
  return this.courseService.getAllCourses(instructorId, role);
}

  @Post()
  @UseGuards(RoleGuard) // Ensure only admins can create courses
  @UseInterceptors(FilesInterceptor('files', 2))
  async createCourse(
    @GetUser('id') instructorId: number,
    @Body() dto: createCourseDto,
    @UploadedFiles() files?: Express.Multer.File[],
    
  ) {
    console.log('Received files:', files); // Log the files for debugging

    // Extract image and video files (if provided)
    const imageFile = files?.find((file) => file.mimetype.startsWith('image'));
    const videoFile = files?.find((file) => file.mimetype.startsWith('video'));
  
    
        return this.courseService.createCourse(instructorId, dto, imageFile, videoFile);

  }

  @Get(':id')
  getCourseById(
    @GetUser('id') instructorId: number,
    @Param('id', ParseIntPipe) courseId: number,
  ) {
    return this.courseService.getCourseById(instructorId, courseId);
  }

  @Get(':id/with-lessons')
  getCourseWithLessons(
    @GetUser() user: any, // assuming the 'user' object contains role
    @Param('id', ParseIntPipe) courseId: number,
    // @Query('page', ParseIntPipe) page: number = 1,
    // @Query('limit', ParseIntPipe) limit: number = 10

  ) {
    const { id: userId, role } = user;  // Extract userId and role from user object
    return this.courseService.getCourseWithLessons(userId, courseId, role);
  }

  

  @Patch(':id')
  @UseGuards(RoleGuard) // Ensure only admins can create courses
  @UseInterceptors(FilesInterceptor('files', 2))
  editCourseById(
    @GetUser('id') instructorId: number,
    @Param('id', ParseIntPipe) courseId: number,
    @Body() dto: editCourseDto,
    @UploadedFiles() files?: Express.Multer.File[], // Get the uploaded file

  ) {
    // Extract image and video files (if provided)
    const imageFile = files?.find((file) => file.mimetype.startsWith('image'));
    const videoFile = files?.find((file) => file.mimetype.startsWith('video'));

    console.log(dto);

    return this.courseService.editCourseById(instructorId, courseId, dto, imageFile, videoFile);
  }

  @Delete(':id')
  @UseGuards(RoleGuard) // Ensure only admins can create courses
  deleteCourseById(
    @GetUser('id') instructorId: number,
    @Param('id', ParseIntPipe) courseId: number,
  ) {
    return this.courseService.deleteCourseById(instructorId, courseId);
  }
}
