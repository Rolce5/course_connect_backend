import { Module } from '@nestjs/common';
import { RecommendCourseService } from './recommend-course.service';

@Module({
  providers: [RecommendCourseService],
  exports: [RecommendCourseService],
})
export class RecommendCourseModule {}
