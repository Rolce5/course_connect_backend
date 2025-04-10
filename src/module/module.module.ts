import { Module } from '@nestjs/common';
import { ModuleService } from './module.service';
import { ModuleController } from './module.controller';
import { AuthModule } from 'src/auth/auth.module';
import { CloudinaryModule } from 'src/cloudinary/cloudinary.module';

@Module({
  providers: [ModuleService],
  controllers: [ModuleController],
  imports: [ModuleModule, AuthModule, CloudinaryModule],
  exports: [ModuleService], // Ensure ModuleService is exported if it needs to be accessed from other modules
})
export class ModuleModule {}
