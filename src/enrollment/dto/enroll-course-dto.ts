import { IsNumber, IsPositive } from "class-validator";

export class EnrollCourseDto {
    @IsNumber()
    @IsPositive()
    courseId: number
}