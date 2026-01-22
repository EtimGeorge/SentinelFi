
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
  Patch,
  Param,
  Delete,
  Logger,
  UseInterceptors,
  HttpException,
  BadRequestException,
} from "@nestjs/common";
import { Response, Request } from "express";
import { AuthService } from "./auth.service";
import { LoginUserDto } from "./dto/login-user.dto";
import { RegisterUserDto } from "./dto/register-user.dto";
import { RolesGuard } from "./guards/roles.guard";
import { PermissionsGuard } from "./guards/permissions.guard";
import { Role } from "@shared/types/role.enum";
import { UserPayload } from "@shared/types/user";
import { AuthenticatedRequest } from "../common/interfaces/authenticated-request.interface";
import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateUserDto } from "./dto/update-user.dto";
import { UserResponseDto } from "./dto/admin-user.dto";
import { Throttle } from "@nestjs/throttler";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";
import { Public } from "../common/decorators/public.decorator";
import { TimeoutInterceptor } from "../common/interceptors/timeout.interceptor";
import { Roles } from "./decorators/roles.decorator";
import { RequirePermissions } from "./decorators/permissions.decorator";


/**
 * A more robust response helper to ensure proper HTTP completion and prevent hangs.
 * This is an upgrade from the previous implementation.
 */
class ResponseHelper {
    private static readonly logger = new Logger('ResponseHelper');

    static sendJson(res: Response, statusCode: number, data: any): void {
        if (res.headersSent) {
            this.logger.warn('Response already sent, cannot send JSON.');
            return;
        }
        res.setHeader('Content-Type', 'application/json');
        res.status(statusCode).json(data);
    }

    static sendError(res: Response, statusCode: number, message: string, errorType?: string): void {
        if (res.headersSent) {
            this.logger.warn('Response already sent, cannot send Error.');
            return;
        }
        const errorResponse = {
            statusCode,
            message,
            error: errorType || HttpStatus[statusCode],
            timestamp: new Date().toISOString(),
        };
        this.sendJson(res, statusCode, errorResponse);
    }
}

@Controller("auth")
@UseGuards(JwtAuthGuard, RolesGuard)
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(private readonly authService: AuthService) {}

  private setAuthCookie(response: Response, accessToken: string, rememberMe: boolean) {
    const maxAge = rememberMe ? 30 * 24 * 60 * 60 * 1000 : 60 * 60 * 1000; // 30 days or 1 hour
    response.cookie("access_token", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge,
    });
  }

  @Public()
  @Post("login/super")
  @UseInterceptors(TimeoutInterceptor) // Apply global timeout policy
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 requests per minute
  async loginSuperAdmin(
    @Body() loginDto: LoginUserDto,
    @Res() res: Response,
    @Req() req: Request,
  ): Promise<void> {
    const ipAddress = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];

    try {
      const result = await this.authService.login(loginDto.email, loginDto.password, 'SuperAdmin', ipAddress, userAgent);
      this.setAuthCookie(res, result.access_token, loginDto.rememberMe || false);
      ResponseHelper.sendJson(res, HttpStatus.OK, { success: true, user: result.user, message: "Login successful" });
    } catch (error) {
                  this.logger.error(`SuperAdmin login failed: ${error instanceof Error ? error.message : String(error)}`, error instanceof Error ? error.stack : undefined);        if (error instanceof HttpException) {
            ResponseHelper.sendError(res, error.getStatus(), error.message);
        } else {
            ResponseHelper.sendError(res, HttpStatus.INTERNAL_SERVER_ERROR, "An unexpected internal error occurred.");
        }
    }
  }

  @Public()
  @Post("login/tenant")
  @UseInterceptors(TimeoutInterceptor)
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async loginTenant(
    @Body() loginDto: LoginUserDto, // Using the same DTO for simplicity
    @Res() res: Response,
    @Req() req: Request,
  ): Promise<void> {
     const ipAddress = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket.remoteAddress;
     const userAgent = req.headers['user-agent'];

    try {
      const result = await this.authService.login(loginDto.email, loginDto.password, 'Tenant', ipAddress, userAgent);
      this.setAuthCookie(res, result.access_token, loginDto.rememberMe || false);
      ResponseHelper.sendJson(res, HttpStatus.OK, { success: true, user: result.user, message: "Login successful" });
    } catch (error) {
          this.logger.error(`Tenant login failed: ${error instanceof Error ? error.message : String(error)}`, error instanceof Error ? error.stack : undefined);
        if (error instanceof HttpException) {
            ResponseHelper.sendError(res, error.getStatus(), error.message);
        } else {
            ResponseHelper.sendError(res, HttpStatus.INTERNAL_SERVER_ERROR, "An unexpected internal error occurred.");
        }
    }
  }

  @Public()
  @Post("logout")
  @HttpCode(HttpStatus.OK)
  async logout(@Res({ passthrough: true }) response: Response) {
    response.clearCookie("access_token", { path: "/" });
    return { success: true, message: "Logged out successfully" };
  }

  @Public()
  @Post("register")
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() registerDto: RegisterUserDto): Promise<UserResponseDto> {
    return this.authService.register(registerDto);
  }
  
  // --- PROTECTED ROUTES ---

  @Get("me")
  async getCurrentUser(@Req() req: AuthenticatedRequest): Promise<UserResponseDto> {
    // The user object from JWT might be stale; always fetch the latest from DB.
    return this.authService.findUserById(req.user.id);
  }

  @Get("users")
  @Roles(Role.SuperAdmin, Role.Admin)
  async getUsers(): Promise<UserResponseDto[]> {
    return this.authService.findAllUsers();
  }

  @Post("users")
  @Roles(Role.SuperAdmin, Role.Admin)
  @RequirePermissions('users:create')
  @UseGuards(PermissionsGuard)
  @HttpCode(HttpStatus.CREATED)
  async createUser(@Req() req: AuthenticatedRequest, @Body() createUserDto: CreateUserDto): Promise<UserResponseDto> {
    return this.authService.createUser(req.user, createUserDto);
  }

  @Patch("users/:id")
  @Roles(Role.SuperAdmin, Role.Admin)
  @RequirePermissions('users:update')
  @UseGuards(PermissionsGuard)
  async updateUser(@Req() req: AuthenticatedRequest, @Param("id") id: string, @Body() updateUserDto: UpdateUserDto): Promise<UserResponseDto> {
    return this.authService.updateUser(req.user, id, updateUserDto);
  }

  @Delete("users/:id")
  @Roles(Role.SuperAdmin, Role.Admin)
  @RequirePermissions('users:delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  async softDeleteUser(@Req() req: AuthenticatedRequest, @Param("id") id: string): Promise<void> {
    await this.authService.updateUser(req.user, id, { is_active: false });
  }

  // --- IMPERSONATION ---

  @Post('impersonate/:userId')
  @Roles(Role.SuperAdmin)
  @HttpCode(HttpStatus.OK)
  async impersonate(
    @Req() req: AuthenticatedRequest,
    @Res() res: Response,
    @Param('userId') targetUserId: string,
  ): Promise<void> {
    const impersonator = req.user;
    try {
      const { access_token, user } = await this.authService.impersonate(impersonator, targetUserId);
      this.setAuthCookie(res, access_token, false); // Impersonation is always session-only
      ResponseHelper.sendJson(res, HttpStatus.OK, { success: true, user, message: `Successfully impersonating ${user.email}` });
    } catch (error) {
      this.logger.error(`Impersonation failed: ${error instanceof Error ? error.message : String(error)}`, error instanceof Error ? error.stack : undefined);
      if (error instanceof HttpException) {
          ResponseHelper.sendError(res, error.getStatus(), error.message);
      } else {
          ResponseHelper.sendError(res, HttpStatus.INTERNAL_SERVER_ERROR, "An unexpected internal error occurred during impersonation.");
      }
    }
  }

  @Post('impersonate/stop')
  @HttpCode(HttpStatus.OK)
  async stopImpersonation(
    @Req() req: AuthenticatedRequest,
    @Res() res: Response,
  ): Promise<void> {
    const impersonator = req.user;
    if (!impersonator || !impersonator.impersonator_id) {
      throw new BadRequestException('Not currently impersonating.');
    }
    try {
      await this.authService.stopImpersonation(impersonator);
      res.clearCookie("access_token", { path: "/" }); // Clear the impersonation token
      // In a more advanced scenario, the original SuperAdmin token would be stored in a separate secure cookie
      // and re-issued here. For now, we clear the token and force re-authentication.
      ResponseHelper.sendJson(res, HttpStatus.OK, { success: true, message: "Impersonation stopped. Please log in as SuperAdmin." });
    } catch (error) {
      this.logger.error(`Stop impersonation failed: ${error instanceof Error ? error.message : String(error)}`, error instanceof Error ? error.stack : undefined);
      if (error instanceof HttpException) {
          ResponseHelper.sendError(res, error.getStatus(), error.message);
      } else {
          ResponseHelper.sendError(res, HttpStatus.INTERNAL_SERVER_ERROR, "An unexpected internal error occurred while stopping impersonation.");
      }
    }
  }
}
