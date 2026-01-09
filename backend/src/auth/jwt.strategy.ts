import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt'; // Import ExtractJwt
import { ConfigService } from '@nestjs/config';
import { DataSource, Repository } from 'typeorm';
import { UserEntity } from '../auth/user.entity'; // Corrected import path
import { JwtPayload, UserPayload } from '../common/interfaces/request.interface';
import { Request } from 'express';

const cookieExtractor = (req: Request): string | null => {
  const logger = new Logger('CookieExtractor');
  let token = null;

  if (req && req.cookies) {
    token = req.cookies['access_token'];
    if (token) {
      logger.log('[Extract] ✅ JWT token found in `access_token` cookie.');
    } else {
      logger.log('[Extract] 🟡 No `access_token` cookie found, will check Authorization header next.');
    }
  } else {
    logger.warn('[Extract] ⚠️ No `req.cookies` object found on the request. This is unexpected.');
  }
  
  return token;
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private usersRepository: Repository<UserEntity>;
  private readonly logger = new Logger(JwtStrategy.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly dataSource: DataSource,
  ) {
    const secret = configService.get<string>('JWT_SECRET_KEY');
    
    // Log configuration (without exposing full secret)
    const logger = new Logger('JwtStrategy:Constructor');
    logger.log(`JWT Secret configured: ${secret ? 'YES (length: ' + secret.length + ')' : 'NO - CRITICAL ERROR'}`);
    
    // CRITICAL FIX: Ensure 'secret' is not undefined by asserting it with '!'
    if (!secret) {
      logger.error('CRITICAL: JWT_SECRET_KEY is not configured!');
      throw new Error('JWT_SECRET_KEY is not defined. Cannot start JWT Strategy.');
    }

    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        cookieExtractor,
        ExtractJwt.fromAuthHeaderAsBearerToken(), // Fallback to Authorization header
      ]),
      ignoreExpiration: false,
      secretOrKey: secret, // Use the non-nullable secret
    });

    this.usersRepository = this.dataSource.getRepository(UserEntity);
  }

  async validate(payload: JwtPayload): Promise<UserPayload> {
    this.logger.log(`[Validate] Called with payload: ${JSON.stringify({
      sub: payload.sub,
      email: payload.email,
      role: payload.role,
      tenant_id: payload.tenant_id,
      has_tenant: !!payload.tenant_id,
    })}`);

    if (!payload.sub) {
      this.logger.error('[Validate] Missing sub (user ID) in JWT payload');
      throw new UnauthorizedException('Invalid token: missing user ID');
    }

    try {
      const user = await this.usersRepository.findOne({
        where: { id: payload.sub, is_active: true },
        select: ['id', 'email', 'role', 'tenant_id'],
      });

      if (!user) {
        this.logger.warn(`[Validate] User not found or inactive for sub: ${payload.sub}`);
        throw new UnauthorizedException('User no longer active or token invalid.');
      }

      this.logger.log(`[Validate] User found in DB: ${JSON.stringify({
        id: user.id,
        email: user.email,
        role: user.role,
        tenant_id: user.tenant_id,
        has_tenant: !!user.tenant_id,
      })}`);

      const userPayloadToReturn: UserPayload = {
        id: user.id,
        email: user.email,
        role: user.role,
        tenant_id: user.tenant_id,
      };

      this.logger.log(`[Validate] Returning user payload with tenant_id: ${userPayloadToReturn.tenant_id}`);
      
      return userPayloadToReturn;
    } catch (error: unknown) { // Add explicit type annotation to catch
        if (error instanceof Error) {
            this.logger.error(`[Validate] Error during validation: ${error.message}`, error.stack);
        } else {
            this.logger.error(`[Validate] Unknown error during validation: ${JSON.stringify(error)}`);
        }
      throw new UnauthorizedException('Token validation failed');
    }
  }
}
