import { Controller, Get } from '@nestjs/common';
import { RecommendCourseService } from './recommend-course.service';
import { GetUser } from 'src/auth/decorator';

@Controller('api/recommend-course')
export class RecommendCourseController {
  constructor(private recommendedCoursesService: RecommendCourseService) {}
  @Get()
  getRecommendedCourses(@GetUser('id') userId?: number
        // @Query('limit') limit = 8

  )
  {
    return this.recommendedCoursesService.getRecommendations(userId);
  }
}
