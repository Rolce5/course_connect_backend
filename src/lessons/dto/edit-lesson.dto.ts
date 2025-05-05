import { Transform } from 'class-transformer';
import { IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, Min, ValidateIf } from 'class-validator';

export class editLessonDto {
  @IsString()
  @IsNotEmpty()
  title?: string;

  @IsString()
  @IsNotEmpty()
  content?: string;

  @IsString()
  @IsNotEmpty()
  description?: string;

  @IsNumber()
  @IsNotEmpty()
  @Transform(({ value }) => parseInt(value, 10)) // Convert string to integer
  duration?: number;

  @IsInt()
  @Min(1, { message: 'Order must be at least 1.' })
  @Transform(({ value }) => parseInt(value, 10)) // Convert string to integer
  order?: number;

   @IsOptional()
  @IsString()
  @ValidateIf((o) => !o.files) // Only validate if no files are present
  videoUrl?: string;

}
