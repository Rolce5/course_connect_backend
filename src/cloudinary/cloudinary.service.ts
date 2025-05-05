import { Injectable } from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryResponse } from './cloudinary-response';
import { Readable } from 'stream';

@Injectable()
export class CloudinaryService {
  constructor() {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });
  }

  async uploadImage(
    file: Express.Multer.File | undefined,
  ): Promise<CloudinaryResponse | undefined> {
    if (!file) {
      return undefined; // Return undefined if no file is provided
    }

    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { resource_type: 'auto' },
        (error, result) => {
          if (error) return reject(error);
          if (!result)
            return reject(
              new Error('Upload failed: No result returned from Cloudinary'),
            );
          resolve(result);
        },
      );

      Readable.from(file.buffer).pipe(uploadStream);
    });
  }

  async uploadVideo(
    file: Express.Multer.File | undefined,
  ): Promise<CloudinaryResponse | undefined> {
    if (!file) {
      return undefined; // Return undefined if no file is provided
    }

    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { resource_type: 'video' },
        (error, result) => {
          if (error) return reject(error);
          if (!result)
            return reject(
              new Error('Upload failed: No result returned from Cloudinary'),
            );
          resolve(result);
        },
      );

      Readable.from(file.buffer).pipe(uploadStream);
    });
  }

  async uploadRawFile(
    buffer: Buffer,
    publicId: string,
  ): Promise<CloudinaryResponse | undefined> {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          resource_type: 'raw',
          public_id: publicId,
          format: 'pdf',
          type: 'authenticated',
          tags: ['certificate'],
        },
        (error, result) => {
          if (error) return reject(error);
          if (!result) return reject(new Error('Upload failed'));
          resolve(result);
        },
      );

      Readable.from(buffer).pipe(uploadStream);
    });
  }

  async deleteFile(
    publicId: string,
    resourceType: 'image' | 'video' | 'raw',
  ): Promise<void> {
    await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType,
    });
  }
}