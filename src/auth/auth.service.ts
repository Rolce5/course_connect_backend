import { ForbiddenException, Injectable } from '@nestjs/common';
import { AuthDto } from './dto';
import { PrismaService } from '../prisma/prisma.service';
import * as argon from 'argon2';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
  ) {}

  async login(dto: LoginDto) {
    // Find user by email
    const user = await this.prisma.user.findUnique({
      where: {
        email: dto.email,
      },
    });

    if (!user) throw new ForbiddenException('Invalid Credentials');

    // Compare hashed password with provided password
    const pwdMatches = await argon.verify(user.password, dto.password);

    if (!pwdMatches) throw new ForbiddenException('Invalid Credentials');

    // Return the token and role
    return this.signTokens(user.id, user.email, user.role);
  }

  async signUp(dto: AuthDto) {
    // Generate the password hash
    const hash = await argon.hash(dto.password);

    try {
      const user = await this.prisma.user.create({
        data: {
          email: dto.email,
          first_name: dto.firstName,
          last_name: dto.lastName,
          password: hash,
          role: dto.role, // Save the selected role
        },
      });

      // Return the token and role
      return this.signTokens(user.id, user.email, user.role);
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new ForbiddenException('Email already taken');
        }
      }
      throw error;
    }
  }

  async signTokens(
    userId: number,
    email: string,
    role: string,
  ): Promise<{ access_token: string; refresh_token: string; role: string }> {
    const payload = {
      sub: userId,
      email,
      role,
    };

    const secret = this.config.get('JWT_SECRET');
    const refreshSecret = this.config.get('JWT_REFRESH_SECRET'); // New secret for refresh tokens

    const accessToken = await this.jwt.signAsync(payload, {
      expiresIn: '15m',
      secret: secret,
    });

    const refreshToken = await this.jwt.signAsync(payload, {
      expiresIn: '7d', // Refresh token expires in 7 days
      secret: refreshSecret, // Use a different secret for the refresh token
    });

    return {
      access_token: accessToken,
      refresh_token: refreshToken, // Return refresh token
      role: role, // Include the role in the response
    };
  }

    // Refresh Access Token using the Refresh Token
  async refreshToken(refreshToken: string) {
    try {
      const payload = await this.jwt.verifyAsync(refreshToken, {
        secret: this.config.get('JWT_REFRESH_SECRET'),
      });

      // Find user by id
      const user = await this.prisma.user.findUnique({
        where: {
          id: payload.sub,
        },
      });

      if (!user) {
        throw new ForbiddenException('User not found');
      }

      // Generate a new access token
      return this.signTokens(user.id, user.email, user.role);
    } catch (error) {
      throw new ForbiddenException('Invalid or expired refresh token');
    }
  }
}

