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
import { LoginUserDto } from "./dto/login-user.dto";
import { LoginTenantDto } from "./dto/login-tenant.dto";
import { RegisterUserDto } from "./dto/register-user.dto";
import { Response } from "express";
import { RolesGuard } from "./guards/roles.guard";
import { Roles } from "./decorators/roles.decorator";
import { PermissionsGuard } from "./guards/permissions.guard"; // Import PermissionsGuard
import { RequirePermissions } from "./decorators/permissions.decorator"; // Import RequirePermissions
import { Role } from "@shared/types/role.enum";
import { UserPayload } from "@shared/types/user";
import { AuthenticatedRequest } from "../common/interfaces/authenticated-request.interface";
import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateUserDto } from "./dto/update-user.dto";
import { UserResponseDto } from "./dto/admin-user.dto";
import { Throttle } from "@nestjs/throttler";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";
import { Public } from "./decorators/public.decorator";

@Controller("auth")
@UseGuards(JwtAuthGuard, RolesGuard)
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(private readonly authService: AuthService) {}

  private setAuthCookie(
    response: Response,
    accessToken: string,
    rememberMe: boolean,
  ) {
    const maxAge = rememberMe ? 30 * 24 * 60 * 60 * 1000 : 60 * 60 * 1000;
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax" as const,
      path: "/",
      maxAge: maxAge,
    };
    this.logger.log(
      `[Login] Setting cookie with options: ${JSON.stringify(cookieOptions)}`,
    );
    response.cookie("access_token", accessToken, cookieOptions);
  }

  @Public()
  @Throttle({ default: { ttl: 30, limit: 5 } })
  @Post("login/super")
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ValidationPipe({ transform: true }))
  async loginSuperAdmin(
    @Body() loginDto: LoginUserDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    try {
      const result = await this.authService.login(loginDto, 'SuperAdmin');
      this.setAuthCookie(
        response,
        result.access_token,
        loginDto.rememberMe || false,
      );
      return { success: true, user: result.user, access_token: result.access_token }; // <--- MODIFIED
    } catch (error) {
      this.logger.error("SuperAdmin login controller error:", error);
      if (error instanceof Error) {
        throw new UnauthorizedException(error.message);
      }
      throw new UnauthorizedException("Invalid credentials");
    }
  }

  @Public()
  @Throttle({ default: { ttl: 30, limit: 5 } })
  @Post("login/tenant")
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ValidationPipe({ transform: true }))
  async loginTenant(
    @Body() loginDto: LoginTenantDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    try {
      const result = await this.authService.login(
        loginDto,
        'Tenant',
        loginDto.tenantId,
      );
      this.setAuthCookie(
        response,
        result.access_token,
        loginDto.rememberMe || false,
      );
      return { success: true, user: result.user, access_token: result.access_token }; // <--- MODIFIED
    } catch (error) {
      this.logger.error("Tenant login controller error:", error);
      if (error instanceof Error) {
        throw new UnauthorizedException(error.message);
      }
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
      sameSite: "lax" as const,
      path: "/",
    });
    return { success: true, message: "Logged out successfully" };
  }

  @Public()
  @Post("register")
  @HttpCode(HttpStatus.CREATED)
  @UsePipes(new ValidationPipe({ transform: true }))
  async register(
    @Body() registerDto: RegisterUserDto,
  ): Promise<UserResponseDto> {
    return this.authService.register(registerDto);
  }

  @Get("test-secure")
  async getProfile(@Req() req: AuthenticatedRequest) {
    this.logger.log(`[test-secure] req.user: ${JSON.stringify(req.user)}`);
    return {
      message: "Authentication successful via HttpOnly cookie.",
      user_data_from_token: req.user,
    };
  }

  @Get("validate")
  async validateToken(
    @Req() req: AuthenticatedRequest,
  ): Promise<{ valid: boolean; user: UserPayload }> {
    return { valid: true, user: req.user };
  }

  @Get("me")
  async getCurrentUser(
    @Req() req: AuthenticatedRequest,
  ): Promise<UserResponseDto> {
    return this.authService.findUserById(req.user.id);
  }

  // Admin endpoints
  @Get("users")
  @Roles(Role.Admin, Role.ITHead, Role.SuperAdmin)
  async getUsers(): Promise<UserResponseDto[]> {
    return this.authService.findAllUsers();
  }

  @Post("users")
  @Roles(Role.Admin, Role.ITHead, Role.SuperAdmin)
  @RequirePermissions('users:create') // Apply permission guard
  @UseGuards(PermissionsGuard) // Apply PermissionsGuard
  @HttpCode(HttpStatus.CREATED)
  @UsePipes(new ValidationPipe({ transform: true }))
  async createUser(
    @Req() req: AuthenticatedRequest,
    @Body() createUserDto: CreateUserDto,
  ): Promise<UserResponseDto> {
    return this.authService.createUser(req.user, createUserDto);
  }

  @Patch("users/:id")
  @Roles(Role.Admin, Role.ITHead, Role.SuperAdmin)
  @RequirePermissions('users:update') // Apply permission guard
  @UseGuards(PermissionsGuard) // Apply PermissionsGuard
  @UsePipes(new ValidationPipe({ transform: true }))
  async updateUser(
    @Req() req: AuthenticatedRequest,
    @Param("id") id: string,
    @Body() updateUserDto: UpdateUserDto,
  ): Promise<UserResponseDto> {
    return this.authService.updateUser(req.user, id, updateUserDto);
  }

  @Delete("users/:id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(Role.Admin, Role.ITHead, Role.SuperAdmin) // SuperAdmin can also delete users
  @RequirePermissions('users:delete') // Apply permission guard
  @UseGuards(PermissionsGuard) // Apply PermissionsGuard
  async softDeleteUser(
    @Req() req: AuthenticatedRequest,
    @Param("id") id: string,
  ): Promise<void> {
    await this.authService.updateUser(req.user, id, { is_active: false });
  }
}
