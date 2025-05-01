import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EditUserDto } from './dto';
import { Role } from '@prisma/client';
import { first } from 'rxjs';

@Injectable()
export class UserService {
    constructor(private prisma: PrismaService) {}

    async getAllUsers() {
        return this.prisma.user.findMany();
    }

    async getStudents(page: number = 1, limit: number = 10)
    {
        const skip = (page - 1) * limit;
        const [students, totalCount] = await Promise.all([
          this.prisma.user.findMany({
            where: {
              role: Role.STUDENT,
            },
            skip,
            take: limit,
            select: {
              first_name: true,
              last_name: true,
              email: true,
              enrollments: { select: { status: true } },
            },
            orderBy: { createdAt: 'desc' },
          }),
          this.prisma.user.count({
            where: {
              role: Role.STUDENT,
            },
          }),
        ]);
        return {
          data: students,
          pagination: {
            total: totalCount,
            page,
            limit,
            totalPages: Math.ceil(totalCount / limit),
            hasNextPage: page * limit < totalCount,
            hasPreviousPage: page > 1,
          },
        };
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
