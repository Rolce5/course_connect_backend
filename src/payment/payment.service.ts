import {
  ForbiddenException,
  HttpStatus,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { AxiosResponse } from 'axios';
import { catchError } from 'rxjs/operators';
import { lastValueFrom, throwError } from 'rxjs';
import { PrismaService } from 'src/prisma/prisma.service';
import { Response } from 'express';

@Injectable()
export class PaymentService {
  private readonly headers = {
    apiuser: process.env.FAPSHI_PUBLIC_KEY,
    apikey: process.env.FAPSHI_SECRET_KEY,
  };

  private readonly logger = new Logger(PaymentService.name);

  constructor(
    private prisma: PrismaService,
    private readonly httpService: HttpService,
  ) {}

  // Error handler
  private handleError(e: any) {
    return {
      message: e?.response?.data?.message || 'An error occurred',
      statusCode: e?.response?.status || 500,
    };
  }

  async getAllPayments(page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;

    const [payments, totalCount] = await Promise.all([
      this.prisma.payment.findMany({
        skip,
        take: limit,
        include: {
          user: { select: { first_name: true, last_name: true } },
          course: { select: { title: true } },
          paymentHistory: { orderBy: { created_at: 'desc' } },
        },
        orderBy: { created_at: 'desc' },
      }),
      this.prisma.payment.count()
    ]);

    return {
      data: payments,
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

  // Function to initiate payment for a course
  async initiatePayment(courseId: number, user: any): Promise<any> {
    const course = await this.prisma.course.findUnique({
      where: {
        id: courseId,
      },
    });
    if (!course) {
      console.log('❌ Course not found');
      throw new NotFoundException('Course not found');
    }

    if (course.pricing == null || course.pricing <= 0) {
      console.log('❌ Invalid pricing');
      return { message: 'Invalid course price', statusCode: 400 };
    }

    const amount = course.pricing ?? 0;

    const transactionId = `tx_${Date.now()}`;
    // Create the payment record
    const payment = await this.prisma.payment.create({
      data: {
        user_id: user.id,
        course_id: courseId,
        transaction_id: transactionId,
        amount: amount,
        status: 'pending',
      },
    });

    // Create initial payment history record
    await this.prisma.paymentHistory.create({
      data: {
        payment_id: payment.id,
        status: 'pending',
        amount: amount,
      },
    });

    const paymentData = {
      amount: course.pricing,
      email: user.email,
      userId: user.id,
      externalId: transactionId,
      redirectUrl: `${process.env.FRONTEND_URL}/courses/${course.id}`,
      message: `Payment for course <strong>${course.title}</strong>`,
      currency: 'XAF', // add this if required
      name: 'tita', // Include user's first name
    };

    try {
      const response: AxiosResponse = await lastValueFrom(
        this.httpService
          .post(`${process.env.BASE_URL}/initiate-pay`, paymentData, {
            headers: this.headers,
          })
          .pipe(catchError((err) => throwError(() => this.handleError(err)))),
      );

      response.data.statusCode = response.status;
      return response.data;
    } catch (e) {
      console.error('🔥 Error caught:', e);
      return this.handleError(e);
    }
  }

  async verifyPayment(transactionId: string): Promise<any> {
    // 1. Find the payment with user and course relations
    const payment = await this.prisma.payment.findUnique({
      where: { transaction_id: transactionId },
      include: { user: true, course: true },
    });

    if (!payment) throw new NotFoundException('Payment not found');
    console.log('Method hit');
    try {
      // 2. Verify payment with Fapshi
      const response = await lastValueFrom(
        this.httpService
          .get(`${process.env.BASE_URL}/payment-status/${transactionId}`, {
            headers: this.headers,
          })
          .pipe(catchError((err) => throwError(() => this.handleError(err)))),
      );

      // 3. Check if payment was successful
      if (response.data.status === 'SUCCESSFUL') {
        // Start a transaction to ensure both operations succeed or fail together
        return await this.prisma.$transaction(async (prisma) => {
          // 4. Update payment status
          await prisma.payment.update({
            where: { transaction_id: transactionId },
            data: { status: 'SUCCESSFUL' },
          });

          // 5. Check if enrollment already exists
          const existingEnrollment = await prisma.enrollment.findFirst({
            where: {
              user_id: payment.user_id,
              course_id: payment.course_id,
            },
          });

          // 6. Create enrollment if it doesn't exist
          if (!existingEnrollment) {
            await prisma.enrollment.create({
              data: {
                user_id: payment.user_id,
                course_id: payment.course_id,
                status: 'IN_PROGRESS',
                progress: 0,
              },
            });
          }

          return {
            success: true,
            message: 'Payment verified and enrollment processed',
            courseId: payment.course_id,
          };
        });
      } else {
        throw new ForbiddenException('Payment not successful');
      }
    } catch (error) {
      console.error('Payment verification failed:', error);
      throw error;
    }
  }

  async verifyTransaction(transactionId: string): Promise<any> {
    try {
      const response: AxiosResponse = await lastValueFrom(
        this.httpService
          .get(`${process.env.BASE_URL}/payment-status/${transactionId}`, {
            headers: this.headers,
          })
          .pipe(catchError((err) => throwError(() => this.handleError(err)))),
      );

      return {
        ...response.data,
        statusCode: response.status,
      };
    } catch (error) {
      this.logger.error(`Transaction verification failed: ${error.message}`);
      throw error;
    }
  }

  async processWebhookEvent(webhookData: any): Promise<void> {
    // Verify the transaction first
    const event = await this.getPaymentStatus(webhookData.transId);

    if (event.statusCode !== 200) {
      this.logger.error(`Invalid transaction status: ${event.message}`);
      throw new Error(`Transaction verification failed: ${event.message}`);
    }

    // Handle based on status
    switch (event.status) {
      case 'SUCCESSFUL':
        await this.handleSuccessfulPayment(event);
        break;
      case 'FAILED':
        await this.handleFailedPayment(event);
        break;
      case 'EXPIRED':
        await this.handleExpiredPayment(event);
        break;
      default:
        this.logger.warn(`Unhandled payment status: ${event.status}`);
    }
  }

  private async getPaymentStatus(transactionId: string): Promise<any> {
    // ... existing implementation ...
  }

  private async handleSuccessfulPayment(event: any): Promise<void> {
    // ... existing implementation ...
  }

  private async handleFailedPayment(event: any): Promise<void> {
    // ... existing implementation ...
  }

  private async handleExpiredPayment(event: any): Promise<void> {
    // ... existing implementation ...
  }
}
