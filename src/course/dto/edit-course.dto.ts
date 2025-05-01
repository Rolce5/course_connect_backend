import { IsBoolean, IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, IsUrl, IsNumber } from "class-validator";
import { Transform } from "class-transformer";
import { CourseCategory, DifficultyLevel } from "@prisma/client";

export class editCourseDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  shortDescription: string; // This matches the 'shortDescription' in the schema.

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsEnum(CourseCategory) // Enums for categories
  @IsNotEmpty()
  category: CourseCategory;

  @IsEnum(DifficultyLevel) // Enums for difficulty
  @IsNotEmpty()
  difficulty: DifficultyLevel;

  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => (value === "" ? null : parseFloat(value))) // Convert empty string to null for pricing
  pricing?: number;

  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => (value === "" ? null : parseFloat(value))) // Convert empty string to null for originalPrice
  originalPrice?: number;

  @IsInt()
  @IsNotEmpty()
  @Transform(({ value }) => parseInt(value, 10)) // Convert string to integer for duration
  duration: number;

  @IsInt()
  @IsNotEmpty()
  @Transform(({ value }) => parseInt(value, 10)) // Convert string to integer for totalHours
  totalHours: number;

  @IsBoolean()
  @IsNotEmpty()
  @Transform(({ value }) => value === "true" || value === true) // Convert string to boolean for isActive
  isActive: boolean;
  
}
