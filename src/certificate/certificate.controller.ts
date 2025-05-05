import { Controller, Get, NotFoundException, Param, Post, Res, UseGuards } from '@nestjs/common';
import { CertificateService } from './certificate.service';
import { GetUser } from 'src/auth/decorator';
import { JwtGuard } from 'src/auth/guard';

@Controller('api/certificates')
export class CertificateController {
  constructor(private certificateService: CertificateService) {}

    @Get('course/:courseId')
    async getCertificate(
      @GetUser('id') userId: number,
      @Param('courseId') courseId: string,
    ) {
      return this.certificateService.generateCertificate(
        userId,
        parseInt(courseId),
      );
    }

//     @UseGuards(JwtGuard)
//   @Get('user/:userId')
//   async getUserCertificates(@Param('userId') userId: string) {
//     return this.prisma.certificate.findMany({
//       where: { user_id: parseInt(userId) },
//       include: { course: { select: { title: true } } },
//     });
//   }

    @Get(':id')
    async getCertificateById(@Param('id') id: string) {
      return this.certificateService.getCertificate(parseInt(id));
    }
  @UseGuards(JwtGuard)
  @Post('course/:courseId')
  async generateCertificate(
    @GetUser('id') userId: number,
    @Param('courseId') courseId: string,
  ) {
    return this.certificateService.generateCertificate(
      userId,
      parseInt(courseId),
    );
  }

  @Get('verify/:code')
  async verifyCertificate(@Param('code') code: string) {
    return this.certificateService.verifyCertificate(code);
  }

  //   @UseGuards(JwtGuard)
  //   @Get('download/:certificateId')
  //   async downloadCertificate(
  //     @Param('certificateId') certificateId: string,
  //     @Res() res: Response,
  //   ) {
  //     const certificate = await this.certificateService.getCertificate(
  //       parseInt(certificateId),
  //     );

  //     if (!certificate?.download_url) {
  //       throw new Error('Certificate PDF not available');
  //     }

  //     // Redirect to Cloudinary URL
  //     res.redirect(certificate.download_url);
  //   }
  @Get('download/:certificateId')
  async downloadCertificate(
    @Param('certificateId') certificateId: string,
    @Res({ passthrough: true }) res: Response, // Add passthrough
  ) {
    const certificate = await this.certificateService.getCertificate(
      parseInt(certificateId),
    );

    if (!certificate?.download_url) {
      throw new NotFoundException('Certificate not found');
    }

    return { url: certificate.download_url };
  }

}
