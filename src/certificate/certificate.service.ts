import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';
import { PrismaService } from 'src/prisma/prisma.service';
const PDFDocument = require('pdfkit');

@Injectable()
export class CertificateService {
  constructor(
    private prisma: PrismaService,
    private cloudinary: CloudinaryService,
  ) {}

  async generateCertificate(userId: number, courseId: number) {
    try {
      // Check if certificate already exists
      const existingCert = await this.prisma.certificate.findFirst({
        where: { user_id: userId, course_id: courseId },
      });

      if (existingCert) {
        return existingCert;
      }

      // Get user and course details
      const [user, course] = await Promise.all([
        this.prisma.user.findUnique({
          where: { id: userId },
          select: { id: true, first_name: true, last_name: true, email: true },
        }),
        this.prisma.course.findUnique({
          where: { id: courseId },
          select: {
            id: true,
            title: true,
            instructor: {
              select: {
                first_name: true,
                last_name: true,
              },
            },
            duration: true,
          },
          //   include: { instructor: true },
        }),
      ]);

      if (!user || !course) {
        throw new Error('User or course not found');
      }

      // Generate certificate data
      const certificateNumber = this.generateCertificateNumber();
      const verificationCode = this.generateVerificationCode();
      const completionDate = new Date();

      // Create PDF certificate
      const pdfBuffer = await this.generatePdfBuffer({
        userName: `${user.first_name} ${user.last_name}`,
        courseName: course.title,
        instructorName: `${course.instructor.first_name} ${course.instructor.last_name}`,
        courseDuration: course.duration,
        certificateNumber,
        completionDate,
      });

      // Upload to Cloudinary as raw file
      const uploadResponse = await this.cloudinary.uploadRawFile(
        pdfBuffer,
        `certificates/${userId}/${courseId}/${certificateNumber}`,
      );

      if (!uploadResponse?.secure_url) {
        throw new Error('Failed to upload certificate to Cloudinary');
      }

      // Create certificate record
      const certificate = await this.prisma.certificate.create({
        data: {
          user_id: userId,
          course_id: courseId,
          certificate_number: certificateNumber,
          verification_code: verificationCode,
          download_url: uploadResponse.secure_url,
          awarded_at: completionDate,
        },
        include: {
          user: { select: { first_name: true, last_name: true } },
          course: { select: { title: true } },
        },
      });

      return certificate;
    } catch (error) {
      console.error('Certificate generation failed:', error);
      throw new InternalServerErrorException('Failed to generate certificate');
    }
  }

  private async generatePdfBuffer(data: {
    userName: string;
    courseName: string;
    instructorName: string;
    courseDuration: number;
    certificateNumber: string;
    completionDate: Date;
  }): Promise<Buffer> {
    const PDFDocument = require('pdfkit');
    const buffers: Buffer[] = [];

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({
        size: 'A4',
        layout: 'landscape',
      });

      // Pipe PDF data into buffer array
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);

      // Certificate background
      doc.rect(0, 0, doc.page.width, doc.page.height).fill('#f8f9fa');

      // Decorative border
      doc
        .strokeColor('#343a40')
        .lineWidth(15)
        .roundedRect(40, 40, doc.page.width - 80, doc.page.height - 80, 20)
        .stroke();

      // Header
      doc
        .fillColor('#212529')
        .fontSize(36)
        .font('Helvetica-Bold')
        .text('Certificate of Completion', { align: 'center', y: 100 })
        .moveDown(1.5);

      // Body Text
      doc
        .fontSize(18)
        .fillColor('#495057')
        .text('This is to certify that', { align: 'center' })
        .moveDown(1);

      doc
        .fontSize(28)
        .fillColor('#212529')
        .font('Helvetica-Bold')
        .text(data.userName, { align: 'center' })
        .moveDown(1);

      doc
        .fontSize(18)
        .fillColor('#495057')
        .text('has successfully completed the course', { align: 'center' })
        .moveDown(1);

      doc
        .fontSize(24)
        .fillColor('#212529')
        .font('Helvetica-Bold')
        .text(`"${data.courseName}"`, { align: 'center' })
        .moveDown(2);

      // Footer Details
      doc
        .fontSize(14)
        .fillColor('#6c757d')
        .text(`Instructor: ${data.instructorName}`, { align: 'center' })
        .moveDown(0.5);

      doc
        .text(`Duration: ${data.courseDuration} hours`, { align: 'center' })
        .moveDown(0.5);

      doc
        .text(
          `Completed on: ${data.completionDate.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}`,
          { align: 'center' },
        )
        .moveDown(1.5);

      // Certificate ID
      doc
        .fontSize(12)
        .text(`Certificate ID: ${data.certificateNumber}`, { align: 'center' });

      // Finalize PDF
      doc.end();
    });
  }

  private generateCertificateNumber(): string {
    const date = new Date();
    return `CERT-${date.getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;
  }

  private generateVerificationCode(): string {
    return require('crypto').randomBytes(16).toString('hex');
  }

  async verifyCertificate(code: string) {
    return this.prisma.certificate.findUnique({
      where: { verification_code: code },
      include: {
        user: { select: { first_name: true, last_name: true } },
        course: { select: { title: true } },
      },
    });
  }

  async getCertificate(certificateId: number) {
    return this.prisma.certificate.findUnique({
      where: { id: certificateId },
      include: {
        user: { select: { first_name: true, last_name: true } },
        course: { select: { title: true } },
      },
    });
  }

  async deleteCertificate(certificateId: number) {
    const certificate = await this.prisma.certificate.findUnique({
      where: { id: certificateId },
    });

    if (!certificate) {
      throw new Error('Certificate not found');
    }

    // Delete from Cloudinary
    if (certificate.download_url) {
      const publicId = this.extractPublicIdFromUrl(certificate.download_url);
      await this.cloudinary.deleteFile(publicId, 'raw');
    }

    // Delete from database
    return this.prisma.certificate.delete({
      where: { id: certificateId },
    });
  }

  private extractPublicIdFromUrl(url: string): string {
    const parts = url.split('/');
    const filename = parts[parts.length - 1];
    return filename.split('.')[0];
  }
}
