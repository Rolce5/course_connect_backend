import { Controller, Get, UseGuards } from '@nestjs/common';
import { StudentService } from './student.service';
import { JwtGuard } from 'src/auth/guard';

@UseGuards(JwtGuard)
@Controller('api/students')
export class StudentController {
    constructor(private studentService: StudentService) {}

    @Get()
    async getStudents () {
        return this.studentService.getStudents();
    }
}
