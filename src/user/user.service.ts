import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EditUserDto } from './dto';
import { Role } from '@prisma/client';

@Injectable()
export class UserService {
    constructor(private prisma: PrismaService) {}

    async getAllUsers() {
        return this.prisma.user.findMany();
    }

    async getStudents() {
        return this.prisma.user.findMany({
            where: {
                role: Role.STUDENT
            }
        });
    }

    async editUser(userId: number, dto: EditUserDto){
        const user = await this.prisma.user.update({
            where: {
                id: userId
            },
            data: {
                ...dto
            }
        });

        // delete user.password;

        return user;
    }
}
