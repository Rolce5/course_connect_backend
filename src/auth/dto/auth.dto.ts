import { IsEmail, IsEnum, IsNotEmpty, isNotEmpty, IsString, Matches, MinLength } from "class-validator";
import { Role } from '@prisma/client';  // Assuming you have the Role enum in Prisma


export class AuthDto {
    @IsEmail()
    @IsNotEmpty()
    email: string;

    @IsString()
    @IsNotEmpty()
    @MinLength(8) // Ensure password is at least 8 characters long
    @Matches(/(?=.*[A-Z])/, { message: 'Password must contain at least one uppercase letter' })
    @Matches(/(?=.*\d)/, { message: 'Password must contain at least one number' })
    password: string;
  

    @IsString()
    @IsNotEmpty()
    firstName: string;

    @IsString()
    @IsNotEmpty()
    lastName: string;


    @IsEnum(Role) // This ensures the role is one of the allowed roles (ADMIN, INSTRUCTOR, STUDENT)
    @IsNotEmpty()
    role: Role;  

}