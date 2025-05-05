import {
  Body,
  Controller,
  Get,
  Post,
  Patch,
  Req,
  Param,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { GetUser } from 'src/auth/decorator';
import { JwtGuard } from 'src/auth/guard';
import { EnrollmentService } from './enrollment.service';
import { EnrollCourseDto } from './dto/enroll-course-dto';

@UseGuards(JwtGuard)
@Controller('api/courses/enrollment')
export class EnrollmentController {
  constructor(private readonly enrollmentService: EnrollmentService) {}

  @Get('all')
  async getUserEnrollments(@GetUser('id') userId: number) {
    return this.enrollmentService.getUserEnrollments(userId);
  }

  @Get('recent')
  async getRecentEnrollments() {
    return this.enrollmentService.getRecentEnrollments();
  }

  @Post()
  async enroll(
    @GetUser('id') userId: number,
    @Body() enrollData: EnrollCourseDto,
  ) {
    return this.enrollmentService.enroll(userId, enrollData.courseId);
  }

  @Get(':courseId')
  getEnrollment(@Req() req, @Param('courseId', ParseIntPipe) courseId: number) {
    return this.enrollmentService.getUserEnrollment(req.user.id, courseId);
  }

  @Patch(':courseId/progress')
  updateProgress(
    @GetUser('id') userId: number,
    @Param('courseId', ParseIntPipe) courseId: number,
    @Body('lastLessonId', ParseIntPipe) lastLessonId: number,
  ) {
    return this.enrollmentService.updateEnrollmentProgress(
      userId,
      courseId,
      lastLessonId,
    );
  }

  @Get('lesson/:id/progress')
  @UseGuards(JwtGuard)
  async getLessonProgress(
    @GetUser('id') userId: number,
    @Param('id', ParseIntPipe) lessonId: number,
  ) {
    return this.enrollmentService.getLessonProgress(userId, lessonId);
  }

  @Patch('lesson/:id/video-progress')
  async updateVideoProgress(
    @GetUser('id') userId: number,
    @Param('id', ParseIntPipe) lessonId: number,
    @Body('progress', ParseIntPipe) progress: number,
  ) {
    return this.enrollmentService.updateVideoProgress(
      userId,
      lessonId,
      progress,
    );
  }

  @Post('lesson/:lessonId/complete')
  async completeLesson(
    @GetUser('id') userId: number,
    @Param('lessonId', ParseIntPipe) lessonId: number,
  ) {
    return this.enrollmentService.completeLesson(userId, lessonId);
  }

  @Get(':courseId/lesson-progress')
  @UseGuards(JwtGuard)
  async getCourseLessonProgress(
    @GetUser('id') userId: number,
    @Param('courseId', ParseIntPipe) courseId: number,
  ) {
    return this.enrollmentService.getCourseLessonProgress(userId, courseId);
  }
}
