import {
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { createCourseDto, editCourseDto } from './dto';
import { PrismaService } from 'src/prisma/prisma.service';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto'; // Add crypto module
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';

@Injectable()
export class CourseService {
  constructor(
    private prisma: PrismaService,
    private readonly cloudinary: CloudinaryService,
  ) {}

  // Fetch courses along with the user (instructor) information
  async getAllCourses(instructorId: number, role: string) {
    const baseQuery = {
      include: {
        instructor: true,
        enrollments: true,
      },
    };

    const roleQueryMap = {
      ADMIN: {},
      STUDENT: { where: { is_active: true } },
      INSTRUCTOR: { where: { instructor_id: instructorId } },
    };

    if (!(role in roleQueryMap)) {
      throw new ForbiddenException('Access to resource denied');
    }

    return this.prisma.course.findMany({
      ...baseQuery,
      ...roleQueryMap[role],
    });
  }

  async createCourse(
    instructorId: number,
    dto: createCourseDto,
    imageFile?: Express.Multer.File, // Make imageFile optional
    videoFile?: Express.Multer.File, // Make videoFile optional
  ) {
    try {
      let imageUrl: string | undefined;
      let videoUrl: string | undefined;

      // Upload image to Cloudinary (if provided)
      if (imageFile) {
        const imageUploadResponse =
          await this.cloudinary.uploadImage(imageFile);
        imageUrl = imageUploadResponse?.secure_url; // Use optional chaining
      }

      // Upload video to Cloudinary (if provided)
      if (videoFile) {
        const videoUploadResponse =
          await this.cloudinary.uploadVideo(videoFile);
        videoUrl = videoUploadResponse?.secure_url; // Use optional chaining
      }

      // Create the course with the provided data
      const course = await this.prisma.course.create({
        data: {
          instructor_id: instructorId,
          imageUrl,
          videoUrl,
          short_description: dto.shortDescription,
          total_hours: dto.totalHours,
          is_active: dto.isActive,
          title: dto.title,
          description: dto.description,
          category: dto.category,
          difficulty: dto.difficulty,
          pricing: dto.pricing === undefined ? null : dto.pricing,
          original_price:
            dto.originalPrice === undefined ? null : dto.originalPrice,
          duration: dto.duration,
          // videoUrl: dto.videoUrl
        },
      });

      return course;
    } catch (error) {
      console.error('Error in createCourse:', error);
      throw new InternalServerErrorException('Failed to create course');
    }
  }

  async getCourseById(instructorId: number, courseId: number) {
    const course = await this.prisma.course.findUnique({
      where: {
        id: courseId,
      },
      include: {
        instructor: true,
        modules: {
          include: {
            lessons: true,
          },
        },
        learningOutcomes: true,
        requirements: true,
        enrollments: true,
        reviews: true,
      },
    });

    // If course is not found, throw an exception
    if (!course) {
      throw new NotFoundException(`Course with ID ${courseId} not found`);
    }

    // Return the course data
    return course;
  }

  // async getCourseWithLessons(userId: number, courseId: number, role: string) {

  //  // Check if the user is a student and only then check for enrollment
  // let isEnrolled = false;

  // if (role === 'STUDENT') {
  //   // Check if the student is enrolled in the course
  //   isEnrolled = await this.prisma.enrollment.findUnique({
  //     where: {
  //       userId_courseId: {
  //         userId,
  //         courseId,
  //       },
  //     },
  //   }) !== null;
  // }

  //   const course = await this.prisma.course.findUnique({
  //     where: {
  //       id: courseId,
  //     },
  //     include: {
  //       instructor: true,
  //       modules: {
  //         include: {
  //           lessons: {
  //             select: {
  //               id: true,
  //               title: true,
  //               description: true,
  //               duration: true,
  //               order: true,
  //               // Only include videoUrl if the user is enrolled or is an instructor
  //             videoUrl: (role === 'STUDENT' && !isEnrolled) ? false : true,

  //             }
  //           },
  //       },
  //     },
  //       learningOutcomes: true,
  //       requirements: true,
  //       enrollments: true,
  //       reviews: true,
  //     },
  //   });

  //   // Calculate the number of courses the instructor is associated with
  //   const instructorCourses = await this.prisma.course.count({
  //     where: {
  //       instructorId: course?.instructorId, // Get the courses of the current course's instructor
  //     },
  //   });

  //   const instructorStudents = await this.prisma.enrollment.count({
  //     where: {
  //       userId: course?.instructorId, // Get the courses of the current course's instructor
  //     },
  //   });

  //   // Calculate the number of students enrolled in this course
  //   const numberOfStudents = course?.enrollments.length ?? 0;

  //   return {
  //     ...course,
  //     instructorCourses, // Number of courses the instructor has
  //     numberOfStudents, // Number of students enrolled in this course
  //     isEnrolled: !!isEnrolled // Add enrollment status to response
  //   };
  // }
  async getCourseWithLessons(userId: number, courseId: number, role: string) {
    // Check enrollment status for students
    let isEnrolled = false;
    let enrollment: { status?: string } | null = null;

    if (role === 'STUDENT') {
      enrollment = await this.prisma.enrollment.findUnique({
        where: {
          user_id_course_id: {
            user_id: userId,
            course_id: courseId,
          },
        },
      });
      isEnrolled = enrollment !== null;
    }

    const shouldIncludeQuiz =
      role === 'INSTRUCTOR' || role === 'ADMIN' || isEnrolled;

    const course = await this.prisma.course.findUnique({
      where: {
        id: courseId,
      },
      include: {
        instructor: true,
        modules: {
          include: {
            lessons: {
              select: {
                id: true,
                title: true,
                content: true,
                description: true,
                duration: true,
                order: true,
                videoUrl: role === 'STUDENT' && !isEnrolled ? false : true,
                quiz: shouldIncludeQuiz
                  ? {
                      include: {
                        questions: {
                          include: {
                            options: {
                              select: {
                                id: true,
                                option_text: true,
                                // Only expose correct answers to instructors/admins
                                is_correct:
                                  role === 'INSTRUCTOR' || role === 'ADMIN',
                              },
                            },
                          },
                        },
                      },
                    }
                  : false,
              },
              orderBy: {
                order: 'asc',
              },
            },
          },
          orderBy: {
            order: 'asc',
          },
        },
        learningOutcomes: true,
        requirements: true,
        enrollments: true,
        reviews: true,
      },
    });

    // Calculate instructor metrics
    const [instructorCourses, instructorStudents] = await Promise.all([
      this.prisma.course.count({
        where: {
          instructor_id: course?.instructor_id,
        },
      }),
      this.prisma.enrollment.count({
        where: {
          course: {
            instructor_id: course?.instructor_id,
          },
        },
      }),
    ]);

    const numberOfStudents = course?.enrollments.length ?? 0;

    return {
      ...course,
      instructorCourses,
      instructorStudents,
      numberOfStudents,
      isEnrolled,
      enrollmentStatus: enrollment?.status || null,
    };
  }

  // Edit a course by its ID and update image if provided
  async editCourseById(
    instructorId: number,
    courseId: number,
    dto: editCourseDto,
    image?: Express.Multer.File, // Make imageFile optional
    video?: Express.Multer.File, // Make videoFile optional
  ) {
    // Get the course by its ID
    const course = await this.prisma.course.findUnique({
      where: {
        id: courseId,
      },
    });

    // Check if the user is the owner of the course
    if (!course || course.instructor_id !== instructorId)
      throw new ForbiddenException('Access to resource denied');

    let imageUrl = course.imageUrl;
    let videoUrl = course.videoUrl;

    // Update the image if a new one is provided
    if (image) {
      // Upload the new image to Cloudinary
      const imageUploadResponse = await this.cloudinary.uploadImage(image);
      imageUrl = imageUploadResponse?.secure_url ?? null; // Get the secure URL of the new image

      // Delete the old image from Cloudinary if it exists
      if (course.imageUrl) {
        const publicId = course.imageUrl.split('/').pop()?.split('.')[0]; // Extract publicId from the URL
        if (publicId) {
          await this.cloudinary.deleteFile(publicId, 'image'); // Delete the old image from Cloudinary
        }
      }
    }

    // Update the video if a new one is provided
    if (video) {
      // Upload the new video to Cloudinary
      const videoUploadResponse = await this.cloudinary.uploadVideo(video);
      videoUrl = videoUploadResponse?.secure_url ?? null; // Get the secure URL of the new video

      // Delete the course video from Cloudinary if it exists
      if (course.videoUrl) {
        const publicId = course.videoUrl.split('/').pop()?.split('.')[0]; // Extract publicId from the URL
        if (publicId) {
          await this.cloudinary.deleteFile(publicId, 'video'); // Delete the old video from Cloudinary
        }
      }
    }

    // Update the course in the database
    return this.prisma.course.update({
      where: {
        id: courseId,
      },
      data: {
        instructor_id: instructorId,
        imageUrl,
        videoUrl,
        short_description: dto.shortDescription,
        total_hours: dto.totalHours,
        is_active: dto.isActive,
        title: dto.title,
        description: dto.description,
        category: dto.category,
        difficulty: dto.difficulty,
        pricing: dto.pricing === undefined ? null : dto.pricing,
        original_price:
          dto.originalPrice === undefined ? null : dto.originalPrice,
        duration: dto.duration,
      },
    });
  }

  // Delete a course by its ID
  async deleteCourseById(instructorId: number, courseId: number) {
    const course = await this.prisma.course.findUnique({
      where: {
        id: courseId,
      },
      include: {
        modules: {
          include: {
            lessons: true,
          },
        },
      },
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    // Check if the user is the owner of the course
    if (course.instructor_id !== instructorId)
      throw new ForbiddenException('Access to resource denied');

    // Delete the course image from Cloudinary if it exists
    if (course.imageUrl) {
      const publicId = course.imageUrl.split('/').pop()?.split('.')[0]; // Extract publicId from the URL
      if (publicId) {
        await this.cloudinary.deleteFile(publicId, 'image'); // Delete the image from Cloudinary
      }
    }

    // Delete the course video from Cloudinary if it exists
    if (course.videoUrl) {
      const publicId = course.videoUrl.split('/').pop()?.split('.')[0]; // Extract publicId from the URL
      if (publicId) {
        await this.cloudinary.deleteFile(publicId, 'video'); // Delete the image from Cloudinary
      }
    }

    // Delete lesson videos from Cloudinary
    for (const module of course.modules) {
      for (const lesson of module.lessons) {
        if (lesson.videoUrl) {
          const videoPublicId = this.extractPublicIdFromUrl(lesson.videoUrl);
          try {
            // Delete the video from Cloudinary
            await this.cloudinary.deleteFile(videoPublicId, 'video');
            console.log(
              `Video for lesson ${lesson.id} deleted from Cloudinary`,
            );
          } catch (error) {
            console.error(
              `Error deleting video for lesson ${lesson.id}:`,
              error,
            );
          }
        }
      }
    }
    try {
      // Wrap all operations in a transaction
      await this.prisma.$transaction(async (prisma) => {
        // 1. First delete lessons (deepest dependency)
        await prisma.lesson.deleteMany({
          where: {
            module_id: {
              in: (
                await prisma.module.findMany({
                  where: { course_id: courseId },
                  select: { id: true },
                })
              ).map((module) => module.id),
            },
          },
        });

        // 2. Then delete modules
        await prisma.module.deleteMany({
          where: { course_id: courseId },
        });

        // 3. Delete other course dependencies (add as needed)
        await prisma.enrollment.deleteMany({ where: { course_id: courseId } });
        await prisma.review.deleteMany({ where: { course_id: courseId } });
        await prisma.certificate.deleteMany({ where: { course_id: courseId } });

        // 4. Finally delete the course
        await prisma.course.delete({
          where: { id: courseId },
        });
      });

      return {
        success: true,
        message: 'Course and all associated data deleted successfully',
      };
    } catch (error) {
      console.error('Failed to delete course:', error);
      return {
        success: false,
        message: `Failed to delete course: ${error.message}`,
      };
    }
  }

  private extractPublicIdFromUrl(url: string): string {
    const regex = /\/v\d+\/(.+?)\./;
    const match = url.match(regex);
    if (match) {
      return match[1];
    }
    throw new InternalServerErrorException('Invalid Cloudinary URL format');
  }
}
