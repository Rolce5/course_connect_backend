import {
  Body,
  Controller,
  DefaultValuePipe,
  Get,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { PaymentService } from './payment.service';
import { GetUser } from 'src/auth/decorator';
import { User } from '@prisma/client';
import { JwtGuard } from 'src/auth/guard';
import { Response } from 'express';

@UseGuards(JwtGuard) // Apply the guard to ensure the user is authenticated
@Controller('api/payments')
export class PaymentController {
  constructor(private paymentService: PaymentService) {}

  @Get()
  async getPaymentHistory(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number = 1,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number = 10,
  )
  {
    return this.paymentService.getAllPayments(page, limit);
  }

  @Post('initiate')
  async initiate(
    @Body('courseId', ParseIntPipe) courseId: number,
    @GetUser() user: User,
  ) {
    return this.paymentService.initiatePayment(courseId, user);
  }

  @Get('verify')
  async verify(@Query('transactionId') transactionId: string) {
    return this.paymentService.verifyPayment(transactionId);
  }

  @Post('fapshi')
  @HttpCode(200) // Webhooks typically need to return 200 immediately
  async handleFapshiWebhook(@Body() body: any, @Res() res: Response) {
    console.log('triggered');
    try {
      await this.paymentService.processWebhookEvent(body);
      return res.send();
    } catch (error) {
      // Error logging would be handled in the service
      return res.status(500).send();
    }
  }
}
