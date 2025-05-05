// import { Transform } from 'class-transformer';
// import { IsInt, IsNotEmpty, IsNumber, IsString, Min, ValidateIf } from 'class-validator';

// export class createLessonDto {
//   @IsString()
//   @IsNotEmpty()
//   title: string;

//   @IsString()
//   @IsNotEmpty()
//   content: string;

//   @IsString()
//   @IsNotEmpty()
//   description: string;

//   @IsInt()
//   @IsNotEmpty()
//   @Transform(({ value }) => parseInt(value, 10)) // Convert string to integer
//   duration: number;

//   @IsInt()
//   @Min(1, { message: 'Order must be at least 1.' })
//   @Transform(({ value }) => parseInt(value, 10)) // Convert string to integer
//   order: number;

//   @IsInt()
//   @Transform(({ value }) => parseInt(value, 10)) // Convert string to integer
//   @IsNotEmpty()
//   moduleId: number;

//   @ValidateIf((o) => !o.files) // Only validate if files don't exist
//   @IsString()
//   @IsNotEmpty({ message: 'Either video file or URL must be provided' })
//   videoUrl?: string;
// }
import { Transform } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
  ValidateIf,
} from 'class-validator';

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
  @Transform(({ value }) => parseInt(value, 10))
  duration: number;

  @IsInt()
  @Min(1, { message: 'Order must be at least 1.' })
  @Transform(({ value }) => parseInt(value, 10))
  order: number;

  @IsInt()
  @Transform(({ value }) => parseInt(value, 10))
  @IsNotEmpty()
  moduleId: number;

  @IsOptional()
  @IsString()
  @ValidateIf((o) => !o.files) // Only validate if no files are present
  videoUrl?: string;
}