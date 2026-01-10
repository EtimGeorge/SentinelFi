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
import { ForgotPasswordRequestDto } from "./dto/forgot-password-request.dto";
import { Response } from "express";
import { RolesGuard } from "./guards/roles.guard";
import { Roles } from "./decorators/roles.decorator";
import { JwtPayload } from "@shared/types/user"; // Import shared interface for JwtPayload
import { Role } from "@shared/types/role.enum"; // Import shared enum for Role
import { CreateUserDto as BackendCreateUserDto } from "./dto/create-user.dto"; // Import backend-specific DTO class
import { UpdateUserDto as BackendUpdateUserDto } from "./dto/update-user.dto"; // Import backend-specific DTO class
import { UserResponseDto } from "./dto/admin-user.dto";
import { Throttle } from "@nestjs/throttler";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";
import { Public } from "./decorators/public.decorator";

@Controller("auth")
@UseGuards(JwtAuthGuard, RolesGuard) // Apply JwtAuthGuard and RolesGuard at the controller level
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(private readonly authService: AuthService) {}

  @Public()
  @Throttle({ default: { ttl: 30, limit: 5 } })
  @Post("login")
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ValidationPipe({ transform: true }))
  async login(
    @Body() loginDto: LoginUserDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    try {
      const result = await this.authService.login(loginDto);
      const maxAge = loginDto.rememberMe ? 30 * 24 * 60 * 60 * 1000 : 60 * 60 * 1000;
      
      const cookieOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax" as const, // CRITICAL FIX: Changed from 'strict' to 'lax' for local development
        path: '/', // CRITICAL FIX: Ensure cookie is valid for all paths
        maxAge: maxAge,
        // Only set domain in production to allow `localhost` to `127.0.0.1` cookie sharing during development
        ...(process.env.NODE_ENV === "production" && { domain: process.env.COOKIE_DOMAIN }),
      };

      this.logger.log(`[Login] Setting cookie with options: ${JSON.stringify(cookieOptions)}`);
      
      response.cookie("access_token", result.access_token, cookieOptions);
      
      return { success: true, user: result.user };
    } catch (error) {
      this.logger.error("Login controller error:", error);
      throw new UnauthorizedException("Invalid credentials");
    }
  }

  @Public()
  @Post("logout")
  @HttpCode(HttpStatus.OK)
  async logout(@Res({ passthrough: true }) response: Response) {
    response.clearCookie("access_token", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax" as const, // CRITICAL FIX: Changed from 'strict' to 'lax'
      path: '/', // Ensure the path matches the cookie being cleared
      // Only set domain in production
      ...(process.env.NODE_ENV === "production" && { domain: process.env.COOKIE_DOMAIN }),
    });
    return { success: true, message: "Logged out successfully" };
  }

  @Public()
  @Post("register")
  @HttpCode(HttpStatus.CREATED)
  @UsePipes(new ValidationPipe({ transform: true }))
  async register(@Body() registerDto: RegisterUserDto): Promise<UserResponseDto> {
    return this.authService.register(registerDto); 
  }

  // @Public() // REMOVED TEMPORARY FIX: This endpoint should NOT be public. It's for verifying authenticated sessions.
  @Get("test-secure")
  // @UseGuards(RolesGuard) // RolesGuard is already applied globally at controller level
  async getProfile(@Req() req: { user: JwtPayload }) {
    this.logger.log(`[test-secure] req.user: ${JSON.stringify(req.user)}`);
    return {
      message: "Authentication successful via HttpOnly cookie.",
      user_data_from_token: req.user, // CRITICAL FIX: Changed 'user' to 'user_data_from_token'
    };
  }

  // Admin endpoints
  @Get("users")
  @Roles(Role.Admin, Role.ITHead) // Ensure roles are correctly defined
  // @UseGuards(RolesGuard) // Already applied globally
  async getUsers(): Promise<UserResponseDto[]> {
    return this.authService.findAllUsers();
  }

  @Post("users")
  @Roles(Role.Admin, Role.ITHead, Role.SuperAdmin) // Allow SuperAdmin to create users
  // @UseGuards(RolesGuard) // Already applied globally
  @HttpCode(HttpStatus.CREATED)
  @UsePipes(new ValidationPipe({ transform: true }))
  async createUser(
    @Req() req: { user: JwtPayload }, // Inject requesting user's data
    @Body() createUserDto: BackendCreateUserDto
  ): Promise<UserResponseDto> {
    return this.authService.createUser(req.user, createUserDto);
  }

  @Patch("users/:id") // Changed from Put to Patch as per previous discussions
  @Roles(Role.Admin, Role.ITHead, Role.SuperAdmin) // Allow SuperAdmin to update users
  // @UseGuards(RolesGuard) // Already applied globally
  @UsePipes(new ValidationPipe({ transform: true }))
  async updateUser(
    @Req() req: { user: JwtPayload }, // Inject requesting user's data
    @Param("id") id: string,
    @Body() updateUserDto: BackendUpdateUserDto,
  ): Promise<UserResponseDto> {
    return this.authService.updateUser(req.user, id, updateUserDto);
  }

  @Delete("users/:id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(Role.Admin, Role.ITHead)
  // @UseGuards(RolesGuard) // Already applied globally
  async softDeleteUser(
    @Req() req: { user: JwtPayload },
    @Param("id") id: string,
  ): Promise<void> {
    // Assuming deleteUser in authService handles soft delete
    await this.authService.updateUser(req.user, id, { is_active: false });
  }
}