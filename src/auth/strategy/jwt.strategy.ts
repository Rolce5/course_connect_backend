import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { PrismaService } from "../../prisma/prisma.service";


@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
    constructor(config: ConfigService, private prisma: PrismaService) {
        const jwtSecret = config.get('JWT_SECRET');
        if (!jwtSecret) {
            throw new Error('JWT_SECRET is not defined in the configuration');
        }

        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            secretOrKey: jwtSecret,
        });
    }

    // Implement the validate method
    async validate(payload: {sub: number; email: string;}) {
        const user = await this.prisma.user.findUnique({
            where: {
                id: payload.sub
            }
        });
        if (!user) {
            throw new UnauthorizedException('User not found or token expired'); // Custom error message
          }
      
          return user;
      
        // delete user.password;
        // Return user details from JWT payload
        // return user;
        // return { userId: payload.sub, username: payload.username };
    }
}
