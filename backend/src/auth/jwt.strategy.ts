import { Injectable, UnauthorizedException, Logger } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { ConfigService } from "@nestjs/config";
import { DataSource, Repository } from "typeorm";
import { UserEntity } from './user.entity';
import { UserPayload, JwtPayload, SimpleRole } from "@shared/types/user";
import { Request } from "express";
import { Role } from "@shared/types/role.enum"; // Import Role
import { CorrelatedLogger } from '../common/logger/correlated-logger'; 

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

import { InMemoryAuthCache } from "./auth-cache";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private usersRepository: Repository<UserEntity>;
  private readonly logger = new CorrelatedLogger(JwtStrategy.name);
  
  // Singleton cache shared across all validations
  private static readonly authCache = new InMemoryAuthCache();
  private static readonly inFlightValidations = new Map<string, Promise<UserPayload>>();
  private readonly CACHE_TTL = 300; // seconds (5 minutes)

  /**
   * Static method to invalidate a user's auth cache entry.
   * Useful when user roles or status change.
   */
  static async invalidateUserCache(userId: string): Promise<void> {
    const cacheKey = `auth_meta:${userId}`;
    await this.authCache.delete(cacheKey);
  }

  constructor(
    private readonly configService: ConfigService,
    private readonly dataSource: DataSource,
  ) {
    // ... rest of constructor ...
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
    const startTimeTotal = Date.now();
    const userId = payload.sub;
    this.logger.debug(`[Validate] Received payload for sub: ${userId}`);

    if (!userId) {
      this.logger.error("[Validate] Missing sub (user ID) in JWT payload");
      throw new UnauthorizedException("Invalid token: missing user ID");
    }

    try {
      // 1. Check Cache FIRST
      const cacheKey = `auth_meta:${userId}`;
      const cachedUser = await JwtStrategy.authCache.get(cacheKey);
      
      if (cachedUser) {
        const cacheHitDuration = Date.now() - startTimeTotal;
        this.logger.log(`[Validate] [PERF] Cache HIT for ${cachedUser.email} in ${cacheHitDuration}ms`);
        return cachedUser;
      }

      // 2. DEDUPLICATE IN-FLIGHT QUERIES
      // If multiple requests for the same user arrive at once, only one hits the DB.
      let validationPromise = JwtStrategy.inFlightValidations.get(userId);
      
      if (validationPromise) {
        this.logger.debug(`[Validate] [PERF] Deduplicating validation for sub: ${userId}`);
        const result = await validationPromise;
        const dedupDuration = Date.now() - startTimeTotal;
        this.logger.log(`[Validate] [PERF] Deduplicated validation returned in ${dedupDuration}ms`);
        return result;
      }

      // 3. Cache MISS & No In-Flight: Create new validation promise
      validationPromise = (async () => {
          const queryStartTime = Date.now();
          const user = await this.usersRepository.findOne({
            where: { id: userId, is_active: true },
            relations: ['roles', 'tenant'],
          });

          if (!user) {
            this.logger.warn(`[Validate] User not found or inactive for sub: ${userId}`);
            throw new UnauthorizedException("User no longer active or token invalid.");
          }

          const simpleRoles: SimpleRole[] = user.roles.map(r => ({
            id: r.id, 
            name: r.name as Role, 
            description: r.description
          }));

          const userPayloadToReturn: UserPayload = {
            id: user.id,
            email: user.email,
            roles: simpleRoles,
            permissions: payload.permissions,
            tenant_id: user.tenant_id,
            first_name: user.first_name,
            last_name: user.last_name,
            is_active: user.is_active,
            tenant_name: user.tenant?.name || null
          };

          const queryDuration = Date.now() - queryStartTime;
          this.logger.log(`[Validate] [PERF] DB Query successful for ${user.email} in ${queryDuration}ms.`);

          // Save to cache before returning
          await JwtStrategy.authCache.set(cacheKey, userPayloadToReturn, this.CACHE_TTL);
          return userPayloadToReturn;
      })();

      // Register the promise and clean up when done
      JwtStrategy.inFlightValidations.set(userId, validationPromise);
      try {
        const result = await validationPromise;
        const totalDuration = Date.now() - startTimeTotal;
        this.logger.log(`[Validate] [PERF] Cache MISS completed for ${result.email} in ${totalDuration}ms.`);
        return result;
      } finally {
        JwtStrategy.inFlightValidations.delete(userId);
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : JSON.stringify(error);
      this.logger.error(`[Validate] Error during validation: ${errorMessage}`);
      throw new UnauthorizedException("Token validation failed");
    }
  }
}