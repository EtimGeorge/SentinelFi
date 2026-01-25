import { Injectable, UnauthorizedException, Logger } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { ConfigService } from "@nestjs/config";
import { DataSource, Repository } from "typeorm";
import { UserEntity } from './user.entity';
import { UserPayload, JwtPayload, SimpleRole } from "@shared/types/user";
import { Request } from "express";
import { Role } from "@shared/types/role.enum"; // Import Role
import { CorrelatedLogger } from 'common/logger/correlated-logger'; // NEW IMPORT

const cookieExtractor = (req: Request): string | null => {
  const logger = new CorrelatedLogger("CookieExtractor"); // CHANGED LINE
  let token = null;

  if (req && req.cookies) {
    logger.debug(`[Extract] Request cookies: ${JSON.stringify(req.cookies)}`);
    token = req.cookies["access_token"];
    if (token) {
      logger.log("[Extract] ✅ JWT token found in `access_token` cookie.");
    } else {
      logger.warn("[Extract] ❌ `access_token` cookie NOT found.");
    }
  } else {
    logger.warn("[Extract] Request or cookies are undefined.");
  }
  return token;
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private usersRepository: Repository<UserEntity>;
  private readonly logger = new CorrelatedLogger(JwtStrategy.name); // CHANGED LINE

  constructor(
    private readonly configService: ConfigService,
    private readonly dataSource: DataSource,
  ) {
    // Logger can be instantiated here as it doesn't depend on 'this' context yet that needs 'super()'
    const constructorLogger = new CorrelatedLogger(JwtStrategy.name + ':Constructor'); // CHANGED LINE

    const secret = configService.get<string>("JWT_SECRET_KEY");
    if (!secret) {
      const errorMessage = "CRITICAL: JWT_SECRET_KEY is not configured!";
      constructorLogger.error(errorMessage); // Use local logger before 'super'
      throw new Error(errorMessage);
    }

    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        cookieExtractor,
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: secret,
    });

    // Now 'this' is available after 'super()'
    this.usersRepository = this.dataSource.getRepository(UserEntity);
  }

  async validate(payload: JwtPayload): Promise<UserPayload> {
    this.logger.debug(`[Validate] Received payload: ${JSON.stringify(payload)}`);

    if (!payload.sub) {
      this.logger.error("[Validate] Missing sub (user ID) in JWT payload");
      throw new UnauthorizedException("Invalid token: missing user ID");
    }

    try {
      // Find the user with their roles. The permissions from the token are trusted.
      const user = await this.usersRepository.findOne({
        where: { id: payload.sub, is_active: true },
        relations: ['roles', 'tenant'], // Eager load roles and tenant
      });

      if (!user) {
        this.logger.warn(`[Validate] User not found or inactive for sub: ${payload.sub}`);
        throw new UnauthorizedException("User no longer active or token invalid.");
      }

      const simpleRoles: SimpleRole[] = user.roles.map(r => ({id: r.id, name: r.name as Role, description: r.description})); // Cast r.name

      this.logger.log(
        `[Validate] User found in DB: ${JSON.stringify({
          id: user.id,
          email: user.email,
          roles: simpleRoles.map(r => r.name),
          tenant_id: user.tenant_id,
        })}`,
      );

      // Construct UserPayload from the UserEntity and the trusted token payload
      const userPayloadToReturn: UserPayload = {
        id: user.id,
        email: user.email,
        roles: simpleRoles,
        permissions: payload.permissions, // Trust permissions from the signed token
        tenant_id: user.tenant_id,
        first_name: user.first_name,
        last_name: user.last_name,
        is_active: user.is_active,
        tenant_name: user.tenant?.name || null
      };

      this.logger.debug(`[Validate] UserPayload returned: ${JSON.stringify(userPayloadToReturn)}`);
      this.logger.log(`[Validate] Returning user payload with tenant_id: ${userPayloadToReturn.tenant_id}`);

      return userPayloadToReturn;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : JSON.stringify(error);
      this.logger.error(`[Validate] Error during validation: ${errorMessage}`);
      throw new UnauthorizedException("Token validation failed");
    }
  }
}