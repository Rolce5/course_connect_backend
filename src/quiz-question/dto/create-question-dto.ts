import {
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class CreateOptionDto {
  @IsNotEmpty()
  optionText: string;

  @IsNotEmpty()
  @IsBoolean()
  isCorrect: boolean;
}

export class CreateQuestionDto {
  @IsNotEmpty()
  @IsString()
  question: string;

  @IsOptional()
  @IsString()
  hint: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateOptionDto)
  options: CreateOptionDto[] = []; // Default empty array
}
