import {
  Injectable,
  UnauthorizedException,
  Logger,
  Inject,
} from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { ConfigService } from "@nestjs/config";
import { DataSource, Repository } from "typeorm";
import { UserEntity } from "./user.entity";
import { UserPayload, JwtPayload, SimpleRole } from "@shared/types/user";
import { Request } from "express";
import { Role } from "@shared/types/role.enum";
import { CorrelatedLogger } from "../common/logger/correlated-logger";
import { TokenBlacklistService } from "./token-blacklist.service";
import { IAuthCache } from "./auth-cache";

const cookieExtractor = (req: Request): string | null => {
  const logger = new CorrelatedLogger("CookieExtractor");
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
  private readonly logger = new CorrelatedLogger(JwtStrategy.name);

  // Deduplication map for in-flight DB queries (remains in-memory as it's per-node transient state)
  private readonly inFlightValidations = new Map<
    string,
    Promise<UserPayload>
  >();
  private readonly CACHE_TTL = 300; // seconds (5 minutes)

  constructor(
    private readonly configService: ConfigService,
    private readonly dataSource: DataSource,
    private readonly tokenBlacklist: TokenBlacklistService,
    @Inject("IAuthCache") private readonly authCache: IAuthCache,
  ) {
    const constructorLogger = new CorrelatedLogger(
      JwtStrategy.name + ":Constructor",
    );

    const secret = configService.get<string>("JWT_SECRET") ?? configService.get<string>("JWT_SECRET_KEY");
    if (!secret) {
      const errorMessage = "CRITICAL: JWT_SECRET is not configured! Set JWT_SECRET (64+ chars in production).";
      constructorLogger.error(errorMessage);
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

    const jti = (payload as any).jti as string | undefined;
    if (jti && this.tokenBlacklist.isBlacklisted(jti)) {
      this.logger.warn(
        `[Validate] Blacklisted token JTI ${jti} rejected for user ${userId}`,
      );
      throw new UnauthorizedException(
        "Token has been revoked. Please log in again.",
      );
    }

    try {
      // 1. Check Cache FIRST (Now uses injected IAuthCache - possibly Redis)
      const cacheKey = `auth_meta:${userId}`;
      const cachedUser = await this.authCache.get(cacheKey);

      if (cachedUser) {
        const cacheHitDuration = Date.now() - startTimeTotal;
        this.logger.log(
          `[Validate] [PERF] Cache HIT for ${cachedUser.email} in ${cacheHitDuration}ms`,
        );
        return cachedUser;
      }

      // 2. DEDUPLICATE IN-FLIGHT QUERIES
      let validationPromise = this.inFlightValidations.get(userId);

      if (validationPromise) {
        this.logger.debug(
          `[Validate] [PERF] Deduplicating validation for sub: ${userId}`,
        );
        const result = await validationPromise;
        const dedupDuration = Date.now() - startTimeTotal;
        this.logger.log(
          `[Validate] [PERF] Deduplicated validation returned in ${dedupDuration}ms`,
        );
        return result;
      }

      // 3. Cache MISS & No In-Flight: Create new validation promise
      validationPromise = (async () => {
        const queryStartTime = Date.now();
        const user = await this.usersRepository.findOne({
          where: { id: userId, is_active: true },
          relations: ["roles", "roles.permissions", "tenant"],
        });

        if (!user) {
          this.logger.warn(
            `[Validate] User not found or inactive for sub: ${userId}`,
          );
          throw new UnauthorizedException(
            "User no longer active or token invalid.",
          );
        }

        const simpleRoles: SimpleRole[] = user.roles.map((r) => ({
          id: r.id,
          name: r.name as Role,
          description: r.description,
        }));
        // P0 fix: do not trust stale JWT permissions — recompute from DB
        const freshPermissions = [
          ...new Set(
            user.roles.flatMap((r: any) => (r.permissions ?? []).map((p: any) => p.name)),
          ),
        ];

        const userPayloadToReturn: UserPayload = {
          id: user.id,
          email: user.email,
          roles: simpleRoles,
          permissions: freshPermissions,
          tenant_id: user.tenant_id,
          first_name: user.first_name,
          last_name: user.last_name,
          is_active: user.is_active,
          tenant_name: user.tenant?.name || null,
        };

        const queryDuration = Date.now() - queryStartTime;
        this.logger.log(
          `[Validate] [PERF] DB Query successful for ${user.email} in ${queryDuration}ms.`,
        );

        // Save to cache before returning
        await this.authCache.set(cacheKey, userPayloadToReturn, this.CACHE_TTL);
        return userPayloadToReturn;
      })();

      // Register the promise and clean up when done
      this.inFlightValidations.set(userId, validationPromise);
      try {
        const result = await validationPromise;
        const totalDuration = Date.now() - startTimeTotal;
        this.logger.log(
          `[Validate] [PERF] Cache MISS completed for ${result.email} in ${totalDuration}ms.`,
        );
        return result;
      } finally {
        this.inFlightValidations.delete(userId);
      }
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : JSON.stringify(error);
      this.logger.error(`[Validate] Error during validation: ${errorMessage}`);
      throw new UnauthorizedException("Token validation failed");
    }
  }
}
