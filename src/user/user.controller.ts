import { Body, Controller, Get, Patch, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { User } from '@prisma/client';
import { Request } from 'express';
import { GetUser } from '../auth/decorator';
import { JwtGuard } from '../auth/guard/jwt.guard';
import { EditUserDto } from './dto';
import { UserService } from './user.service';
import { RoleGuard } from 'src/auth/guard/role.guard';

@UseGuards(JwtGuard)
@Controller('api/users')
export class UserController {
    constructor(private userService: UserService) {}

    @Get()
    @UseGuards(RoleGuard)
    getAllUsers(@GetUser() user: User){
        return this.userService.getAllUsers();
    }

    @Get('students')
    @UseGuards(RoleGuard) 
    getStudents(@GetUser() user: User){
        return this.userService.getStudents();
    }

    @Get('profile')
    getMe(@GetUser() user: User){
        return user;
    }

    @Patch()
    editUser(@GetUser('id') userId: number, @Body() dto: EditUserDto) {
        return this.userService.editUser(userId, dto);
    }
}
