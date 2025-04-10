import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { GetUser } from 'src/auth/decorator';
import { JwtGuard } from 'src/auth/guard';
import { EnrollmentService } from './enrollment.service';
import { EnrollCourseDto } from './dto/enroll-course-dto';

@UseGuards(JwtGuard)
@Controller('api/courses/enrollment')
export class EnrollmentController {
    constructor(private readonly enrollmentService: EnrollmentService) {}

    @Get("all")
    async getUserEnrollments(@GetUser('id') userId: number){
        return this.enrollmentService.getUserEnrollments(userId);
    }

    @Get("recent")
    async getRecentEnrollments(){
        return this.enrollmentService.getRecentEnrollments();
    }
    
    @Post()
    async enroll(@GetUser('id') userId: number, @Body() enrollData: EnrollCourseDto){
        return this.enrollmentService.enroll(userId, enrollData.courseId);
    }
}
