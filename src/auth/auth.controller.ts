import { Body, Controller, ForbiddenException, HttpCode, HttpStatus, Post, Req } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { Request } from "express";
import { AuthDto } from "./dto";
import { LoginDto } from "./dto/login.dto";

@Controller('api/auth')
export class AuthController{
    constructor(private authService: AuthService) {}

    @Post('signup')
    signup(@Body() dto: AuthDto) {
    
        return this.authService.signUp(dto)
    }

    @HttpCode(HttpStatus.OK)
    @Post('signin')
    signin(@Body() dto: LoginDto ) {
        return this.authService.login(dto)
    }

    @Post('refresh')
    async refreshToken(@Body('refresh_token') refreshToken: string) {
      if (!refreshToken) {
        throw new ForbiddenException('Refresh token not provided');
      }
      return this.authService.refreshToken(refreshToken);
    }

   
}