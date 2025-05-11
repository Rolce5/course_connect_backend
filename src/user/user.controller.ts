import { Body, Controller, DefaultValuePipe, Get, ParseIntPipe, Patch, Query, Req, UseGuards } from '@nestjs/common';
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
  getAllUsers(@GetUser() user: User) {
    return this.userService.getAllUsers();
  }

  @Get('students')
  @UseGuards(RoleGuard)
  getStudents(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number = 1,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number = 10,
  ) {
    return this.userService.getStudents(page, limit);
  }

  @Get('instructors')
  @UseGuards(RoleGuard)
  getInstructors(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number = 1,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number = 10,
  ) {
    return this.userService.getInstructors(page, limit);
  }

 
  @Get('profile')
  getMe(@GetUser() user: User) {
    return {
      id: user.id,
      first_name: user.first_name,
      last_name: user.last_name,
      email: user.email,
      role: user.role,
      bio: user.bio,
    };
  }

  @Patch()
  editUser(@GetUser('id') userId: number, @Body() dto: EditUserDto) {
    return this.userService.editUser(userId, dto);
  }
}
