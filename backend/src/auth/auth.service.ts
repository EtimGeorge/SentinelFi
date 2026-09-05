import {
  Injectable,
  UnauthorizedException,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  InternalServerErrorException,
  BadRequestException,
  Inject,
  HttpException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, DataSource, DeepPartial } from "typeorm";
import { UserEntity } from "./user.entity";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcryptjs";
import { UserResponseDto } from "./dto/admin-user.dto";
import { JwtPayload, SimpleRole, UserPayload } from "@shared/types/user";
import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateUserDto } from "./dto/update-user.dto";
import { Role } from "@shared/types/role.enum";
import { CreateTenantAdminUserDto } from "../superadmin/dto/create-tenant-admin-user.dto";
import { RegisterUserDto } from "./dto/register-user.dto";
import * as crypto from "crypto";
import { RoleEntity } from "./role.entity";
import { TenantEntity } from "../tenants/tenant.entity";
import {
  SafeTransaction,
  RetryableQuery,
} from "../common/config/database.config";
import { InvitationService } from "./invitation.service";
import { AcceptInvitationDto } from "./dto/accept-invitation.dto";
import { AuditService } from "../audit/audit.service";
import { AuditLogEntity } from "../audit/audit.entity";
import { TENANT_DATA_SOURCE } from "../database/constants";
import { CorrelatedLogger } from "../common/logger/correlated-logger";
import { getCorrelationId } from "../common/interceptors/correlation.interceptor";
import { JwtStrategy } from "./jwt.strategy";
import { EmailService } from "../email/email.service";
import { IAuthCache } from "./auth-cache";
import { TokenBlacklistService } from "./token-blacklist.service";
import { PasswordResetEntity } from "./entities/password-reset.entity";

// Interface for DTOs used within AuthService
interface AuthCredentialDto {
  email: string;
  password: string; // Corrected to match incoming DTO from controller
}

interface LoginResponse {
  accessToken: string;
  user: UserResponseDto;
}

/**
 * Login attempt deduplication cache.
 * Prevents duplicate login processing during race conditions.
 */
class LoginCache {
  private cache = new Map<
    string,
    { promise: Promise<any>; timestamp: number }
  >();
  private readonly TTL = 3000; // 3 seconds
  private readonly logger = new CorrelatedLogger("LoginCache"); // Using CorrelatedLogger

  get(key: string): Promise<any> | null {
    const entry = this.cache.get(key);
    if (!entry || Date.now() - entry.timestamp > this.TTL) {
      if (entry) this.cache.delete(key);
      return null;
    }
    this.logger.warn(
      `[CID:${getCorrelationId()}] Duplicate login attempt for key [${key}], returning cached result.`,
    );
    return entry.promise;
  }

  set(key: string, promise: Promise<any>): void {
    this.cache.set(key, { promise, timestamp: Date.now() });
    promise.finally(() => {
      setTimeout(() => this.cache.delete(key), this.TTL);
    });
  }
}

@Injectable() // Changed from Scope.REQUEST to DEFAULT (Singleton)
export class AuthService {
  private readonly logger = new CorrelatedLogger(AuthService.name);
  private readonly loginCache = new LoginCache();

  // Static timer to ensure only one cleanup interval exists for the whole app
  private static cleanupInterval: NodeJS.Timeout | null = null;

  // ============================================================================
  // PASSWORD HASH CACHE - Prevent repeated bcrypt calls
  // Cache key is ONLY email + stored hash. Plain-text password NEVER enters the key.
  // ============================================================================
  private passwordHashCache = new Map<
    string,
    { hash: string; timestamp: number }
  >();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  constructor(
    private jwtService: JwtService,
    private dataSource: DataSource, // Global DataSource for public schema
    @Inject(TENANT_DATA_SOURCE)
    private tenantDataSource: DataSource, // TenancyAwareDataSource for tenant-aware logic
    private readonly auditService: AuditService,
    private readonly invitationService: InvitationService,
    private readonly tokenBlacklist: TokenBlacklistService,
    private readonly emailService: EmailService,
    @Inject("IAuthCache")
    private readonly authCache: IAuthCache,
  ) {
    // Start global cache cleanup ONLY if it's not already running
    if (!AuthService.cleanupInterval) {
      AuthService.cleanupInterval = setInterval(
        () => this.cleanPasswordCache(),
        60000,
      );
      this.logger.log("Starting global password cache cleanup timer (60s)");
    }
  }

  // Helper to prevent indefinite hangs
  private async runWithTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number,
    operationName: string,
  ): Promise<T> {
    let timer: NodeJS.Timeout;
    const timeoutPromise = new Promise<T>((_, reject) => {
      timer = setTimeout(() => {
        const msg = `Operation '${operationName}' timed out after ${timeoutMs}ms`;
        this.logger.error(msg);
        reject(
          new InternalServerErrorException(
            "Database operation timed out. Please try again.",
          ),
        );
      }, timeoutMs);
    });

    try {
      return await Promise.race([promise, timeoutPromise]);
    } finally {
      clearTimeout(timer!);
    }
  }

  async impersonate(
    impersonator: UserPayload,
    targetUserId: string,
  ): Promise<{ access_token: string; user: UserResponseDto }> {
    if (!impersonator.roles.some((role) => role.name === Role.SuperAdmin)) {
      // Use string literal
      throw new ForbiddenException("Only SuperAdmins can impersonate users.");
    }

    const targetUser = await this.findUserById(targetUserId);
    if (!targetUser) {
      throw new NotFoundException("User to impersonate not found.");
    }

    if (targetUser.roles.some((role) => role.name === Role.SuperAdmin)) {
      // Use string literal
      throw new ForbiddenException("Cannot impersonate another SuperAdmin.");
    }

    const impersonateJti = crypto.randomUUID();
    const payload: Omit<JwtPayload, "iat" | "exp"> = {
      jti: impersonateJti,
      email: targetUser.email,
      sub: targetUser.id,
      id: targetUser.id,
      roles: targetUser.roles.map((r) => r.name as Role), // Corrected to map to Role[]
      permissions: [], // Permissions should be resolved based on the target user's roles in the target tenant context
      tenant_id: targetUser.tenant_id ?? null,
      impersonator_id: impersonator.id, // Add impersonator ID to the token
    };

    const accessToken = this.jwtService.sign(payload, { expiresIn: "4h" }); // 4 hours - allows longer work sessions

    this.auditService
      .log(
        // Use new audit service log method signature
        impersonator.id,
        "IMPERSONATION_START",
        impersonator.tenant_id ?? null,
        `Started impersonating user ${targetUser.email} (ID: ${targetUser.id})`,
        {
          targetUserId: targetUser.id,
          targetUserEmail: targetUser.email,
        },
        impersonator.email,
      )
      .catch((err) =>
        this.logger.error(
          `[CID:${getCorrelationId()}] Failed to log impersonation start for ${impersonator.email}: ${err.message}`,
        ),
      );

    return { access_token: accessToken, user: targetUser };
  }

  async stopImpersonation(
    impersonator: UserPayload,
  ): Promise<{ access_token: string; user: UserResponseDto }> {
    if (!impersonator.impersonator_id) {
      throw new ForbiddenException("Not currently impersonating.");
    }

    const originalSuperAdmin = await this.dataSource
      .getRepository(UserEntity)
      .findOne({
        where: { id: impersonator.impersonator_id },
        relations: ["roles", "tenant", "roles.permissions"],
      });

    if (!originalSuperAdmin) {
      this.logger.error(
        `[IMPERSONATION] Impersonator (ID: ${impersonator.impersonator_id}) not found while stopping impersonation for user (ID: ${impersonator.id}).`,
      );
      throw new InternalServerErrorException("Original SuperAdmin not found.");
    }

    this.auditService
      .log(
        // Use new audit service log method signature
        impersonator.impersonator_id, // Logged as the original SuperAdmin
        "IMPERSONATION_END",
        originalSuperAdmin.tenant_id ?? null, // Logged against the SuperAdmin's tenant context
        `Stopped impersonating user ${impersonator.email} (ID: ${impersonator.id})`,
        {
          impersonatedUserId: impersonator.id,
          impersonatedUserEmail: impersonator.email,
        },
        originalSuperAdmin.email,
      )
      .catch((err) =>
        this.logger.error(
          `[CID:${getCorrelationId()}] Failed to log impersonation end for ${originalSuperAdmin.email}: ${err.message}`,
        ),
      );

    // Generate a fresh JWT for the original SuperAdmin
    const roleNames: Role[] = originalSuperAdmin.roles.map(
      (role) => role.name as Role,
    );
    const permissions = [
      ...new Set(
        originalSuperAdmin.roles.flatMap(
          (role) => role.permissions?.map((p) => p.name) || [],
        ),
      ),
    ];

    const stopJti = crypto.randomUUID();
    const payload: Omit<JwtPayload, "iat" | "exp"> = {
      jti: stopJti,
      email: originalSuperAdmin.email,
      sub: originalSuperAdmin.id,
      id: originalSuperAdmin.id,
      roles: roleNames,
      permissions: permissions,
      tenant_id: originalSuperAdmin.tenant?.tenant_id ?? null,
    };

    const accessToken = this.jwtService.sign(payload);

    return {
      access_token: accessToken,
      user: {
        id: originalSuperAdmin.id,
        email: originalSuperAdmin.email,
        username: originalSuperAdmin.username,
        first_name: originalSuperAdmin.first_name,
        last_name: originalSuperAdmin.last_name,
        roles: this.mapRolesToSimpleRoles(originalSuperAdmin.roles),
        is_active: originalSuperAdmin.is_active,
        tenant_id: originalSuperAdmin.tenant_id,
        tenant_name: originalSuperAdmin.tenant?.name || null,
      },
    };
  }

  /**
   * Performs user login with idempotency protection, transaction-safe audit logging,
   * and robust error handling.
   */

  async login(
    email: string,
    password: string,
    expectedRoleType: "SuperAdmin" | "Tenant",
    ipAddress?: string,
    userAgent?: string,
    rememberMe: boolean = false,
    tenantCode?: string,
  ): Promise<LoginResponse> {
    // Return LoginResponse
    const cacheKey = `${email}:${ipAddress || "unknown"}:${tenantCode || ""}`;
    const cachedPromise = this.loginCache.get(cacheKey);
    if (cachedPromise) return cachedPromise;

    const loginPromise = this.executeLogin(
      email,
      password,
      expectedRoleType,
      ipAddress,
      userAgent,
      rememberMe,
      tenantCode,
    );
    this.loginCache.set(cacheKey, loginPromise);

    return loginPromise;
  }

  private async executeLogin(
    email: string,
    password: string,
    expectedRoleType: "SuperAdmin" | "Tenant",
    ipAddress?: string,
    userAgent?: string,
    rememberMe: boolean = false,
    tenantCode?: string,
  ): Promise<LoginResponse> {
    // Return LoginResponse
    const startTime = Date.now();
    this.logger.log(
      `[LOGIN] Starting login for ${email}, expected type: ${expectedRoleType}`,
    );

    let user: UserEntity | null = null; // Declare user here

    try {
      const t1 = Date.now();
      this.logger.debug(
        `[LOGIN DIAGNOSTIC] Querying public schema for user: ${email}`,
      );
      // GRACEFUL TIMEOUT: Wrap the query in a timeout to fail fast if DB hangs (10s)
      user = await this.runWithTimeout(
        RetryableQuery.execute(
          () =>
            this.dataSource
              .getRepository(UserEntity)
              .createQueryBuilder("user")
              .addSelect("user.password_hash")
              .leftJoinAndSelect("user.tenant", "tenant")
              .leftJoinAndSelect("user.roles", "role")
              .leftJoinAndSelect("role.permissions", "permission")
              .where("user.email = :uid OR user.username = :uid", {
                uid: email,
              })
              .getOne(),
          3,
          100,
        ),
        10000,
        `LoginQuery:${email}`,
      );

      const queryTime = Date.now() - t1;
      this.logger.debug(`[PERF] User query completed in ${queryTime}ms`);

      if (!user) {
        this.logger.warn(`[LOGIN FAILED] User not found in DB: ${email}`);
        throw new UnauthorizedException("Invalid credentials.");
      }
      this.logger.debug(
        `[LOGIN DIAGNOSTIC] User found: ${user.id}. is_active: ${user.is_active}`,
      );

      // 1. Check if user is active
      if (!user.is_active) {
        this.logger.warn(`[LOGIN FAILED] User account is inactive: ${email}`);
        throw new UnauthorizedException(
          "Your account is inactive. Please contact support.",
        );
      }

      // 2. Password validation
      if (!user.password_hash) {
        this.logger.error(
          `[LOGIN FAILED] User ${email} has no password hash set!`,
        );
        throw new UnauthorizedException(
          "Account configuration error. Please reset your password.",
        );
      }

      const t2 = Date.now();
      this.logger.debug(`[LOGIN DIAGNOSTIC] Comparing passwords...`);
      const isPasswordValid = await this.validatePassword(
        password,
        user.password_hash,
        user.email,
      );

      const passwordCheckTime = Date.now() - t2;
      this.logger.debug(
        `[PERF] Password validation completed in ${passwordCheckTime}ms`,
      );

      if (!isPasswordValid) {
        this.logger.warn(`[LOGIN FAILED] Invalid password for user: ${email}`);
        throw new UnauthorizedException("Invalid credentials.");
      }
      this.logger.debug(`[LOGIN DIAGNOSTIC] Password valid.`);

      // 3. Resolve role and tenant context
      this.logger.debug(
        `[LOGIN DIAGNOSTIC] Validating role for expected type: ${expectedRoleType}${tenantCode ? ` tenantCode=${tenantCode}` : ""}`,
      );
      await this.validateUserRoleAndTenant(user, expectedRoleType, tenantCode);
      this.logger.log(
        `[LOGIN SUCCESS] Authentication passed for ${user.email}.`,
      );

      const permissions = [
        ...new Set(
          user.roles.flatMap(
            (role) => role.permissions?.map((p) => p.name) || [],
          ),
        ),
      ];
      const roleNames: Role[] = user.roles.map((role) => role.name as Role); // Corrected to map to Role[]

      const jti = crypto.randomUUID();
      const payload: Omit<JwtPayload, "iat" | "exp"> = {
        jti,
        email: user.email,
        sub: user.id,
        id: user.id,
        roles: roleNames,
        permissions: permissions,
        tenant_id: user.tenant?.tenant_id ?? null, // Corrected to tenant_id
      };

      this.logger.debug(
        `[LOGIN DIAGNOSTIC] JWT Payload generated: ${JSON.stringify({ ...payload, jti: jti.slice(0,8)+'...' })}`,
      );

      const t3 = Date.now();
      const expiresIn = rememberMe ? 7 * 24 * 60 * 60 : 60 * 60; // 7 days vs 1 hour
      const accessToken = this.jwtService.sign(payload, { expiresIn });
      const tokenTime = Date.now() - t3;
      this.logger.debug(`[PERF] JWT generation completed in ${tokenTime}ms`);

      const totalTime = Date.now() - startTime;
      this.logger.log(
        `[PERF] Total login duration: ${totalTime}ms (Query: ${queryTime}ms, Pwd: ${passwordCheckTime}ms, Token: ${tokenTime}ms)`,
      );

      // Log performance breakdown for slow logins
      if (totalTime > 2000) {
        this.logger.warn(
          `⚠️ SLOW LOGIN DETECTED (${totalTime}ms): Query=${queryTime}ms, Password=${passwordCheckTime}ms, JWT=${tokenTime}ms`,
        );
      }

      // NON-BLOCKING: Fire and forget the audit log to speed up terminal response
      this.auditService
        .log(
          user.id,
          "LOGIN_SUCCESS",
          user.tenant_id ?? null,
          "Login successful",
          {
            login_duration_ms: totalTime,
            portal_type: expectedRoleType,
          },
          user.email,
          ipAddress,
          userAgent,
        )
        .catch((err) =>
          this.logger.error(
            `[CID:${getCorrelationId()}] Failed to log login success for ${email}: ${err.message}`,
          ),
        );

      return {
        accessToken: accessToken,
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          first_name: user.first_name, // Include first_name
          last_name: user.last_name, // Include last_name
          roles: this.mapRolesToSimpleRoles(user.roles), // Assuming mapRolesToSimpleRoles exists and is correct
          is_active: user.is_active,
          tenant_id: user.tenant_id,
          tenant_name: user.tenant?.name || null,
        },
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      this.logger.error(
        `[LOGIN] ✗ Login failed for ${email} after ${duration}ms: ${errorMessage}`,
      );

      // Attempt to determine user ID for audit log based on the error
      let userIdForAudit: string | null = null;
      let reasonForAudit = errorMessage;

      if (user) {
        userIdForAudit = user.id;
        if (errorMessage.includes("inactive")) {
          reasonForAudit = "User inactive";
        } else if (errorMessage.includes("password hash missing")) {
          reasonForAudit = "Password hash missing";
        } else if (errorMessage.includes("Invalid credentials")) {
          reasonForAudit = "Invalid password";
        } else if (error instanceof ForbiddenException) {
          reasonForAudit = error.message;
        } else {
          reasonForAudit = "Authentication system error";
        }
      } else {
        if (errorMessage.includes("User not found")) {
          userIdForAudit = null;
          reasonForAudit = "User not found";
        } else {
          userIdForAudit = null;
          reasonForAudit = "Authentication system error";
        }
      }

      // NON-BLOCKING: Audit login failure
      this.auditService
        .log(
          userIdForAudit,
          "LOGIN_FAILURE",
          user?.tenant_id ?? null, // Use user's tenant_id if available
          reasonForAudit,
          {
            login_duration_ms: duration,
            portal_type: expectedRoleType,
          },
          email, // Pass email for the audit log
          ipAddress,
          userAgent,
        )
        .catch((err) =>
          this.logger.error(
            `[CID:${getCorrelationId()}] Failed to log login failure for ${email}: ${err.message}`,
          ),
        );

      if (error instanceof HttpException) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Authentication system error: ${errorMessage}`,
      );
    }
  }

  // ============================================================================
  // PASSWORD VALIDATION - With intelligent caching
  // SECURITY: Cache key contains ONLY the email — plain-text password is NEVER stored.
  // We verify the stored hash still matches the DB hash to detect password changes.
  // ============================================================================
  private async validatePassword(
    plainTextPassword: string,
    hashedPassword: string,
    email: string,
  ): Promise<boolean> {
    // Safe cache key: email only. We compare the stored hash as a stale-detection guard.
    const cacheKey = `password_hash:${email}`;
    const cached = this.passwordHashCache.get(cacheKey);

    if (cached) {
      const age = Date.now() - cached.timestamp;
      // Only use cache if the hash hasn't changed (i.e., password wasn't reset)
      if (age < this.CACHE_TTL && cached.hash === hashedPassword) {
        // Even from cache, we still verify the password to prevent cache-poisoning.
        // bcrypt.compare is async; the cost is only a concern on the hot path (first call).
        const isValid = await bcrypt.compare(plainTextPassword, hashedPassword);
        if (isValid) {
          this.logger.debug(
            `[PASSWORD_VALIDATION] Cache HIT (hash valid) for ${email}`,
          );
          return true;
        }
        // Hash matched but password wrong — cache is not a bypass, just an early-exit for hash staleness.
        return false;
      } else {
        this.passwordHashCache.delete(cacheKey);
      }
    }

    // Perform full bcrypt comparison (expensive operation)
    const startTime = Date.now();
    const isValid = await bcrypt.compare(plainTextPassword, hashedPassword);
    const duration = Date.now() - startTime;

    this.logger.debug(
      `[PASSWORD_VALIDATION] bcrypt.compare took ${duration}ms for ${email}`,
    );

    if (duration > 1000) {
      this.logger.warn(
        `⚠️  SLOW BCRYPT: Password comparison took ${duration}ms. Consider reducing bcrypt rounds.`,
      );
    }

    // Cache the HASH (not the password) so we can detect stale entries
    if (isValid) {
      this.passwordHashCache.set(cacheKey, {
        hash: hashedPassword, // SAFE: this is the bcrypt hash, not the plain-text
        timestamp: Date.now(),
      });
    }

    return isValid;
  }

  private async validateUserRoleAndTenant(
    user: UserEntity,
    expectedRoleType: "SuperAdmin" | "Tenant",
    tenantCode?: string,
  ): Promise<void> {
    const isSuperAdmin = user.roles.some(
      (role) => role.name === Role.SuperAdmin,
    ); // Use string literal

    if (expectedRoleType === "SuperAdmin") {
      if (!isSuperAdmin) {
        this.logger.warn(
          `[LOGIN FAILED] User ${user.email} attempted SuperAdmin login without SuperAdmin role.`,
        );
        throw new ForbiddenException(
          "Access denied. You do not have SuperAdmin privileges.",
        );
      }
    } else if (expectedRoleType === "Tenant") {
      // Implicitly not SuperAdmin if we reach here for Tenant login
      if (isSuperAdmin) {
        // Double check for safety, though path implies not SuperAdmin
        this.logger.warn(
          `[LOGIN FAILED] SuperAdmin user ${user.email} attempted Tenant login.`,
        );
        throw new ForbiddenException(
          "SuperAdmin accounts must log in through the SuperAdmin portal.",
        );
      }
      if (!user.tenant_id) {
        this.logger.warn(
          `[LOGIN FAILED] User ${user.email} attempted Tenant login but has no tenant_id.`,
        );
        throw new ForbiddenException(
          "Your account is not associated with a tenant.",
        );
      }
      // Enforce tenantCode match if provided (prevents silent cross-tenant login via generic portal)
      const rawCode = tenantCode?.trim();
      if (rawCode) {
        const code = rawCode.toLowerCase();
        // Normalize helper: lower, trim, replace spaces/underscores/hyphens
        const norm = (s: string) => s.toLowerCase().trim().replace(/[\s_]+/g, "_").replace(/-/g, "_");
        const tenant = (user as any).tenant as TenantEntity | undefined;
        // Try direct match against user's tenant fields first (no DB round-trip)
        const candidates = tenant
          ? [tenant.tenant_id, tenant.schema_name, tenant.name].map((v) => (v ? norm(v) : ""))
          : [];
        // Also allow matching without underscores (e.g., SOLUTION_ENERGY vs solutionenergy)
        const codeNoSep = code.replace(/[^a-z0-9]/g, "");
        const candidatesNoSep = candidates.map((c) => c.replace(/[^a-z0-9]/g, ""));
        const matches =
          candidates.includes(norm(code)) ||
          candidatesNoSep.includes(codeNoSep) ||
          (tenant && tenant.tenant_id.toLowerCase() === code);

        if (!matches) {
          // Fallback: lookup tenant by code to give precise error (optional DB check)
          let lookup: TenantEntity | null = null;
          try {
            lookup = await this.dataSource
              .getRepository(TenantEntity)
              .createQueryBuilder("t")
              .where("LOWER(t.schema_name) = :code OR LOWER(t.name) = :code OR t.tenant_id::text = :raw", {
                code: code,
                raw: rawCode,
              })
              .getOne();
          } catch {}
          const expected = tenant?.name ?? tenant?.schema_name ?? "unknown";
          const hint = lookup ? ` (you entered "${rawCode}" which maps to "${lookup.name}")` : "";
          this.logger.warn(
            `[LOGIN FAILED] Tenant mismatch for ${user.email}: account is in "${expected}" but login attempted with "${rawCode}"${hint}`,
          );
          throw new ForbiddenException(
            `Tenant mismatch: your account belongs to "${expected}" not "${rawCode}". Use the correct Tenant ID for your organization.`,
          );
        }
      }
    }
  }

  // ============================================================================
  // JWT GENERATION - Optimized payload
  // ============================================================================
  // This method is private and not directly called by controllers for now.
  // The login method handles JWT generation directly.
  private async generateAccessToken(user: UserEntity): Promise<string> {
    // Use UserEntity for consistency
    // Minimize JWT payload size for faster generation and smaller cookies
    const genJti = crypto.randomUUID();
    const payload = {
      userId: user.id,
      email: user.email,
      username: user.username,
      roles: user.roles.map((role) => role.name as Role), // Map to Role[]
      tenant_id: user.tenant?.tenant_id || null, // Corrected to tenant_id
      jti: genJti,
      iat: Math.floor(Date.now() / 1000),
    };

    return this.jwtService.signAsync(payload, {
      jwtid: genJti,
      expiresIn: "24h",
      algorithm: "HS256", // Faster than RS256 for symmetric keys
    });
  }

  // ============================================================================
  // PASSWORD CACHE CLEANUP
  // ============================================================================
  private cleanPasswordCache() {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, value] of this.passwordHashCache.entries()) {
      // Use passwordHashCache
      const age = now - value.timestamp;
      if (age > this.CACHE_TTL) {
        this.passwordHashCache.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      this.logger.debug(
        `[PASSWORD_CACHE] Cleaned ${cleaned} expired entries from password cache`,
      );
    }
  }

  // ============================================================================
  // VALIDATE USER (for JWT Strategy) - Optimized
  // ============================================================================
  async validateUser(userId: string): Promise<UserEntity | null> {
    // Return UserEntity
    // OPTIMIZATION: Cache frequently accessed users
    // In production, consider Redis caching here

    // Use RetryableQuery for resilience
    const user = await RetryableQuery.execute(
      () =>
        this.dataSource
          .getRepository(UserEntity)
          .createQueryBuilder("user")
          .leftJoinAndSelect("user.roles", "role")
          .leftJoinAndSelect("user.tenant", "tenant")
          .where("user.id = :userId", { userId })
          .andWhere("user.is_active = :isActive", { isActive: true }) // Use is_active
          .select([
            "user.id",
            "user.email",
            "user.username",
            "user.first_name", // Use first_name
            "user.last_name", // Use last_name
            "user.is_active",
            "role.id",
            "role.name",
            "role.description",
            "tenant.tenant_id", // Corrected to tenant_id
            "tenant.name",
          ])
          .getOne(),
      3,
      100,
    );

    return user;
  }

  // ============================================================================
  // LOGOUT — Blacklists the current token and clears local caches
  // ============================================================================
  /**
   * Logs the user out by:
   * 1. Adding the current token JTI to the blacklist so it can't be reused.
   * 2. Invalidating the JwtStrategy auth cache for this user.
   * 3. Clearing the in-memory password hash cache entry.
   *
   * @param userId - The authenticated user's ID
   * @param tokenPayload - The decoded JWT payload (contains jti and exp)
   */
  async logout(
    userId: string,
    tokenPayload?: { jti?: string; exp?: number },
  ): Promise<void> {
    this.logger.log(`[LOGOUT] User ${userId} logging out.`);

    // Blacklist the specific token so it is rejected by JwtStrategy even before expiry
    if (tokenPayload?.jti && tokenPayload?.exp) {
      this.tokenBlacklist.blacklist(tokenPayload.jti, tokenPayload.exp);
      this.logger.debug(
        `[LOGOUT] Token JTI ${tokenPayload.jti} added to blacklist.`,
      );
    } else {
      this.logger.warn(
        `[LOGOUT] No JTI in token payload for user ${userId} — blacklisting skipped.`,
      );
    }

    // Invalidate the JWT validation cache so role/status changes take effect immediately
    await this.authCache
      .delete(`auth_meta:${userId}`)
      .catch((err: Error) =>
        this.logger.error(
          `[LOGOUT] Cache invalidation failed for user ${userId}: ${err.message}`,
        ),
      );

    // Clear the password hash cache for this user
    this.cleanPasswordCacheForUser(userId);

    this.logger.debug(`[LOGOUT] User ${userId} logged out successfully.`);
  }

  private cleanPasswordCacheForUser(userId: string) {
    // Cache key format is `password_hash:${email}` — we can't look up email by userId here,
    // so we invalidate the whole cache on logout. It's a small trade-off for security.
    // In a Redis-backed cache, we'd use a per-user key prefix.
    this.passwordHashCache.clear();
    this.logger.debug(`[LOGOUT] Password hash cache cleared on logout.`);
  }

  // ============================================================================
  // PASSWORD RESET — Secure token-based flow
  // ============================================================================

  /**
   * Step 1: Generates a cryptographically random reset token, hashes it,
   * stores the hash in DB, and emails the plaintext token to the user.
   * The plaintext token NEVER touches the database.
   */
  async requestPasswordReset(email: string): Promise<void> {
    this.logger.log(`[PASSWORD_RESET] Request received for: ${email}`);

    const user = await this.dataSource
      .getRepository(UserEntity)
      .findOne({ where: { email } });

    // Always respond with the same message to avoid user enumeration
    if (!user) {
      this.logger.warn(
        `[PASSWORD_RESET] No user found for email: ${email} — silent return.`,
      );
      return;
    }

    // Generate a 32-byte random token (256 bits of entropy)
    const plainToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto
      .createHash("sha256")
      .update(plainToken)
      .digest("hex");

    // Expire any existing tokens for this user
    await this.dataSource
      .getRepository(PasswordResetEntity)
      .update({ user_id: user.id, is_consumed: false }, { is_consumed: true });

    // Store only the hash
    const resetToken = this.dataSource
      .getRepository(PasswordResetEntity)
      .create({
        token_hash: tokenHash,
        user_id: user.id,
        expires_at: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
        is_consumed: false,
      });
    await this.dataSource.getRepository(PasswordResetEntity).save(resetToken);

    // Email the plaintext token (never stored in DB)
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${plainToken}`;
    await this.emailService
      .sendEmail(
        user.email,
        "Reset Your SentinelFi Password",
        `<p>You requested a password reset.</p>
       <p><a href="${resetUrl}">Click here to reset your password</a></p>
       <p>This link expires in 1 hour. If you did not request this, ignore this email.</p>`,
      )
      .catch((err) =>
        this.logger.error(
          `[PASSWORD_RESET] Email failed for ${email}: ${err.message}`,
        ),
      );

    this.logger.log(`[PASSWORD_RESET] Reset email dispatched for: ${email}`);
  }

  /**
   * Step 2: Validates the plaintext token, verifies it against the stored hash,
   * hashes the new password, and marks the token as consumed.
   */
  async resetPassword(plainToken: string, newPassword: string): Promise<void> {
    const tokenHash = crypto
      .createHash("sha256")
      .update(plainToken)
      .digest("hex");

    const resetRecord = await this.dataSource
      .getRepository(PasswordResetEntity)
      .findOne({
        where: { token_hash: tokenHash, is_consumed: false },
      });

    if (!resetRecord) {
      throw new BadRequestException("Invalid or expired password reset token.");
    }

    if (new Date() > resetRecord.expires_at) {
      await this.dataSource
        .getRepository(PasswordResetEntity)
        .update({ id: resetRecord.id }, { is_consumed: true });
      throw new BadRequestException(
        "Password reset token has expired. Please request a new one.",
      );
    }

    const user = await this.dataSource.getRepository(UserEntity).findOne({
      where: { id: resetRecord.user_id },
    });
    if (!user) throw new NotFoundException("User not found.");

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Atomic: update password + consume token in one transaction
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      await queryRunner.manager.update(
        UserEntity,
        { id: user.id },
        { password_hash: hashedPassword },
      );
      await queryRunner.manager.update(
        PasswordResetEntity,
        { id: resetRecord.id },
        { is_consumed: true },
      );
      await queryRunner.commitTransaction();
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }

    // Invalidate auth cache so the user must re-authenticate with the new password
    await this.authCache.delete(`auth_meta:${user.id}`).catch(() => {});
    this.passwordHashCache.delete(`password_hash:${user.email}`);

    this.auditService
      .log(
        user.id,
        "PASSWORD_RESET",
        user.tenant_id ?? null,
        `Password reset completed for ${user.email}.`,
        {},
        user.email,
      )
      .catch(() => {});

    this.logger.log(
      `[PASSWORD_RESET] Password successfully reset for: ${user.email}`,
    );
  }

  // --- Other existing methods (adapted) ---

  private generateRandomPassword(): string {
    return crypto.randomBytes(16).toString("hex");
  }

  private mapRolesToSimpleRoles(roles: RoleEntity[]): SimpleRole[] {
    if (!roles) return [];
    return roles.map((role) => ({
      id: role.id,
      name: role.name as Role,
      description: role.description,
    }));
  }

  async findUserByEmail(email: string): Promise<UserEntity | null> {
    return this.dataSource.getRepository(UserEntity).findOne({
      where: { email },
      relations: ["roles", "tenant"],
    });
  }

  async findUserById(id: string): Promise<UserResponseDto> {
    const user = await this.runWithTimeout(
      RetryableQuery.execute(
        () =>
          this.dataSource.getRepository(UserEntity).findOne({
            where: { id },
            relations: ["roles", "tenant"],
          }),
        3,
        100,
      ),
      35000,
      `findUserById:${id}`,
    );
    if (!user) throw new NotFoundException("User not found");
    return {
      id: user.id,
      email: user.email,
      username: user.username,
      first_name: user.first_name,
      last_name: user.last_name,
      roles: this.mapRolesToSimpleRoles(user.roles),
      is_active: user.is_active,
      tenant_id: user.tenant_id,
      tenant_name: user.tenant?.name || null,
    };
  }

  async register(registerDto: RegisterUserDto): Promise<UserResponseDto> {
    const existing = await RetryableQuery.execute(() =>
      this.dataSource
        .getRepository(UserEntity)
        .findOne({ where: { email: registerDto.email } }),
    );
    if (existing) {
      throw new ConflictException("User with this email already exists.");
    }

    const defaultRole = await RetryableQuery.execute(
      () =>
        this.dataSource
          .getRepository(RoleEntity)
          .findOne({ where: { name: Role.AssignedProjectUser } }), // Use string literal
    );
    if (!defaultRole) {
      throw new InternalServerErrorException(
        "Default role not found. Please seed the database.",
      );
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(registerDto.password, salt);

    const newUser = this.dataSource.getRepository(UserEntity).create({
      email: registerDto.email,
      username: registerDto.username || registerDto.email.split("@")[0],
      password_hash: hashedPassword,
      roles: [defaultRole],
      tenant_id: null, // Never trust tenant_id from public registration — assign via invitation only
    });

    const savedUser = await this.dataSource
      .getRepository(UserEntity)
      .save(newUser);

    this.auditService
      .log(
        savedUser.id,
        "USER_REGISTERED",
        savedUser.tenant_id ?? null,
        `User ${savedUser.email} registered successfully.`,
        {},
        savedUser.email,
      )
      .catch((err) =>
        this.logger.error(
          `[CID:${getCorrelationId()}] Failed to log user registration for ${savedUser.email}: ${err.message}`,
        ),
      );

    return this.findUserById(savedUser.id);
  }

  async verifyInvitation(token: string) {
    const invitation = await this.invitationService.validateToken(token);
    return {
      email: invitation.email,
      tenantName: invitation.tenant.name,
      role: invitation.role,
    };
  }

  async acceptInvitation(
    acceptDto: AcceptInvitationDto,
  ): Promise<UserResponseDto> {
    const invitation = await this.invitationService.validateToken(
      acceptDto.token,
    );

    // Safety check: Ensure user doesn't already exist with this email
    const existing = await this.findUserByEmail(invitation.email);
    if (existing) {
      await this.invitationService.markAsConsumed(acceptDto.token);
      throw new ConflictException(
        "An account already exists with this invitation email.",
      );
    }

    const role = await RetryableQuery.execute(() =>
      this.dataSource
        .getRepository(RoleEntity)
        .findOne({ where: { name: invitation.role } }),
    );
    if (!role) {
      throw new InternalServerErrorException(
        `Role '${invitation.role}' not found.`,
      );
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(acceptDto.password, salt);

    const newUser = this.dataSource.getRepository(UserEntity).create({
      email: invitation.email,
      username: acceptDto.username || invitation.email.split("@")[0],
      first_name: invitation.first_name || acceptDto.first_name || "SentinelFi",
      last_name: invitation.last_name || acceptDto.last_name || "User",
      password_hash: hashedPassword,
      roles: [role],
      tenant_id: invitation.tenant.tenant_id,
      is_active: true,
    });

    const savedUser = await this.dataSource
      .getRepository(UserEntity)
      .save(newUser);

    await this.invitationService.markAsConsumed(acceptDto.token);

    this.auditService
      .log(
        savedUser.id,
        "INVITATION_ACCEPTED",
        savedUser.tenant_id ?? null,
        `User ${savedUser.email} joined ${invitation.tenant.name} via invitation.`,
        { invitationId: invitation.id },
        savedUser.email,
      )
      .catch((err) =>
        this.logger.error(
          `[CID:${getCorrelationId()}] Failed to log invitation acceptance for ${savedUser.email}: ${err.message}`,
        ),
      );

    return this.findUserById(savedUser.id);
  }

  async findAllUsers(tenant_id?: string): Promise<UserResponseDto[]> {
    const users = await RetryableQuery.execute(() => {
      const query = this.dataSource
        .getRepository(UserEntity)
        .createQueryBuilder("user")
        .leftJoinAndSelect("user.tenant", "tenant")
        .leftJoinAndSelect("user.roles", "role");

      if (tenant_id) {
        query.where("user.tenant_id = :tenant_id", { tenant_id });
      }

      return query.getMany();
    });
    return users.map((user) => ({
      id: user.id,
      email: user.email,
      username: user.username,
      first_name: user.first_name,
      last_name: user.last_name,
      roles: this.mapRolesToSimpleRoles(user.roles),
      is_active: user.is_active,
      tenant_id: user.tenant_id,
      tenant_name: user.tenant?.name || null,
    }));
  }

  async createUser(
    requestingUser: UserPayload,
    createUserDto: CreateUserDto,
  ): Promise<UserResponseDto> {
    const existing = await RetryableQuery.execute(() =>
      this.dataSource
        .getRepository(UserEntity)
        .findOne({ where: { email: createUserDto.email } }),
    );
    if (existing) {
      throw new ConflictException("User with this email already exists.");
    }

    const isSuperAdmin = requestingUser.roles.some(
      (role) => role.name === Role.SuperAdmin,
    ); // Use string literal

    // --- ROLE ASSIGNMENT SECURITY ---
    if (createUserDto.role === Role.SuperAdmin && !isSuperAdmin) {
      throw new ForbiddenException(
        "Only Platform SuperAdmins can assign the SuperAdmin role.",
      );
    }
    if (
      createUserDto.role === Role.SuperAdmin &&
      (createUserDto.tenant_id || requestingUser.tenant_id)
    ) {
      throw new BadRequestException(
        "The SuperAdmin role cannot be assigned to a tenant user.",
      );
    }

    if (!isSuperAdmin) {
      if (
        createUserDto.tenant_id &&
        createUserDto.tenant_id !== requestingUser.tenant_id
      ) {
        throw new ForbiddenException(
          "You are not allowed to create users for other tenants.",
        );
      }
      // Force user to be created in the same tenant as the admin
      createUserDto.tenant_id = requestingUser.tenant_id;
    }

    const role = await RetryableQuery.execute(() =>
      this.dataSource
        .getRepository(RoleEntity)
        .findOne({ where: { name: createUserDto.role } }),
    );
    if (!role) {
      throw new InternalServerErrorException(
        `Role '${createUserDto.role}' not found. Please seed the database.`,
      );
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(createUserDto.password, salt); // Corrected to createUserDto.password

    const newUser = this.dataSource.getRepository(UserEntity).create({
      email: createUserDto.email,
      username: createUserDto.username || createUserDto.email.split("@")[0],
      first_name: createUserDto.first_name,
      last_name: createUserDto.last_name,
      password_hash: hashedPassword,
      roles: [role],
      tenant_id: createUserDto.tenant_id,
      is_active: createUserDto.is_active ?? true,
    });

    const savedUser = await this.dataSource
      .getRepository(UserEntity)
      .save(newUser);

    this.auditService
      .log(
        savedUser.id,
        "USER_CREATED",
        savedUser.tenant_id ?? null,
        `User ${savedUser.email} created by ${requestingUser.email}.`,
        {},
        savedUser.email,
        undefined, // ipAddress
        undefined, // userAgent
        requestingUser.email, // actingUserEmail
      )
      .catch((err) =>
        this.logger.error(
          `[CID:${getCorrelationId()}] Failed to log user creation for ${savedUser.email}: ${err.message}`,
        ),
      );

    return this.findUserById(savedUser.id);
  }

  async createTenantUser(
    createAdminUserDto: CreateTenantAdminUserDto,
  ): Promise<UserEntity & { generatedPassword?: string }> {
    const existing = await RetryableQuery.execute(() =>
      this.dataSource
        .getRepository(UserEntity)
        .findOne({ where: { email: createAdminUserDto.email } }),
    );
    if (existing) {
      throw new ConflictException("User with this email already exists.");
    }

    const roleName = createAdminUserDto.role || "Admin Director"; // Default to AdminDirector for new tenants
    const adminRole = await RetryableQuery.execute(() =>
      this.dataSource
        .getRepository(RoleEntity)
        .findOne({ where: { name: roleName } }),
    );
    if (!adminRole) {
      throw new InternalServerErrorException(
        `Role '${roleName}' not found. Please seed the database.`,
      );
    }

    const randomPassword = this.generateRandomPassword();
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(randomPassword, salt);

    const newUser = this.dataSource.getRepository(UserEntity).create({
      email: createAdminUserDto.email,
      tenant_id: createAdminUserDto.tenant_id,
      password_hash: hashedPassword,
      is_active: createAdminUserDto.is_active ?? true,
      roles: [adminRole],
    } as DeepPartial<UserEntity>);

    const savedUser = await this.dataSource
      .getRepository(UserEntity)
      .save(newUser);

    // SECURITY: Log only that a password was generated, NOT the actual password value.
    this.logger.warn(
      `[USER_PROVISIONING] Generated password for new tenant admin ${savedUser.email}. This password is returned to the caller only — it must NOT be logged further.`,
    );

    this.auditService
      .log(
        savedUser.id,
        "TENANT_ADMIN_CREATED",
        savedUser.tenant_id ?? null,
        `Tenant admin ${savedUser.email} provisioned. A generated password was returned to the requesting SuperAdmin.`,
        {}, // SECURITY: NEVER log generated passwords — audit records are queryable
        savedUser.email,
      )
      .catch((err) =>
        this.logger.error(
          `[CID:${getCorrelationId()}] Failed to log tenant admin creation for ${savedUser.email}: ${err.message}`,
        ),
      );

    return { ...savedUser, generatedPassword: randomPassword };
  }

  public async generateJwtToken(
    payload: Record<string, any>,
    options?: any,
  ): Promise<string> {
    const jti = payload.jti ?? crypto.randomUUID();
    const payloadWithJti = { ...payload, jti };
    return this.jwtService.sign(payloadWithJti, options);
  }

  async updateUser(
    requestingUser: UserPayload,
    id: string,
    updateUserDto: UpdateUserDto,
  ): Promise<UserResponseDto> {
    const user = await RetryableQuery.execute(() =>
      this.dataSource
        .getRepository(UserEntity)
        .findOne({ where: { id }, relations: ["roles"] }),
    );
    if (!user) {
      throw new NotFoundException("User not found.");
    }

    const isSuperAdmin = requestingUser.roles.some(
      (role) => role.name === Role.SuperAdmin,
    ); // Use string literal

    // --- ROLE UPDATE SECURITY ---
    if (updateUserDto.role) {
      if (updateUserDto.role === Role.SuperAdmin && !isSuperAdmin) {
        throw new ForbiddenException(
          "Only Platform SuperAdmins can assign the SuperAdmin role.",
        );
      }
      const targetTenantId =
        updateUserDto.tenant_id !== undefined
          ? updateUserDto.tenant_id
          : user.tenant_id;
      if (updateUserDto.role === Role.SuperAdmin && targetTenantId) {
        throw new BadRequestException(
          "The SuperAdmin role cannot be assigned to a tenant user.",
        );
      }
    }

    // Only SuperAdmin can change tenant assignment
    if (
      updateUserDto.tenant_id !== undefined &&
      user.tenant_id !== updateUserDto.tenant_id &&
      !isSuperAdmin
    ) {
      throw new ForbiddenException(
        "You are not allowed to change a user's tenant assignment.",
      );
    }

    // If role is being changed, handle it separately
    if (updateUserDto.role) {
      const newRole = await RetryableQuery.execute(() =>
        this.dataSource
          .getRepository(RoleEntity)
          .findOne({ where: { name: updateUserDto.role } }),
      );
      if (!newRole) {
        throw new InternalServerErrorException(
          `Role '${updateUserDto.role}' not found.`,
        );
      }
      user.roles = [newRole];
    }

    // Delete role from DTO before merging to avoid conflicts, as it's a relation
    delete (updateUserDto as any).role;

    // Merge the rest of the DTO
    this.dataSource.getRepository(UserEntity).merge(user, updateUserDto);

    const savedUser = await this.dataSource
      .getRepository(UserEntity)
      .save(user);

    // Invalidate JWT validation cache to reflect changes immediately
    await this.authCache
      .delete(`auth_meta:${savedUser.id}`)
      .catch((err: Error) =>
        this.logger.error(
          `Failed to invalidate cache for user ${savedUser.id}: ${err.message}`,
        ),
      );

    this.logger.log(
      `User ${savedUser.email} updated successfully by ${requestingUser.email}`,
    );

    return this.findUserById(savedUser.id);
  }

  // --- PHASE 12: USER DOSSIER ANALYTICS ---

  async findUserProfileDossier(id: string, tenantId: string | null) {
    const user = await this.findUserById(id);
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found.`);
    }

    // Verify tenant access (SuperAdmin can see all, Admin only their tenant)
    if (tenantId !== null && user.tenant_id !== tenantId) {
      throw new ForbiddenException(
        `Access denied to user profile outside your tenant.`,
      );
    }

    // Fetch Last 20 Audit Logs
    const activities = await this.auditService.findAuditLogs({
      userId: id,
      tenantId: user.tenant_id ?? undefined,
      page: 1,
      limit: 20,
    });

    // Calculate basic activity counts
    const logRepo = this.dataSource.getRepository(AuditLogEntity);
    const eventCounts = await logRepo
      .createQueryBuilder("log")
      .select("log.action", "action")
      .addSelect("COUNT(*)", "count")
      .where("log.userId = :id", { id })
      .groupBy("log.action")
      .getRawMany();

    return {
      ...user,
      activity_count: activities.total,
      recent_activities: activities.logs.map((log) => ({
        id: log.id,
        action: log.action,
        timestamp: log.timestamp,
        description: (log.details as any)?.description || log.action,
        ip: log.ipAddress,
      })),
      event_breakdown: eventCounts,
    };
  }

  async batchUpdateUsers(
    requestingUser: UserPayload,
    userIds: string[],
    updateDto: Partial<UpdateUserDto>,
  ): Promise<{ updated: number; errors: string[] }> {
    const results = { updated: 0, errors: [] as string[] };
    const isSuperAdmin = requestingUser.roles.some(
      (role) => role.name === Role.SuperAdmin,
    );

    for (const id of userIds) {
      try {
        await this.updateUser(requestingUser, id, updateDto as UpdateUserDto);
        results.updated++;
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        this.logger.error(`Batch update failed for user ${id}: ${errorMsg}`);
        results.errors.push(`User ${id}: ${errorMsg}`);
      }
    }

    return results;
  }

  /**
   * ELITE SUPPORT: Finds the first available SuperAdmin for automatic support ticket routing.
   * This ensures Landlord-level assistance is always reachable.
   */
  async findFirstSuperAdmin(): Promise<UserEntity> {
    const superAdmin = await this.dataSource
      .getRepository(UserEntity)
      .createQueryBuilder("user")
      .leftJoinAndSelect("user.roles", "role")
      .where("role.name = :roleName", { roleName: Role.SuperAdmin })
      .getOne();

    if (!superAdmin) {
      this.logger.warn(
        "Support Routing Warning: No SuperAdmin found in system.",
      );
      throw new Error("No support staff available at this time.");
    }

    return superAdmin;
  }
}
