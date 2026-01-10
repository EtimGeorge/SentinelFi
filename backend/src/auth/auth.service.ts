import {
  Injectable,
  UnauthorizedException,
  NotFoundException,
  ConflictException,
  Logger,
  ForbiddenException, // Added ForbiddenException
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, DeepPartial } from "typeorm";
import { UserEntity } from "./user.entity";
import { JwtService } from "@nestjs/jwt";
import { LoginUserDto } from "./dto/login-user.dto";
import * as bcrypt from "bcryptjs";
import { UserResponseDto } from "./dto/admin-user.dto";
import { JwtPayload, ICreateUserPayload, IUpdateUserPayload } from "@shared/types/user"; // Import shared interfaces and JwtPayload
import { CreateUserDto } from "./dto/create-user.dto"; // Import backend-specific DTO class
import { UpdateUserDto } from "./dto/update-user.dto"; // Import backend-specific DTO class
import { Role } from "@shared/types/role.enum";
import { CreateTenantAdminUserDto } from "../superadmin/dto/create-tenant-admin-user.dto"; // NEW
import { RegisterUserDto } from "./dto/register-user.dto";
import { ForgotPasswordRequestDto } from "./dto/forgot-password-request.dto";
import * as crypto from "crypto";
import { AuditService } from "../audit/audit.service";

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(UserEntity)
    private usersRepository: Repository<UserEntity>,
    private jwtService: JwtService,
    private auditService: AuditService
  ) {}

  /**
   * Generates a secure random password.
   * @returns A securely generated random password string.
   */
  private generateRandomPassword(): string {
    return crypto.randomBytes(16).toString("hex"); // 16 bytes = 32 hex characters
  }

  /**
   * User Login Logic (Final Production Version)
   */
  async login(
    loginDto: LoginUserDto
  ): Promise<{ access_token: string; user: UserResponseDto }> {
    const user = await this.usersRepository.findOne({
      where: { email: loginDto.email },
      select: [
        "id",
        "email",
        "password_hash",
        "role",
        "is_active",
        "tenant_id",
      ],
      relations: ["tenant"],
    });

    if (!user || !user.is_active) {
      await this.auditService.logEvent({
        action: "LOGIN_FAILURE",
        userEmail: loginDto.email,
        details: { reason: "Invalid credentials or user inactive" },
      });
      throw new UnauthorizedException(
        "Invalid credentials or user is inactive."
      );
    }

    this.logger.log("User found. Validating password.");

    const passwordValid = await bcrypt.compare(
      loginDto.password,
      user.password_hash
    );

    if (!passwordValid) {
      await this.auditService.logEvent({
        action: "LOGIN_FAILURE",
        userEmail: loginDto.email,
        details: { reason: "Invalid password" },
      });
      this.logger.log("Password validation failed");
      throw new UnauthorizedException("Invalid credentials.");
    }

    this.logger.log("Password validation passed.");
    this.logger.log(
      `[AuthService:Login] User fetched from DB has tenant_id: ${user.tenant_id}`
    );

    const payload = {
      email: user.email,
      sub: user.id,
      role: user.role,
      tenant_id: user.tenant_id,
    };
    this.logger.log(
      `[AuthService:Login] JWT Payload generated with tenant_id: ${payload.tenant_id}`
    );

    await this.auditService.logEvent({
      action: "LOGIN_SUCCESS",
      userId: user.id,
      userEmail: user.email,
      tenantId: user.tenant_id || undefined,
    });

    this.logger.log("Generating JWT token and returning user object.");
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        is_active: user.is_active,
        tenant_id: user.tenant_id,
        tenant_name: user.tenant ? user.tenant.name : null,
        isSuperAdmin: user.role === Role.SuperAdmin, // NEW: Populate isSuperAdmin flag
      },
    };
  }

  /**
   * Public registration for new users (self-registration).
   * Assigns a default role and creates the user in the 'public' schema initially (tenant_id is null).
   */
  async register(registerDto: RegisterUserDto): Promise<UserResponseDto> {
    const existing = await this.usersRepository.findOne({
      where: { email: registerDto.email },
    });
    if (existing) {
      throw new ConflictException("User with this email already exists.");
    }

    const newUser = await this.registerUser(
      registerDto.email,
      registerDto.password,
      Role.AssignedProjectUser,
      registerDto.tenant_id
    );

    return {
      id: newUser.id,
      email: newUser.email,
      role: newUser.role,
      is_active: newUser.is_active,
      tenant_id: newUser.tenant_id,
      tenant_name: newUser.tenant ? newUser.tenant.name : null,
    };
  }

  /**
   * Handles a request to reset a user's password.
   * Generates a reset token, stores it, and (TODO) sends an email.
   */
  async requestPasswordReset(
    forgotPasswordDto: ForgotPasswordRequestDto
  ): Promise<void> {
    const user = await this.usersRepository.findOne({
      where: { email: forgotPasswordDto.email, is_active: true },
    });

    if (!user) {
      this.logger.warn(
        `Password reset requested for non-existent or inactive user: ${forgotPasswordDto.email}`
      );
      return;
    }

    const resetToken = this.generateRandomPassword();
    const hashedResetToken = await bcrypt.hash(resetToken, 10);

    const resetTokenExpires = new Date();
    resetTokenExpires.setHours(resetTokenExpires.getHours() + 1);

    user.resetPasswordToken = hashedResetToken;
    user.resetPasswordExpires = resetTokenExpires;
    await this.usersRepository.save(user);

    this.logger.log(
      `Password reset token generated for ${user.email}. Token (hashed): ${hashedResetToken}. Expiry: ${resetTokenExpires}`
    );
    this.logger.warn("TODO: Implement email sending for password reset link.");
  }

  /**
   * Admin Function - Retrieves all users (for Admin/IT Head)
   */
  async findAllUsers(): Promise<UserResponseDto[]> {
    const users = await this.usersRepository.find({
      relations: ["tenant"],
      select: ["id", "email", "role", "is_active", "tenant_id"],
    });
    return users.map((user) => ({
      id: user.id,
      email: user.email,
      role: user.role,
      is_active: user.is_active,
      tenant_id: user.tenant_id,
      tenant_name: user.tenant ? user.tenant.name : null,
    }));
  }

  /**
   * Admin Function - Creates a new user with initial role and password
   */
    async createUser(requestingUser: JwtPayload, createUserDto: CreateUserDto): Promise<UserResponseDto> {
      const existing = await this.usersRepository.findOne({
        where: { email: createUserDto.email },
      });
      if (existing) {
        throw new ConflictException("User with this email already exists.");
      }
  
      // Role-based tenant_id assignment logic
      if (requestingUser.role !== Role.SuperAdmin) {
        // If non-SuperAdmin, they can only create users within their own tenant
        if (createUserDto.tenant_id && createUserDto.tenant_id !== requestingUser.tenant_id) {
          throw new ForbiddenException('You are not allowed to assign users to other tenants.');
        }
        // Default new user's tenant_id to requesting user's tenant_id
        createUserDto.tenant_id = requestingUser.tenant_id;
      } else {
          // If SuperAdmin, and tenant_id is not provided, default to null (system user)
          if (!createUserDto.tenant_id) {
              createUserDto.tenant_id = null;
          }
      }
  
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(createUserDto.password, salt);
  
      const newUser = this.usersRepository.create({
        email: createUserDto.email,
        password_hash: hashedPassword,
        role: createUserDto.role,
        is_active: true,
        tenant_id: createUserDto.tenant_id,
      });
  
      const savedUser: UserEntity = await this.usersRepository.save(newUser);
  
      const userWithTenant = await this.usersRepository.findOne({
        where: { id: savedUser.id },
        relations: ["tenant"],
      });
  
      await this.auditService.logEvent({
        action: "USER_CREATED",
        userId: savedUser.id,
        userEmail: savedUser.email,
        targetType: "USER",
        targetId: savedUser.id,
        details: { role: savedUser.role, tenantId: savedUser.tenant_id },
        tenantId: userWithTenant!.tenant_id || undefined, // Use tenant_id from the userWithTenant
      });
  
      return {
        id: userWithTenant!.id,
        email: userWithTenant!.email,
        role: userWithTenant!.role,
        is_active: userWithTenant!.is_active,
        tenant_id: userWithTenant!.tenant_id,
        tenant_name: userWithTenant!.tenant
          ? userWithTenant!.tenant.name
          : null,
      };
    }

  /**
   * Internal Method for SuperAdminService to create a tenant admin user.
   * Generates a random password for the user and associates them with a tenant.
   * @param createAdminUserDto DTO containing user details, including tenant_id.
   * @returns The created UserEntity.
   */
  async createTenantUser(
    createAdminUserDto: CreateTenantAdminUserDto
  ): Promise<UserEntity & { generatedPassword?: string }> { // Modified return type
    const existing = await this.usersRepository.findOne({
      where: { email: createAdminUserDto.email },
    });
    if (existing) {
      throw new ConflictException("User with this email already exists.");
    }

    const randomPassword = this.generateRandomPassword();
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(randomPassword, salt);

    const newUser = this.usersRepository.create({
      email: createAdminUserDto.email,
      password_hash: hashedPassword,
      role: createAdminUserDto.role,
      is_active: createAdminUserDto.is_active ?? true, // Use nullish coalescing for default
      tenant_id: createAdminUserDto.tenant_id,
      first_name: createAdminUserDto.first_name,
      last_name: createAdminUserDto.last_name,
    } as DeepPartial<UserEntity>); // Explicit cast to ensure type compatibility

    const savedUser: UserEntity = await this.usersRepository.save(newUser); // Explicitly type savedUser

    await this.auditService.logEvent({
      action: "TENANT_ADMIN_USER_CREATED",
      userId: savedUser.id,
      userEmail: savedUser.email,
      targetType: "USER",
      targetId: savedUser.id,
      details: { role: savedUser.role, tenantId: savedUser.tenant_id },
      tenantId: savedUser.tenant_id || undefined,
    });

    this.logger.warn(
      `Generated password for new tenant admin ${savedUser.email}: ${randomPassword}`
    );

    return { ...savedUser, generatedPassword: randomPassword }; // Modified return to include generatedPassword
  }

  /**
   * Admin Function - Updates a user's role, status, and tenant assignment
   */
  async updateUser(
    requestingUser: JwtPayload,
    id: string,
    updateUserDto: UpdateUserDto
  ): Promise<UserResponseDto> {
    const user = await this.usersRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException("User not found.");
    }

    const oldUser = { ...user }; // Moved this line up

    // Role-based tenant_id manipulation logic
    if (updateUserDto.tenant_id !== undefined) {
      // If a non-SuperAdmin tries to change tenant_id, it's forbidden.
      // Or if they try to change it to a tenant_id that's not their own (for tenant users).
      if (requestingUser.role !== Role.SuperAdmin) {
        throw new ForbiddenException('You are not allowed to change a user\'s tenant assignment.');
      }
      // If SuperAdmin, they can change tenant_id freely.
      user.tenant_id = updateUserDto.tenant_id;
    }

    if (updateUserDto.role) {
      user.role = updateUserDto.role;
    }
    if (updateUserDto.is_active !== undefined) {
      user.is_active = updateUserDto.is_active;
    }
    // tenant_id is handled above.


    const savedUser = await this.usersRepository.save(user);

    const updatedUserWithTenant = await this.usersRepository.findOne({
      where: { id: savedUser.id },
      relations: ["tenant"],
    });

    const changes: any = {};
    if (updateUserDto.role !== undefined && oldUser.role !== savedUser.role) {
      changes.role = { from: oldUser.role, to: savedUser.role };
    }
    if (
      updateUserDto.is_active !== undefined &&
      oldUser.is_active !== savedUser.is_active
    ) {
      changes.is_active = { from: oldUser.is_active, to: savedUser.is_active };
    }
    if (
      updateUserDto.tenant_id !== undefined &&
      oldUser.tenant_id !== savedUser.tenant_id // Compare with oldUser's tenant_id before update, which is now handled above
    ) {
      changes.tenant_id = { from: oldUser.tenant_id, to: savedUser.tenant_id };
    }

    if (Object.keys(changes).length > 0) {
      await this.auditService.logEvent({
        action: "USER_UPDATED",
        userId: savedUser.id,
        userEmail: savedUser.email,
        targetType: "USER",
        targetId: savedUser.id,
        details: { changes },
        tenantId: updatedUserWithTenant!.tenant_id || undefined, // Use tenant_id from updatedUserWithTenant
      });
    }

    return {
      id: updatedUserWithTenant!.id,
      email: updatedUserWithTenant!.email,
      role: updatedUserWithTenant!.role,
      is_active: updatedUserWithTenant!.is_active,
      tenant_id: updatedUserWithTenant!.tenant_id,
      tenant_name: updatedUserWithTenant!.tenant
        ? updatedUserWithTenant!.tenant.name
        : null,
    };
  }

  /**
   * User registration utility (hashes manually before save).
   * @param plainPassword The plain text password to hash.
   */
  async registerUser(
    email: string,
    plainPassword: string,
    role: Role,
    tenantId: string | null = null
  ): Promise<UserEntity> {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(plainPassword, salt);

    const newUser = this.usersRepository.create({
      email,
      password_hash: hashedPassword,
      role,
      tenant_id: tenantId,
    });

    const savedUser: UserEntity = await this.usersRepository.save(newUser);

    await this.auditService.logEvent({
      action: "USER_CREATED",
      userId: savedUser.id,
      userEmail: savedUser.email,
      targetType: "USER",
      targetId: savedUser.id,
      details: { role: savedUser.role, tenantId: savedUser.tenant_id },
      tenantId: savedUser.tenant_id || undefined,
    });

    return savedUser;
  }
}
