import { Transform } from "class-transformer";
import { IsInt, IsNotEmpty, IsOptional, IsString } from "class-validator";

export class createQuizDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsOptional()
  description: string;

  @IsInt()
  @Transform(({ value }) => parseInt(value, 10)) // Convert string to integer
  @IsNotEmpty()
  lessonId: number;
}