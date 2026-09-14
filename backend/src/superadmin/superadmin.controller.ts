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
  Param,
  Patch,
  Query,
  ParseUUIDPipe,
  UnauthorizedException,
  Req,
  Delete,
  Res,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { diskStorage } from "multer";
import { Response } from "express";
import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { Role } from "shared/types/role.enum";
import { SuperAdminService } from "./superadmin.service";
import {
  CreateTenantDto,
  UpdateTenantDto,
  GetTenantsDto,
} from "./dto/create-tenant.dto";
import { UpdateTenantPlanDto } from "./dto/tenant-plan.dto";
import { ResetTenantAdminPasswordDto } from "./dto/tenant-management.dto"; // NEW
import { UpdateSuperAdminProfileDto } from "./dto/superadmin-profile.dto"; // NEW
import { ImpersonateUserDto } from "./dto/impersonate-user.dto"; // NEW: Import ImpersonateUserDto
import { AuthenticatedRequest } from "../common/interfaces/authenticated-request.interface";
import { CurrentAdmin } from "../common/decorators/current-admin.decorator";
import { IMPERSONATION_COOKIE_MAX_AGE_MS } from "./constants";
import { AuthService } from "../auth/auth.service";
import { ConfirmMfaDto, DisableMfaDto } from "./dto/mfa.dto";

const TENANT_BUDGET_UPLOAD_DIR = path.join(
  process.cwd(),
  "uploads",
  "tenant-budgets",
);

function ensureUploadDir(dir: string): void {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

const BUDGET_FILE_FILTER = /\.(csv|xlsx?|json)$/i;

@Controller("super")
@UseGuards(JwtAuthGuard, RolesGuard)
export class SuperAdminController {
  constructor(
    private readonly superAdminService: SuperAdminService,
    private readonly authService: AuthService,
  ) {}

  @Post("tenants")
  @Roles("SuperAdmin")
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(
    FileInterceptor("initialBudgetFile", {
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          ensureUploadDir(TENANT_BUDGET_UPLOAD_DIR);
          cb(null, TENANT_BUDGET_UPLOAD_DIR);
        },
        filename: (_req, file, cb) => {
          const ext = path.extname(file.originalname) || ".csv";
          const safeName = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}${ext}`;
          cb(null, safeName);
        },
      }),
      limits: { fileSize: 10 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        if (!BUDGET_FILE_FILTER.test(file.originalname)) {
          return cb(
            new BadRequestException(
              "Initial budget file must be CSV, XLSX, or JSON.",
            ),
            false,
          );
        }
        cb(null, true);
      },
    }),
  )
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
  async createTenant(
    @Body() createTenantDto: CreateTenantDto,
    @UploadedFile() initialBudgetFile?: Express.Multer.File,
    @CurrentAdmin() admin?: CurrentAdmin,
  ) {
    return this.superAdminService.createTenant(
      createTenantDto,
      admin,
      initialBudgetFile,
    );
  }

  @Get("tenants")
  @Roles("SuperAdmin")
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
  async findAllTenants(@Query() getTenantsDto: GetTenantsDto) {
    try {
      return await this.superAdminService.findAllTenants(getTenantsDto);
    } catch (error) {
      console.error("[SuperAdminController] findAllTenants Error:", error);
      throw error;
    }
  }

  @Patch("tenants/:id")
  @Roles("SuperAdmin")
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
  async updateTenant(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body() updateTenantDto: UpdateTenantDto,
    @CurrentAdmin() admin?: CurrentAdmin,
  ) {
    return this.superAdminService.updateTenant(id, updateTenantDto, admin);
  }

  @Get("tenants/:id/plan")
  @Roles("SuperAdmin")
  @HttpCode(HttpStatus.OK)
  async getTenantPlanDetails(
    @Param("id", new ParseUUIDPipe()) tenantId: string,
  ) {
    return this.superAdminService.getTenantPlan(tenantId);
  }

  @Patch("tenants/:id/plan")
  @Roles("SuperAdmin")
  @HttpCode(HttpStatus.OK)
  async updateTenantPlanDetails(
    @Param("id", new ParseUUIDPipe()) tenantId: string,
    @Body() updateData: UpdateTenantPlanDto,
    @CurrentAdmin() admin?: CurrentAdmin,
  ) {
    return this.superAdminService.updateTenantPlan(tenantId, updateData, admin);
  }

  @Get("analytics/tenant-count")
  @Roles("SuperAdmin")
  @HttpCode(HttpStatus.OK)
  async getTenantCount() {
    return this.superAdminService.getTenantCount();
  }

  @Get("analytics/tenant-growth")
  @Roles("SuperAdmin")
  @HttpCode(HttpStatus.OK)
  async getTenantGrowth(@Query("period") period: string) {
    return this.superAdminService.getTenantGrowth(period);
  }

  @Get("analytics/user-growth")
  @Roles("SuperAdmin")
  @HttpCode(HttpStatus.OK)
  async getUserGrowth(@Query("period") period: string) {
    return this.superAdminService.getUserGrowth(period);
  }

  @Get("analytics/system-health")
  @Roles("SuperAdmin")
  @HttpCode(HttpStatus.OK)
  async getSystemHealthMetrics() {
    return this.superAdminService.getSystemHealth();
  }

  @Get("analytics/total-users")
  @Roles("SuperAdmin")
  @HttpCode(HttpStatus.OK)
  async getTotalUsersCount() {
    return this.superAdminService.getTotalUsers();
  }

  @Get("analytics/mrr-estimate")
  @Roles("SuperAdmin")
  @HttpCode(HttpStatus.OK)
  async getMmrEstimateValue() {
    return this.superAdminService.getMmrEstimate();
  }

  @Get("analytics/wbs-metrics")
  @Roles("SuperAdmin")
  @HttpCode(HttpStatus.OK)
  async getWbsMetrics(@Query("tenantId") tenantId?: string) {
    return this.superAdminService.getWbsMetrics(tenantId);
  }

  @Get("analytics/operational-budget-metrics")
  @Roles("SuperAdmin")
  @HttpCode(HttpStatus.OK)
  async getOperationalBudgetMetrics(@Query("tenantId") tenantId?: string) {
    return this.superAdminService.getOperationalBudgetMetrics(tenantId);
  }

  @Get("analytics/plan-distribution")
  @Roles("SuperAdmin")
  @HttpCode(HttpStatus.OK)
  async getPlanDistribution() {
    return this.superAdminService.getPlanDistribution();
  }

  @Post("impersonate") // Changed path
  @Roles("SuperAdmin")
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
  async impersonateUser(
    @Body() impersonateUserDto: ImpersonateUserDto, // Changed from Param to Body with DTO
    @Req() req: AuthenticatedRequest,
    @Res({ passthrough: true }) res: Response,
  ) {
    if (!req.user || !req.user.id) {
      throw new UnauthorizedException(
        "Impersonator user ID not found in token.",
      );
    }
    // Call the new service method
    const impersonationToken = await this.superAdminService.impersonateUser(
      impersonateUserDto.userId,
      req.user.id,
    );
    // Set httpOnly cookie (secure) so frontend does not need js-cookie (XSS mitigation)
    const isProduction = process.env.NODE_ENV === "production";
    res.cookie("access_token", impersonationToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: "lax",
      path: "/",
      maxAge: IMPERSONATION_COOKIE_MAX_AGE_MS, // matches token expiry (30 min)
    });
    return { access_token: impersonationToken };
  }

  @Post("tenants/:tenantId/impersonate")
  @Roles("SuperAdmin")
  @HttpCode(HttpStatus.OK)
  async impersonateTenant(
    @Param("tenantId", new ParseUUIDPipe()) tenantId: string,
    @Req() req: AuthenticatedRequest,
    @Res({ passthrough: true }) res: Response,
  ) {
    if (!req.user || !req.user.id) {
      throw new UnauthorizedException(
        "Impersonator user ID not found in token.",
      );
    }
    const impersonationToken = await this.superAdminService.impersonateTenant(
      tenantId,
      req.user.id,
    );
    const isProduction = process.env.NODE_ENV === "production";
    res.cookie("access_token", impersonationToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: "lax",
      path: "/",
      maxAge: IMPERSONATION_COOKIE_MAX_AGE_MS,
    });
    return { access_token: impersonationToken };
  }

  // --- NEW TENANT MANAGEMENT ENDPOINTS ---

  @Delete("tenants/:id")
  @Roles("SuperAdmin")
  @HttpCode(HttpStatus.NO_CONTENT)
  async softDeleteTenant(
    @Param("id", new ParseUUIDPipe()) id: string,
    @CurrentAdmin() admin?: CurrentAdmin,
  ) {
    return this.superAdminService.softDeleteTenant(id, admin);
  }

  @Patch("tenants/:id/reset-password")
  @Roles("SuperAdmin")
  @HttpCode(HttpStatus.OK)
  async resetTenantAdminPassword(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body() resetDto: ResetTenantAdminPasswordDto,
    @CurrentAdmin() admin?: CurrentAdmin,
  ) {
    return this.superAdminService.resetTenantAdminPassword(id, resetDto, admin);
  }

  // --- SUPERADMIN SELF-MANAGEMENT ---

  @Patch("profile")
  @Roles("SuperAdmin")
  @HttpCode(HttpStatus.OK)
  async updateProfile(
    @Req() req: AuthenticatedRequest,
    @Body() updateDto: UpdateSuperAdminProfileDto,
  ) {
    if (!req.user || !req.user.id) {
      throw new UnauthorizedException("User ID not found in token.");
    }
    return this.superAdminService.updateSuperAdminProfile(
      req.user.id,
      updateDto,
    );
  }

  // --- SUPERADMIN TOTP MFA (self-service) ---

  @Get("mfa/status")
  @Roles("SuperAdmin")
  @HttpCode(HttpStatus.OK)
  async getMfaStatus(@CurrentAdmin() admin: CurrentAdmin) {
    return this.authService.getMfaStatus(admin.id);
  }

  @Post("mfa/enroll")
  @Roles("SuperAdmin")
  @HttpCode(HttpStatus.OK)
  async enrollMfa(@CurrentAdmin() admin: CurrentAdmin) {
    return this.authService.startMfaEnrollment(admin.id, admin.email);
  }

  @Post("mfa/confirm")
  @Roles("SuperAdmin")
  @HttpCode(HttpStatus.OK)
  async confirmMfa(
    @CurrentAdmin() admin: CurrentAdmin,
    @Body() confirmMfaDto: ConfirmMfaDto,
  ) {
    await this.authService.confirmMfaEnrollment(
      admin.id,
      confirmMfaDto.code,
      admin.email,
    );
    return {
      success: true,
      message: "Two-factor authentication enabled successfully.",
    };
  }

  @Post("mfa/disable")
  @Roles("SuperAdmin")
  @HttpCode(HttpStatus.OK)
  async disableMfa(
    @CurrentAdmin() admin: CurrentAdmin,
    @Body() disableMfaDto: DisableMfaDto,
  ) {
    await this.authService.disableSuperAdminMfa(
      admin.id,
      disableMfaDto.currentPassword,
      admin.email,
    );
    return {
      success: true,
      message:
        "Two-factor authentication disabled. All active sessions have been revoked.",
    };
  }
}
