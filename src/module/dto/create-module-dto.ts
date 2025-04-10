import { Transform } from "class-transformer";
import { IsInt, IsNotEmpty, IsNotIn, IsOptional, IsString } from "class-validator";

export class createModuleDto {
    @IsString()
    @IsNotEmpty()
    title: string

    @IsString()
    @IsOptional()
    description: string

    @IsOptional()
    @IsInt()
    @Transform(({ value }) => parseInt(value, 10))
    order: number

    @IsNotEmpty()
    @IsInt()
    @Transform(({ value }) => parseInt(value, 10))
    duration: number

    @IsInt()
    @Transform(({ value }) => parseInt(value, 10)) // Convert string to integer
    @IsNotEmpty()
    courseId: number;

}