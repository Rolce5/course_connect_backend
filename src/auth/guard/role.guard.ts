// src/auth/guard/role.guard.ts
import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Observable } from 'rxjs';
import { JwtService } from '@nestjs/jwt';
import { JwtGuard } from './jwt.guard'; // Import your existing JwtGuard
import { Role } from '@prisma/client'; // Assuming you have the Role enum in Prisma schema or wherever it's defined

@Injectable()
export class RoleGuard implements CanActivate {
  constructor(private jwtService: JwtService) {}

  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user; // The user is attached to the request by JwtGuard

    // Check if user has an admin role
    if (user.role === Role.ADMIN  || user.role === Role.INSTRUCTOR) {
      return true; // Allow access if the user is an admin
    }

    return false; // Deny access if the user is not an admin
  }
}
