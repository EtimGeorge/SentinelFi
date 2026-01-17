import {
  Injectable,
  UnauthorizedException,
  NotFoundException,
  ConflictException,
  Logger,
  ForbiddenException,
  InternalServerErrorException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, DeepPartial } from "typeorm";
import { UserEntity } from "./user.entity";
import { JwtService } from "@nestjs/jwt";
import { LoginUserDto } from "./dto/login-user.dto";
import * as bcrypt from "bcryptjs";
import { UserResponseDto } from "./dto/admin-user.dto";
import { JwtPayload, SimpleRole, UserPayload } from "@shared/types/user";
import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateUserDto } from "./dto/update-user.dto";
import { Role as RoleEnum } from "@shared/types/role.enum";
import { CreateTenantAdminUserDto } from "../superadmin/dto/create-tenant-admin-user.dto";
import { RegisterUserDto } from "./dto/register-user.dto";
import * as crypto from "crypto";
import { AuditService } from "../audit/audit.service";
import { RoleEntity } from "./role.entity";

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(UserEntity)
    private usersRepository: Repository<UserEntity>,
    @InjectRepository(RoleEntity) // Inject RoleRepository
    private roleRepository: Repository<RoleEntity>,
    private jwtService: JwtService,
    private auditService: AuditService,
  ) {}

  private generateRandomPassword(): string {
    return crypto.randomBytes(16).toString("hex");
  }

  // Helper to map RoleEntity[] to SimpleRole[]
  private mapRolesToSimpleRoles(roles: RoleEntity[]): SimpleRole[] {
    return roles.map(role => ({ id: role.id, name: role.name as RoleEnum, description: role.description }));
  }

  async login(
    loginDto: LoginUserDto,
    expectedRoleType: 'SuperAdmin' | 'Tenant', // Clarify expected role type
    tenantId?: string,
  ): Promise<{ access_token: string; user: UserResponseDto }> {
    this.logger.log(`[LOGIN ATTEMPT] For email: ${loginDto.email}, expected type: ${expectedRoleType}, tenantId: ${tenantId || 'N/A'}`);

    const user = await this.usersRepository.findOne({
      where: { email: loginDto.email },
      relations: ["tenant", "roles", "roles.permissions"], // Eagerly load roles and their permissions
      // Explicitly select password_hash as it's marked with select: false in the entity
      select: [
        "id",
        "email",
        "password_hash", // <--- CRITICAL: Explicitly select the password hash
        "first_name",
        "last_name",
        "is_active",
        "created_at",
        "updated_at",
        "tenant_id",
        "resetPasswordToken",
        "resetPasswordExpires",
      ],
    });

    if (!user || !user.roles || user.roles.length === 0) {
      this.logger.warn(`[LOGIN FAILED] User not found or has no roles: ${loginDto.email}`);
      await this.auditService.logEvent({
        action: "LOGIN_FAILURE",
        userEmail: loginDto.email,
        details: { reason: "User not found or has no assigned roles" },
      });
      throw new UnauthorizedException("Invalid credentials or user not configured correctly.");
    }
    
    this.logger.log(`[LOGIN] User found: ${JSON.stringify({id: user.id, email: user.email, roles: user.roles.map(r => r.name), tenant_id: user.tenant_id})}`);
    this.logger.log(`[LOGIN] User password_hash presence: ${!!user.password_hash}`); // <--- ADDED DEBUG LOG

    if (!user.is_active) {
      this.logger.warn(`[LOGIN FAILED] User is not active: ${loginDto.email}`);
      await this.auditService.logEvent({
        action: "LOGIN_FAILURE",
        userEmail: loginDto.email,
        details: { reason: "User inactive" },
      });
      throw new UnauthorizedException("User account is inactive.");
    }

    // Role and Tenant validation
    const isSuperAdmin = user.roles.some(role => role.name === RoleEnum.SuperAdmin);

    if (expectedRoleType === 'SuperAdmin') {
        if (!isSuperAdmin) {
            this.logger.warn(`[LOGIN FAILED] User ${user.email} attempted SuperAdmin login but does not have the SuperAdmin role.`);
            throw new UnauthorizedException("Invalid credentials for SuperAdmin.");
        }
        if (user.tenant_id !== null) {
            this.logger.warn(`[LOGIN FAILED] SuperAdmin user ${user.email} has an unexpected tenant_id: ${user.tenant_id}.`);
            throw new UnauthorizedException("Invalid SuperAdmin configuration.");
        }
    } else { // Tenant login
        if (isSuperAdmin) {
            this.logger.warn(`[LOGIN FAILED] SuperAdmin user ${user.email} attempted Tenant login.`);
            throw new UnauthorizedException("SuperAdmin cannot log in via the tenant portal.");
        }
        if (!user.tenant_id) {
            this.logger.warn(`[LOGIN FAILED] User ${user.email} attempted Tenant login but has no tenant_id.`);
            throw new UnauthorizedException("User is not associated with a tenant.");
        }
        if (tenantId && user.tenant_id !== tenantId) {
            this.logger.warn(`[LOGIN FAILED] User ${user.email} provided incorrect tenantId. Expected ${user.tenant_id}, got ${tenantId}.`);
            throw new UnauthorizedException("Invalid Tenant ID.");
        }
    }

    // Check if password_hash is available before comparing
    if (!user.password_hash) {
      this.logger.error(`[LOGIN FAILED] Password hash is missing for user: ${loginDto.email}. This should not happen.`);
      await this.auditService.logEvent({
        action: "LOGIN_FAILURE",
        userEmail: loginDto.email,
        details: { reason: "Password hash missing from database record" },
      });
      throw new InternalServerErrorException("Authentication system error: password hash not found.");
    }

    const passwordValid = await bcrypt.compare(loginDto.password, user.password_hash);
    if (!passwordValid) {
      this.logger.warn(`[LOGIN FAILED] Invalid password for user: ${loginDto.email}`);
      await this.auditService.logEvent({
        action: "LOGIN_FAILURE",
        userEmail: loginDto.email,
        details: { reason: "Invalid password" },
      });
      throw new UnauthorizedException("Invalid credentials.");
    }

    this.logger.log(`[LOGIN SUCCESS] Password validation passed for ${user.email}.`);
    
    // Consolidate all permissions from all user roles into a single array
    const permissions = [...new Set(user.roles.flatMap(role => role.permissions.map(p => p.name)))];
    const roleNames: RoleEnum[] = user.roles.map(role => role.name as RoleEnum); // Explicitly type and cast

    const payload: Omit<JwtPayload, 'iat' | 'exp'> = { 
      email: user.email, 
      sub: user.id,
      id: user.id,
      roles: roleNames,
      permissions: permissions,
      tenant_id: user.tenant_id 
    };
    this.logger.log(`[AuthService:Login] JWT Payload generated: ${JSON.stringify(payload)}`);

    await this.auditService.logEvent({
      action: "LOGIN_SUCCESS",
      userId: user.id,
      userEmail: user.email,
      tenantId: user.tenant_id || undefined,
    });

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        roles: this.mapRolesToSimpleRoles(user.roles), // Map to SimpleRole[]
        is_active: user.is_active,
        tenant_id: user.tenant_id,
        tenant_name: user.tenant ? user.tenant.name : null,
      },
    };
  }

  async findUserById(id: string): Promise<UserResponseDto> {
    const user = await this.usersRepository.findOne({ where: { id }, relations: ['tenant', 'roles'] });
    if (!user) {
        throw new NotFoundException('User not found');
    }
    return {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        roles: this.mapRolesToSimpleRoles(user.roles), // Map to SimpleRole[]
        is_active: user.is_active,
        tenant_id: user.tenant_id,
        tenant_name: user.tenant ? user.tenant.name : null,
    };
  }

  async register(registerDto: RegisterUserDto): Promise<UserResponseDto> {
    const existing = await this.usersRepository.findOne({ where: { email: registerDto.email } });
    if (existing) {
      throw new ConflictException("User with this email already exists.");
    }

    const defaultRole = await this.roleRepository.findOne({ where: { name: RoleEnum.AssignedProjectUser }});
    if (!defaultRole) {
        throw new InternalServerErrorException("Default role not found. Please seed the database.");
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(registerDto.password, salt);
    
    const newUser = this.usersRepository.create({ 
        email: registerDto.email, 
        password_hash: hashedPassword,
        roles: [defaultRole], 
        tenant_id: registerDto.tenant_id 
    });

    const savedUser = await this.usersRepository.save(newUser);
    return this.findUserById(savedUser.id);
  }

  async findAllUsers(): Promise<UserResponseDto[]> {
    const users = await this.usersRepository.find({ relations: ["tenant", "roles"] });
    return users.map((user) => ({
      id: user.id,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      roles: this.mapRolesToSimpleRoles(user.roles), // Map to SimpleRole[]
      is_active: user.is_active,
      tenant_id: user.tenant_id,
      tenant_name: user.tenant ? user.tenant.name : null,
    }));
  }

  async createUser(requestingUser: UserPayload, createUserDto: CreateUserDto): Promise<UserResponseDto> {
    const existing = await this.usersRepository.findOne({ where: { email: createUserDto.email } });
    if (existing) {
      throw new ConflictException("User with this email already exists.");
    }

    const hasSuperAdminRole = requestingUser.roles.some(role => role.name === RoleEnum.SuperAdmin);

    if (!hasSuperAdminRole) {
      if (createUserDto.tenant_id && createUserDto.tenant_id !== requestingUser.tenant_id) {
        throw new ForbiddenException("You are not allowed to assign users to other tenants.");
      }
      createUserDto.tenant_id = requestingUser.tenant_id;
    }

    const role = await this.roleRepository.findOne({ where: { name: createUserDto.role }});
    if (!role) {
        throw new InternalServerErrorException(`Role '${createUserDto.role}' not found. Please seed the database.`);
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(createUserDto.password, salt);
    const newUser = this.usersRepository.create({ 
        email: createUserDto.email,
        first_name: createUserDto.first_name,
        last_name: createUserDto.last_name,
        password_hash: hashedPassword,
        roles: [role],
        tenant_id: createUserDto.tenant_id,
        is_active: createUserDto.is_active ?? true
    });
    const savedUser = await this.usersRepository.save(newUser);
    return this.findUserById(savedUser.id);
  }

  async createTenantUser(createAdminUserDto: CreateTenantAdminUserDto): Promise<UserEntity & { generatedPassword?: string }> {
    const existing = await this.usersRepository.findOne({ where: { email: createAdminUserDto.email } });
    if (existing) {
      throw new ConflictException("User with this email already exists.");
    }

    const adminRole = await this.roleRepository.findOne({ where: { name: RoleEnum.Admin }});
    if (!adminRole) {
        throw new InternalServerErrorException("Admin role not found. Please seed the database.");
    }

    const randomPassword = this.generateRandomPassword();
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(randomPassword, salt);
    const newUser = this.usersRepository.create({
        email: createAdminUserDto.email,
        tenant_id: createAdminUserDto.tenant_id,
        password_hash: hashedPassword,
        is_active: createAdminUserDto.is_active ?? true,
        roles: [adminRole]
    } as DeepPartial<UserEntity>);
    const savedUser = await this.usersRepository.save(newUser);
    this.logger.warn(`Generated password for new tenant admin ${savedUser.email}: ${randomPassword}`);
    return { ...savedUser, generatedPassword: randomPassword };
  }

  public async generateJwtToken(payload: Record<string, any>): Promise<string> {
    return this.jwtService.sign(payload);
  }

  async updateUser(requestingUser: UserPayload, id: string, updateUserDto: UpdateUserDto): Promise<UserResponseDto> {
    const user = await this.usersRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException("User not found.");
    }

    const hasSuperAdminRole = requestingUser.roles.some(role => role.name === RoleEnum.SuperAdmin);

    if (updateUserDto.tenant_id !== undefined && !hasSuperAdminRole) {
      throw new ForbiddenException("You are not allowed to change a user's tenant assignment.");
    }

    if (updateUserDto.role) {
        const newRole = await this.roleRepository.findOne({ where: { name: updateUserDto.role }});
        if (!newRole) {
            throw new InternalServerErrorException(`Role '${updateUserDto.role}' not found.`);
        }
        user.roles = [newRole];
    }
    
    // Explicitly delete role from DTO to avoid TypeORM merge conflicts if it's not a direct column
    delete (updateUserDto as any).role;

    this.usersRepository.merge(user, updateUserDto);
    const savedUser = await this.usersRepository.save(user);
    return this.findUserById(savedUser.id);
  }
}