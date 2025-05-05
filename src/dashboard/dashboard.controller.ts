import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { JwtGuard } from 'src/auth/guard';
import { RoleGuard } from 'src/auth/guard/role.guard';
import { DashboardService } from './dashboard.service';
import { GetUser } from 'src/auth/decorator';
import { User } from '@prisma/client';

@Controller('api/dashboard')
@UseGuards(JwtGuard)
export class DashboardController {
  constructor(private dashboardService: DashboardService) {}

  @Get()
  async getDashboardData(@GetUser() user: User) {
    const { role, id } = user; 
    return this.dashboardService.getDashboardData(role, id);
  }
}
