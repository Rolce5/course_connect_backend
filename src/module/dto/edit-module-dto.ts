import { Transform } from "class-transformer";
import { IsInt, IsNotEmpty, IsNotIn, IsOptional, IsString, Min } from "class-validator";

export class editModuleDto {
    @IsString()
    @IsNotEmpty()
    title?: string

    @IsString()
    @IsOptional()
    description?: string

    @IsNotEmpty()
    @IsInt()
    @Transform(({ value }) => parseInt(value, 10))
    order?: number

    @IsNotEmpty()
    @Min(1)
    @IsInt()
    @Transform(({ value }) => parseInt(value, 10))
    duration?: string

}