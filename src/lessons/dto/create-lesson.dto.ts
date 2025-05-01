import { Transform } from 'class-transformer';
import { IsInt, IsNotEmpty, IsNumber, IsString, Min } from 'class-validator';

export class createLessonDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  content: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsInt()
  @IsNotEmpty()
  @Transform(({ value }) => parseInt(value, 10)) // Convert string to integer
  duration: number;

  @IsInt()
  @Min(1, { message: 'Order must be at least 1.' })
  @Transform(({ value }) => parseInt(value, 10)) // Convert string to integer
  order: number;

  @IsInt()
  @Transform(({ value }) => parseInt(value, 10)) // Convert string to integer
  @IsNotEmpty()
  moduleId: number;
}
