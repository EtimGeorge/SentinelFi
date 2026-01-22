import {
  Injectable,
  UnauthorizedException,
  NotFoundException,
  ConflictException,
  Logger,
  ForbiddenException,
  InternalServerErrorException,
  Inject,
  Scope,
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
import { AuditLogEntity } from "../audit/audit.entity";
import { SafeTransaction, RetryableQuery } from "../common/config/database.config";
import { AuditService } from "../audit/audit.service";
import { TENANT_DATA_SOURCE } from "../database/constants";

/**
 * Login attempt deduplication cache.
 * Prevents duplicate login processing during race conditions.
 */
class LoginCache {
  private cache = new Map<string, { promise: Promise<any>, timestamp: number }>();
  private readonly TTL = 3000; // 3 seconds
  private readonly logger = new Logger('LoginCache');

  get(key: string): Promise<any> | null {
    const entry = this.cache.get(key);
    if (!entry || Date.now() - entry.timestamp > this.TTL) {
      if (entry) this.cache.delete(key);
      return null;
    }
    this.logger.warn(`Duplicate login attempt for key [${key}], returning cached result.`);
    return entry.promise;
  }

  set(key: string, promise: Promise<any>): void {
    this.cache.set(key, { promise, timestamp: Date.now() });
    promise.finally(() => {
        setTimeout(() => this.cache.delete(key), this.TTL);
    });
  }
}

@Injectable({ scope: Scope.REQUEST }) // Critical: Service must be request-scoped
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly loginCache = new LoginCache();

  constructor(
    private jwtService: JwtService,
    private dataSource: DataSource, // Global DataSource for public schema
    @Inject(TENANT_DATA_SOURCE)
    private tenantDataSource: DataSource, // TenancyAwareDataSource for tenant-aware logic
    private readonly auditService: AuditService,
  ) {}

  async impersonate(impersonator: UserPayload, targetUserId: string): Promise<{ access_token: string; user: UserResponseDto }> {
    if (!impersonator.roles.some(role => role.name === Role.SuperAdmin)) {
      throw new ForbiddenException('Only SuperAdmins can impersonate users.');
    }

    const targetUser = await this.findUserById(targetUserId);
    if (!targetUser) {
      throw new NotFoundException('User to impersonate not found.');
    }

    if (targetUser.roles.some(role => role.name === Role.SuperAdmin)) {
      throw new ForbiddenException('Cannot impersonate another SuperAdmin.');
    }

    const payload: Omit<JwtPayload, 'iat' | 'exp'> = {
      email: targetUser.email,
      sub: targetUser.id,
      id: targetUser.id,
      roles: targetUser.roles.map(r => r.name),
      permissions: [], // Permissions should be resolved based on the target user's roles in the target tenant context
      tenant_id: targetUser.tenant_id ?? null,
      impersonator_id: impersonator.id, // Add impersonator ID to the token
    };

    const accessToken = this.jwtService.sign(payload, { expiresIn: '1h' }); // Short-lived token

    await this.auditService.logEvent({
        userId: impersonator.id,
        action: 'IMPERSONATION_START',
        tenantId: impersonator.tenant_id ?? null,
        details: { 
          description: `Started impersonating user ${targetUser.email} (ID: ${targetUser.id})`,
          targetUserId: targetUser.id, 
          targetUserEmail: targetUser.email 
        },
    });

    return { access_token: accessToken, user: targetUser };
  }

  async stopImpersonation(impersonator: UserPayload): Promise<void> {
    if (!impersonator.impersonator_id) {
      throw new ForbiddenException('Not currently impersonating.');
    }

    const originalSuperAdmin = await this.dataSource.getRepository(UserEntity).findOne({ 
      where: { id: impersonator.impersonator_id } 
    });
    
    if (!originalSuperAdmin) {
      this.logger.error(`Impersonator (ID: ${impersonator.impersonator_id}) not found while stopping impersonation for user (ID: ${impersonator.id}).`);
      throw new InternalServerErrorException('Original SuperAdmin not found.');
    }

    await this.auditService.logEvent({
        userId: impersonator.impersonator_id, // Logged as the original SuperAdmin
        action: 'IMPERSONATION_END',
        tenantId: originalSuperAdmin.tenant_id ?? null, // Logged against the SuperAdmin's tenant context
        details: { 
          description: `Stopped impersonating user ${impersonator.email} (ID: ${impersonator.id})`,
          impersonatedUserId: impersonator.id, 
          impersonatedUserEmail: impersonator.email 
        },
    });
  }

  /**
   * Performs user login with idempotency protection, transaction-safe audit logging,
   * and robust error handling.
   */
  async login(
    email: string,
    password: string,
    expectedRoleType: 'SuperAdmin' | 'Tenant',
    ipAddress?: string,
    userAgent?: string,
  ): Promise<{ access_token: string; user: UserResponseDto }> {
    const cacheKey = `${email}:${ipAddress || 'unknown'}`;
    const cachedPromise = this.loginCache.get(cacheKey);
    if (cachedPromise) return cachedPromise;

    const loginPromise = this.executeLogin(email, password, expectedRoleType, ipAddress, userAgent);
    this.loginCache.set(cacheKey, loginPromise);

    return loginPromise;
  }

  private async executeLogin(
    email: string,
    password: string,
    expectedRoleType: 'SuperAdmin' | 'Tenant',
    ipAddress?: string,
    userAgent?: string
  ): Promise<{ access_token: string; user: UserResponseDto }> {
    const startTime = Date.now();
    this.logger.log(`[LOGIN] Starting login for ${email}, expected type: ${expectedRoleType}`);

    let user: UserEntity | null = null; // Declare user here

    try {
      this.logger.log(`[Diagnostic] Querying public schema for user: ${email}`);
      // CRITICAL: Always use the global dataSource for authentication to ensure "public" schema access
      // OPTIMIZED: Use a more direct query for the login lookup. 
    // We trust the Eager loading defined in the entities for performance consistency.
    user = await RetryableQuery.execute(() => 
      this.dataSource.getRepository(UserEntity)
        .createQueryBuilder("user")
        .addSelect("user.password_hash") // explicitly needed as select: false
        .leftJoinAndSelect("user.tenant", "tenant")
        .leftJoinAndSelect("user.roles", "role")
        .leftJoinAndSelect("role.permissions", "permission")
        .where("user.email = :email", { email })
        .getOne(),
      3, 100
    );

      if (!user) {
        this.logger.warn(`[Diagnostic] User not found in DB: ${email}`);
        throw new UnauthorizedException("Invalid credentials.");
      }
      this.logger.log(`[Diagnostic] User found: ${user.id}. is_active: ${user.is_active}`);

      // 1. Check if user is active
      if (!user.is_active) {
        this.logger.warn(`[Diagnostic] User account is inactive: ${email}`);
        throw new UnauthorizedException("Your account is inactive. Please contact support.");
      }

      // 2. Password validation
      if (!user.password_hash) {
        this.logger.error(`[Diagnostic] User ${email} has no password hash set!`);
        throw new UnauthorizedException("Account configuration error. Please reset your password.");
      }

      this.logger.log(`[Diagnostic] Comparing passwords...`);
      const isPasswordValid = await bcrypt.compare(password, user.password_hash);
      if (!isPasswordValid) {
        this.logger.warn(`[Diagnostic] Invalid password for user: ${email}`);
        throw new UnauthorizedException("Invalid credentials.");
      }
      this.logger.log(`[Diagnostic] Password valid.`);

      // 3. Resolve role and tenant context
      this.logger.log(`[Diagnostic] Validating role for expected type: ${expectedRoleType}`);
      this.validateUserRoleAndTenant(user, expectedRoleType);
      this.logger.log(`[Diagnostic] Role validation successful.`);

      this.logger.log(`[LOGIN SUCCESS] Authentication passed for ${user.email}.`);
      
      const permissions = [...new Set(user.roles.flatMap(role => role.permissions?.map(p => p.name) || []))];
      const roleNames: Role[] = user.roles.map(role => role.name as Role);

      const payload: Omit<JwtPayload, 'iat' | 'exp'> = { 
        email: user.email, 
        sub: user.id,
        id: user.id,
        roles: roleNames,
        permissions: permissions,
        tenant_id: user.tenant_id ?? null 
      };
      
      this.logger.log(`[AuthService:Login] JWT Payload generated: ${JSON.stringify(payload)}`);
      
      const accessToken = this.jwtService.sign(payload);

    // NON-BLOCKING: Fire and forget the audit log to speed up terminal response
    this.auditService.log(
      user.id, 
      'LOGIN_SUCCESS', 
      user.tenant_id ?? null, 
      'Login successful', 
      {
          login_duration_ms: Date.now() - startTime,
          portal_type: expectedRoleType,
      },
      user.email,
      ipAddress,
      userAgent
    ).catch(err => this.logger.error(`Failed to log login success for ${email}: ${err.message}`));

    return {
        access_token: accessToken,
        user: {
          id: user.id,
          email: user.email,
          roles: this.mapRolesToSimpleRoles(user.roles),
          is_active: user.is_active,
          tenant_id: user.tenant_id,
          tenant_name: user.tenant?.name || null,
        },
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`[LOGIN] ✗ Login failed for ${email} after ${duration}ms: ${errorMessage}`);
      
      // Attempt to determine user ID for audit log based on the error
      let userIdForAudit: string | null = null;
      let reasonForAudit = errorMessage; // Store reason for audit for clarity

      if (user) { // If a user entity was successfully fetched
          userIdForAudit = user.id;
          if (errorMessage.includes('User inactive')) {
              reasonForAudit = 'User inactive';
          } else if (errorMessage.includes('Password hash missing')) {
              reasonForAudit = 'Password hash missing';
          } else if (errorMessage.includes('Invalid password')) {
              reasonForAudit = 'Invalid password';
          } else if (error instanceof ForbiddenException) {
              reasonForAudit = error.message; // Use specific Forbidden message
          }
      } else { // No user entity was fetched, or user was null
          if (errorMessage.includes('User not found')) {
              userIdForAudit = null;
              reasonForAudit = 'User not found';
          } else {
              // Generic fallback if user is null and no specific error message matches
              userIdForAudit = null; 
              reasonForAudit = 'Authentication system error';
          }
      }

      await this.logAuditAsync(
          'LOGIN_FAILURE', 
          userIdForAudit, 
          ipAddress, 
          userAgent, 
          reasonForAudit, // Pass string reason as description
          email
      );

      if (error instanceof HttpException) {
        throw error;
      }
      throw new InternalServerErrorException(`Authentication system error: ${errorMessage}`);
    }
  }

  private validateUserRoleAndTenant(user: UserEntity, expectedRoleType: 'SuperAdmin' | 'Tenant'): void {
    const isSuperAdmin = user.roles.some(role => role.name === Role.SuperAdmin);

    if (expectedRoleType === 'SuperAdmin' && !isSuperAdmin) {
      this.logger.warn(`[LOGIN FAILED] User ${user.email} attempted SuperAdmin login without SuperAdmin role.`);
      throw new ForbiddenException("Access denied. You do not have SuperAdmin privileges.");
    } else if (expectedRoleType === 'Tenant') {
      if (isSuperAdmin) {
        this.logger.warn(`[LOGIN FAILED] SuperAdmin user ${user.email} attempted Tenant login.`);
        throw new ForbiddenException("SuperAdmin accounts must log in through the SuperAdmin portal.");
      }
      if (!user.tenant_id) {
        this.logger.warn(`[LOGIN FAILED] User ${user.email} attempted Tenant login but has no tenant_id.`);
        throw new ForbiddenException("Your account is not associated with a tenant.");
      }
    }
  }

  private async logAuditAsync(
    action: string,
    userId: string | null,
    ipAddress?: string,
    userAgent?: string,
    description: string = 'No description provided',
    email?: string, // Added email parameter, used for userEmail in audit service
    tenantId?: string | null, // Added tenantId parameter, to be used in audit service
    additionalDetails?: any,
  ): Promise<void> {
    // Log audit asynchronously without blocking the main flow
    (async () => {
      try {
        await this.auditService.log(
            userId,
            action,
            tenantId ?? null,
            description,
            { ...additionalDetails, userEmail: email, ipAddress, userAgent }
        );
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error during audit logging';
        this.logger.error(`[logAuditAsync] Failed to log audit (fire-and-forget): ${errorMessage}`);
        // Swallow error - audit logging should never block operations
      }
    })(); // Immediately invoke the async function
  }

  // --- Other existing methods ---
  // These methods are retained but could be refactored with RetryableQuery in the future.

  private generateRandomPassword(): string {
    return crypto.randomBytes(16).toString("hex");
  }

  private mapRolesToSimpleRoles(roles: RoleEntity[]): SimpleRole[] {
    if (!roles) return [];
    return roles.map(role => ({ id: role.id, name: role.name as Role, description: role.description }));
  }

  async findUserByEmail(email: string): Promise<UserEntity | null> {
    return this.dataSource.getRepository(UserEntity).findOne({ 
      where: { email },
      relations: ['roles', 'tenant']
    });
  }

  async findUserById(id: string): Promise<UserResponseDto> {
    const user = await this.dataSource.getRepository(UserEntity).findOne({
      where: { id },
      relations: ['roles', 'tenant']
    });
    if (!user) throw new NotFoundException('User not found');
    return {
      id: user.id,
      email: user.email,
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
        this.dataSource.getRepository(UserEntity).findOne({ where: { email: registerDto.email } })
    );
    if (existing) {
      throw new ConflictException("User with this email already exists.");
    }

    const defaultRole = await RetryableQuery.execute(() => 
        this.dataSource.getRepository(RoleEntity).findOne({ where: { name: Role.AssignedProjectUser }})
    );
    if (!defaultRole) {
        throw new InternalServerErrorException("Default role not found. Please seed the database.");
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(registerDto.password, salt);
    
    const newUser = this.dataSource.getRepository(UserEntity).create({ 
        email: registerDto.email, 
        password_hash: hashedPassword,
        roles: [defaultRole], 
        tenant_id: registerDto.tenant_id 
    });

    const savedUser = await this.dataSource.getRepository(UserEntity).save(newUser);
    return this.findUserById(savedUser.id);
  }

  async findAllUsers(): Promise<UserResponseDto[]> {
    const users = await RetryableQuery.execute(() => 
        this.dataSource.getRepository(UserEntity).find({ relations: ["tenant", "roles"] })
    );
    return users.map((user) => ({
      id: user.id,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      roles: this.mapRolesToSimpleRoles(user.roles),
      is_active: user.is_active,
      tenant_id: user.tenant_id,
      tenant_name: user.tenant?.name || null,
    }));
  }

  async createUser(requestingUser: UserPayload, createUserDto: CreateUserDto): Promise<UserResponseDto> {
    const existing = await RetryableQuery.execute(() =>
        this.dataSource.getRepository(UserEntity).findOne({ where: { email: createUserDto.email } })
    );
    if (existing) {
      throw new ConflictException("User with this email already exists.");
    }

    const isSuperAdmin = requestingUser.roles.some(role => role.name === Role.SuperAdmin);

    if (!isSuperAdmin) {
      if (createUserDto.tenant_id && createUserDto.tenant_id !== requestingUser.tenant_id) {
        throw new ForbiddenException("You are not allowed to create users for other tenants.");
      }
      // Force user to be created in the same tenant as the admin
      createUserDto.tenant_id = requestingUser.tenant_id;
    }

    const role = await RetryableQuery.execute(() =>
        this.dataSource.getRepository(RoleEntity).findOne({ where: { name: createUserDto.role }})
    );
    if (!role) {
        throw new InternalServerErrorException(`Role '${createUserDto.role}' not found. Please seed the database.`);
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(createUserDto.password, salt);
    
    const newUser = this.dataSource.getRepository(UserEntity).create({ 
        email: createUserDto.email,
        first_name: createUserDto.first_name,
        last_name: createUserDto.last_name,
        password_hash: hashedPassword,
        roles: [role],
        tenant_id: createUserDto.tenant_id,
        is_active: createUserDto.is_active ?? true
    });

    const savedUser = await this.dataSource.getRepository(UserEntity).save(newUser);
    
    this.logger.log(`User ${savedUser.email} created successfully by ${requestingUser.email}`);
    
    return this.findUserById(savedUser.id);
  }

  async createTenantUser(createAdminUserDto: CreateTenantAdminUserDto): Promise<UserEntity & { generatedPassword?: string }> {
    const existing = await RetryableQuery.execute(() =>
        this.dataSource.getRepository(UserEntity).findOne({ where: { email: createAdminUserDto.email } })
    );
    if (existing) {
      throw new ConflictException("User with this email already exists.");
    }

    const adminRole = await RetryableQuery.execute(() =>
        this.dataSource.getRepository(RoleEntity).findOne({ where: { name: Role.Admin }})
    );
    if (!adminRole) {
        throw new InternalServerErrorException("Admin role not found. Please seed the database.");
    }

    const randomPassword = this.generateRandomPassword();
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(randomPassword, salt);
    
    const newUser = this.dataSource.getRepository(UserEntity).create({
        email: createAdminUserDto.email,
        tenant_id: createAdminUserDto.tenant_id,
        password_hash: hashedPassword,
        is_active: createAdminUserDto.is_active ?? true,
        roles: [adminRole]
    } as DeepPartial<UserEntity>);

    const savedUser = await this.dataSource.getRepository(UserEntity).save(newUser);
    
    this.logger.warn(`Generated password for new tenant admin ${savedUser.email}: ${randomPassword}`);
    
    return { ...savedUser, generatedPassword: randomPassword };
  }

  public async generateJwtToken(payload: Record<string, any>, options?: any): Promise<string> {
    return this.jwtService.sign(payload, options);
  }

  async updateUser(requestingUser: UserPayload, id: string, updateUserDto: UpdateUserDto): Promise<UserResponseDto> {
    const user = await RetryableQuery.execute(() =>
        this.dataSource.getRepository(UserEntity).findOne({ where: { id }, relations: ['roles'] })
    );
    if (!user) {
      throw new NotFoundException("User not found.");
    }

    const isSuperAdmin = requestingUser.roles.some(role => role.name === Role.SuperAdmin);

    // Only SuperAdmin can change tenant assignment
    if (updateUserDto.tenant_id !== undefined && user.tenant_id !== updateUserDto.tenant_id && !isSuperAdmin) {
      throw new ForbiddenException("You are not allowed to change a user's tenant assignment.");
    }
    
    // If role is being changed, handle it separately
    if (updateUserDto.role) {
        const newRole = await RetryableQuery.execute(() =>
            this.dataSource.getRepository(RoleEntity).findOne({ where: { name: updateUserDto.role }})
        );
        if (!newRole) {
            throw new InternalServerErrorException(`Role '${updateUserDto.role}' not found.`);
        }
        user.roles = [newRole];
    }
    
    // Delete role from DTO before merging to avoid conflicts, as it's a relation
    delete (updateUserDto as any).role;

    // Merge the rest of the DTO
    this.dataSource.getRepository(UserEntity).merge(user, updateUserDto);
    
    const savedUser = await this.dataSource.getRepository(UserEntity).save(user);
    
    this.logger.log(`User ${savedUser.email} updated successfully by ${requestingUser.email}`);

    return this.findUserById(savedUser.id);
  }
}