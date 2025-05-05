import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ModuleService } from './module.service';
import { JwtGuard } from 'src/auth/guard';
import { RoleGuard } from 'src/auth/guard/role.guard';
import { createModuleDto } from './dto/create-module-dto';
import { editModuleDto } from './dto/edit-module-dto';

@UseGuards(JwtGuard)
@Controller('api/modules')
export class ModuleController {
  constructor(private readonly moduleService: ModuleService) {}

  @Get(':id')
  getModuleById(@Param('id', ParseIntPipe) moduleId: number) {
    return this.moduleService.getModuleById(moduleId);
  }

  @Get('course/:id/modules')
  getModulesByCourseId(@Param('id', ParseIntPipe) courseId: number) {
    return this.moduleService.getModulesByCourseId(courseId);
  }

  @Get(':id/highest-order')
  fetchHighestOrder(@Param('id', ParseIntPipe) courseId: number) {
    return this.moduleService.fetchHighestOrder(courseId);
  }

  @Post()
  create(@Body() dto: createModuleDto) {
    return this.moduleService.create(dto);
  }

  @Patch(':id')
  @UseGuards(RoleGuard)
  editModuleById(
    @Param('id', ParseIntPipe) moduleId: number,
    @Body() dto: editModuleDto,
  )
  {    return this.moduleService.update(moduleId, dto);
  }

  @Put('courses/:courseId/modules/order')
@UseGuards(JwtGuard, RoleGuard)
async updateModuleOrder(
  @Param('courseId', ParseIntPipe) courseId: number,
  @Body() body: { updates: Array<{ id: number; order: number }> }
) {
  return this.moduleService.updateModuleOrder(courseId, body.updates);
}

  @Delete(':id')
  @UseGuards(RoleGuard)
  deleteCourseById(@Param('id', ParseIntPipe) moduleId: number) {
    return this.moduleService.delete(moduleId);
  }
}
