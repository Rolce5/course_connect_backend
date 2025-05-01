import { Module } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { PaymentController } from './payment.controller';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [HttpModule],
  controllers: [PaymentController],
  providers: [PaymentService, PrismaService],
  exports: [PaymentService]  
})
export class PaymentModule {}
