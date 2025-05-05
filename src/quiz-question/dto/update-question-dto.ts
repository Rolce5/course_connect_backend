import {
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class UpdateOptionDto {
  @IsOptional()
  id?: number; 

  @IsNotEmpty()
  optionText: string;

  @IsNotEmpty()
  @IsBoolean()
  isCorrect: boolean;
}

export class UpdateQuestionDto {
  @IsNotEmpty()
  @IsString()
  question: string;

  @IsNotEmpty()
  @IsString()
  hint: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateOptionDto)
  options: UpdateOptionDto[] = []; // Default empty array
}
