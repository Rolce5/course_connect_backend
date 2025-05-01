import { HttpException, HttpStatus } from '@nestjs/common';

export class PaymentRequiredException extends HttpException {
  constructor(
    message: string,
    public readonly paymentDetails?: any
  ) {
    super(message, HttpStatus.PAYMENT_REQUIRED);
    this.paymentDetails = paymentDetails;
  }
}