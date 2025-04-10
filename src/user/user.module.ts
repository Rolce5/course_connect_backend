import { Module } from '@nestjs/common';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { AuthModule } from 'src/auth/auth.module';

@Module({
  imports: [AuthModule], // <-- Add AuthModule to imports array
  controllers: [UserController],
  providers: [UserService]
})
export class UserModule {}
