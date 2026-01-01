import {
  Controller,
  Post,
  Body,
  Get,
  UsePipes,
  ValidationPipe,
  HttpStatus,
  HttpCode,
  UseGuards,
  Req,
  Res,
  UnauthorizedException,
  Patch,
  Param,
  Delete,
  Logger,
} from "@nestjs/common";
import { AuthService } from "./auth.service";
import { AuthGuard } from "@nestjs/passport";
import { LoginUserDto } from "./dto/login-user.dto";
import { RegisterUserDto } from "./dto/register-user.dto";
import { ForgotPasswordRequestDto } from "./dto/forgot-password-request.dto"; // NEW IMPORT
import { Response } from "express";
import { RolesGuard } from "./guards/roles.guard";
import { Roles } from "./decorators/roles.decorator";
import { CreateUserDto, UpdateUserDto, JwtPayload } from "shared/types/user";
import { Role } from "shared/types/role.enum";
import { UserResponseDto } from "./dto/admin-user.dto";
import { Throttle } from "@nestjs/throttler";



import { JwtAuthGuard } from "./guards/jwt-auth.guard";
import { Public } from "./decorators/public.decorator";

@Controller("auth")
@UseGuards(JwtAuthGuard, RolesGuard)
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(private readonly authService: AuthService) {}

  /**
   * API Endpoint: POST /api/v1/auth/login
   * FINAL FIX: Proper response handling to avoid 401 conflict.
   */
  @Public()
  @Throttle({ default: { ttl: 30, limit: 5 } }) // 5 requests per 30 seconds (per IP, by default)
  @Post("login")
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ValidationPipe({ transform: true }))
  async login(
    @Body() loginDto: LoginUserDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    try {
      // 1. Get user and validate credentials (AuthService handles validation)
      const result = await this.authService.login(loginDto);

      const maxAge = loginDto.rememberMe
        ? 30 * 24 * 60 * 60 * 1000 // 30 days
        : 60 * 60 * 1000; // 1 hour

      // 2. Set the HttpOnly cookie
      response.cookie("access_token", result.access_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict", // Using 'strict' as mandated by our security policy
        maxAge: maxAge,
      });

      // 3. Return the success payload with the full user object
      return {
        success: true,
        user: result.user,
      };
    } catch (error) {
      // Catch any validation error thrown by the AuthService and convert it to 401
      // Note: NestJS's global exception filter should handle this, but explicit log is fine.
      this.logger.error("Login controller error:", error);
      throw new UnauthorizedException("Invalid credentials");
    }
  }

  /**
   * API Endpoint: POST /api/v1/auth/register
   * Allows new users to self-register with a default role.
   */
  @Public()
  @Post("register")
  @HttpCode(HttpStatus.CREATED)
  @UsePipes(new ValidationPipe({ transform: true }))
  async register(@Body() registerDto: RegisterUserDto): Promise<UserResponseDto> {
    return this.authService.register(registerDto);
  }

  /**
   * API Endpoint: POST /api/v1/auth/forgot-password-request
   * Handles requests to send a password reset email.
   */
  @Public()
  @Post("forgot-password-request")
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ValidationPipe({ transform: true }))
  async forgotPasswordRequest(@Body() forgotPasswordRequestDto: ForgotPasswordRequestDto): Promise<{ message: string }> {
    await this.authService.requestPasswordReset(forgotPasswordRequestDto);
    // Always return a generic success message to prevent user enumeration
    return { message: "If your email is registered, you will receive a password reset link." };
  }

  /**
   * API Endpoint: POST /api/v1/auth/logout
   * Clears the HttpOnly JWT cookie.
   */
  @Post("logout")
  @HttpCode(HttpStatus.OK)
  // Logout accessible to all authenticated roles
  @Roles(
    Role.Admin,
    Role.ITHead,
    Role.Finance,
    Role.OperationalHead,
    Role.AssignedProjectUser,
    Role.CEO,
  )
  async logout(@Res({ passthrough: true }) response: Response) {
    response.cookie("access_token", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      expires: new Date(0),
    });

    return { message: "Logout successful. Session cookie cleared." };
  }

  /**
   * API Endpoint: GET /api/v1/auth/test-secure
   * Used by frontend to verify HttpOnly cookie status and get user data.
   */
  @Get("test-secure")
  @Roles(
    Role.Admin,
    Role.ITHead,
    Role.Finance,
    Role.OperationalHead,
    Role.AssignedProjectUser,
    Role.CEO,
  ) // All authenticated roles
  async getProfile(@Req() req: { user: JwtPayload }) {
    return {
      message: "Authentication successful via HttpOnly cookie.",
      user_data_from_token: req.user,
    };
  }

  // --- NEW: Admin User Management Endpoints (Phase 7 Deliverable) ---

  /**
   * Phase 7 Deliverable: Admin Function - GET /api/v1/auth/users
   * Permissions: Admin, IT Head
   */
  @Get("users")
  @Roles(Role.Admin, Role.ITHead)
  async getUsers(): Promise<UserResponseDto[]> {
    return this.authService.findAllUsers();
  }

  /**
   * Phase 7 Deliverable: Admin Function - POST /api/v1/auth/users
   * Permissions: Admin, IT Head
   */
  @Post("users")
  @HttpCode(HttpStatus.CREATED)
  @Roles(Role.Admin, Role.ITHead)
  @UsePipes(new ValidationPipe({ transform: true }))
  async createUser(
    @Body() createUserDto: CreateUserDto,
  ): Promise<UserResponseDto> {
    return this.authService.createUser(createUserDto);
  }

  /**
   * Phase 7 Deliverable: Admin Function - PATCH /api/v1/auth/users/:id
   * Permissions: Admin, IT Head
   */
  @Patch("users/:id") // Use PATCH for partial updates (like just the role or is_active)
  @Roles(Role.Admin, Role.ITHead)
  @UsePipes(new ValidationPipe({ transform: true }))
  async updateUser(
    @Param("id") id: string,
    @Body() updateUserDto: UpdateUserDto,
  ): Promise<UserResponseDto> {
    return this.authService.updateUser(id, updateUserDto);
  }

  /**
   * Phase 7 Deliverable: Admin Function - DELETE /api/v1/auth/users/:id
   * Permissions: Admin, IT Head
   * Note: We'll implement a soft-delete (setting is_active=false) instead of hard delete.
   */
  @Delete("users/:id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(Role.Admin, Role.ITHead)
  async softDeleteUser(@Param("id") id: string): Promise<void> {
    await this.authService.updateUser(id, { is_active: false });
  }
}
