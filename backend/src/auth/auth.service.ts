import {
  Injectable,
  UnauthorizedException,
  NotFoundException,
  ConflictException,
  Logger,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { UserEntity } from "./user.entity";
import { JwtService } from "@nestjs/jwt";
import { LoginUserDto } from "./dto/login-user.dto";
import * as bcrypt from "bcryptjs";
import { UserResponseDto } from "./dto/admin-user.dto";
import { CreateUserDto, UpdateUserDto } from "shared/types/user";
import { Role } from "shared/types/role.enum";
import { RegisterUserDto } from './dto/register-user.dto';
import { ForgotPasswordRequestDto } from './dto/forgot-password-request.dto';
import * as crypto from 'crypto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(UserEntity)
    private usersRepository: Repository<UserEntity>,
    private jwtService: JwtService,
  ) {}

  /**
   * User Login Logic (Final Production Version)
   */
  async login(
    loginDto: LoginUserDto,
  ): Promise<{ access_token: string; user: UserResponseDto }> {
    const user = await this.usersRepository.findOne({
      where: { email: loginDto.email },
      select: ["id", "email", "password_hash", "role", "is_active", "tenant_id"],
    });

    if (!user || !user.is_active) {
      throw new UnauthorizedException(
        "Invalid credentials or user is inactive.",
      );
    }

    this.logger.log("User found. Validating password.");

    const passwordValid = await bcrypt.compare(
      loginDto.password,
      user.password_hash,
    );

    if (!passwordValid) {
      this.logger.log("Password validation failed");
      throw new UnauthorizedException("Invalid credentials.");
    }

    this.logger.log("Password validation passed.");

    const payload = {
      email: user.email,
      sub: user.id,
      role: user.role,
      tenant_id: user.tenant_id,
    };

    this.logger.log("Generating JWT token and returning user object.");
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        is_active: user.is_active,
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
      Role.AssignedProjectUser, // Default role for self-registered users
      null // tenant_id is null for self-registered users, to be assigned during tenant provisioning
    );

    return {
      id: newUser.id,
      email: newUser.email,
      role: newUser.role,
      is_active: newUser.is_active,
    };
  }

  /**
   * Handles a request to reset a user's password.
   * Generates a reset token, stores it, and (TODO) sends an email.
   */
  async requestPasswordReset(forgotPasswordDto: ForgotPasswordRequestDto): Promise<void> {
    const user = await this.usersRepository.findOne({
      where: { email: forgotPasswordDto.email, is_active: true },
    });

    // Always return a generic success message to prevent user enumeration
    if (!user) {
      this.logger.warn(`Password reset requested for non-existent or inactive user: ${forgotPasswordDto.email}`);
      return;
    }

    // 1. Generate a secure, unique reset token
    const resetToken = crypto.randomBytes(32).toString('hex');

    // 2. Hash the token before storing it in the database
    const hashedResetToken = await bcrypt.hash(resetToken, 10); // Use a salt round of 10

    // 3. Set expiry time (e.g., 1 hour from now)
    const resetTokenExpires = new Date();
    resetTokenExpires.setHours(resetTokenExpires.getHours() + 1);

    // 4. Store the hashed token and expiry in the user entity
    user.resetPasswordToken = hashedResetToken;
    user.resetPasswordExpires = resetTokenExpires;
    await this.usersRepository.save(user);

    // TODO: Send email to user with the reset link
    // The link should be something like: `${FRONTEND_URL}/reset-password?token=${resetToken}`
    // FRONTEND_URL and email sending service need to be configured.
    this.logger.log(`Password reset token generated for ${user.email}. Token (hashed): ${hashedResetToken}. Expiry: ${resetTokenExpires}`);
    this.logger.warn('TODO: Implement email sending for password reset link.');
  }

  /**
   * Phase 7 Deliverable: Admin Function - Retrieves all users (for Admin/IT Head)
   */
  async findAllUsers(): Promise<UserResponseDto[]> {
    const users = await this.usersRepository.find({
      select: ["id", "email", "role", "is_active"],
    });
    return users.map((user) => ({
      id: user.id,
      email: user.email,
      role: user.role,
      is_active: user.is_active,
    }));
  }

  /**
   * Phase 7 Deliverable: Admin Function - Creates a new user with initial role and password
   */
  async createUser(createUserDto: CreateUserDto): Promise<UserResponseDto> {
    const existing = await this.usersRepository.findOne({
      where: { email: createUserDto.email },
    });
    if (existing) {
      throw new ConflictException("User with this email already exists.");
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

    const savedUser = await this.usersRepository.save(newUser);

    return {
      id: savedUser.id,
      email: savedUser.email,
      role: savedUser.role,
      is_active: savedUser.is_active,
    };
  }

  /**
   * Phase 7 Deliverable: Admin Function - Updates a user's role/status
   */
  async updateUser(
    id: string,
    updateUserDto: UpdateUserDto,
  ): Promise<UserResponseDto> {
    const user = await this.usersRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException("User not found.");
    }

    if (updateUserDto.role) user.role = updateUserDto.role;
    if (updateUserDto.is_active !== undefined)
      user.is_active = updateUserDto.is_active;

    const updatedUser = await this.usersRepository.save(user);

    return {
      id: updatedUser.id,
      email: updatedUser.email,
      role: updatedUser.role,
      is_active: updatedUser.is_active,
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
    tenantId: string | null = null, // Allow null for self-registration initially
  ): Promise<UserEntity> {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(plainPassword, salt);

    const newUser = this.usersRepository.create({
      email,
      password_hash: hashedPassword,
      role,
      tenant_id: tenantId,
    });

    return this.usersRepository.save(newUser);
  }
}