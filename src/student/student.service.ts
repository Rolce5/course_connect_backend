import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class StudentService {
  constructor(private readonly prisma: PrismaService) {}

  async getStudents() {
    try {
      const students = await this.prisma.user.findMany({
        where: {
          role: Role.STUDENT,
        },
      });

      return students;
    } catch (error) {
      console.error('Error fetching students:', error);
      throw new InternalServerErrorException('Failed fetch students');
    }
  }
}
