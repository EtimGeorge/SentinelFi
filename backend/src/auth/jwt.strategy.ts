import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, ExtractJwt } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserEntity } from './user.entity';
import { Request } from 'express'; // <-- New Import for Request object

// Utility function to extract the JWT from the cookie
const cookieExtractor = (req: Request) => {
  let token = null;
  if (req && req.cookies) {
    // CRITICAL: Look for the 'access_token' cookie set by the AuthController
    token = req.cookies['access_token']; 
  }
  return token;
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    @InjectRepository(UserEntity)
    private usersRepository: Repository<UserEntity>,
  ) {
    const secret = configService.get<string>('JWT_SECRET_KEY');
    if (!secret) {
      throw new Error('JWT_SECRET_KEY is not defined in the environment. Cannot start JWT Strategy.');
    }
    
    super({
      // CRITICAL FIX: Extract the JWT from the cookie instead of the header
      jwtFromRequest: cookieExtractor, 
      ignoreExpiration: false,
      secretOrKey: secret, 
    });
  }

  async validate(payload: any) {
    const user = await this.usersRepository.findOne({ 
      where: { id: payload.sub, is_active: true },
      select: ['id', 'email', 'role'], 
    });

    if (!user) {
      throw new UnauthorizedException('User no longer active or token invalid.');
    }

    return { 
      id: user.id, 
      email: user.email, 
      role: user.role 
    };
  }
}
