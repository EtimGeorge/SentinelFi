import {
  Controller,
  Get,
  Patch,
  Post,
  Body,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
  UsePipes,
  ValidationPipe,
  ForbiddenException,
} from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { Role } from "shared/types/role.enum";
import { AuthenticatedRequest } from "../common/interfaces/authenticated-request.interface";
import {
  TenantSettingsService,
  SubscriptionMetrics,
  TenantSettingsResponse,
} from "./tenant-settings.service";
import {
  UpdateTenantSettingsDto,
  TestSmtpDto,
} from "./dto/tenant-settings.dto";

/**
 * REST controller for tenant-scoped settings.
 * Routes are scoped to `/api/v1/settings/` and operate on the calling user's tenant.
 *
 * Security model:
 * - All endpoints require authentication (JwtAuthGuard).
 * - Read endpoints are accessible to any role with admin-level access.
 * - Write endpoints are restricted to AdminDirector / TechnicalDirector.
 * - SuperAdmins can act on any tenant in future (extend with @Param if needed).
 */
@Controller("settings")
@UseGuards(JwtAuthGuard, RolesGuard)
export class TenantSettingsController {
  constructor(private readonly tenantSettingsService: TenantSettingsService) {}

  private assertTenantId(req: AuthenticatedRequest): string {
    const tenantId = req.user.tenant_id;
    if (!tenantId) {
      throw new ForbiddenException("No tenant associated with this account.");
    }
    return tenantId;
  }

  /**
   * GET /api/v1/settings
   * Returns the current tenant's settings (secrets masked).
   */
  @Get()
  @Roles(
    Role.SuperAdmin,
    Role.AdminDirector,
    Role.TechnicalDirector,
    Role.CEO,
    Role.CFO,
  )
  async getSettings(
    @Req() req: AuthenticatedRequest,
  ): Promise<TenantSettingsResponse> {
    const tenantId = this.assertTenantId(req);
    return this.tenantSettingsService.getSettings(tenantId);
  }

  /**
   * PATCH /api/v1/settings
   * Updates tenant settings. Only admin-level roles may update.
   */
  @Patch()
  @Roles(Role.SuperAdmin, Role.AdminDirector, Role.TechnicalDirector)
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async updateSettings(
    @Req() req: AuthenticatedRequest,
    @Body() dto: UpdateTenantSettingsDto,
  ): Promise<TenantSettingsResponse> {
    const tenantId = this.assertTenantId(req);
    return this.tenantSettingsService.updateSettings(
      tenantId,
      dto,
      req.user.id,
    );
  }

  /**
   * GET /api/v1/settings/subscription
   * Returns subscription health metrics (user quota, storage, expiry).
   */
  @Get("subscription")
  @Roles(
    Role.SuperAdmin,
    Role.AdminDirector,
    Role.TechnicalDirector,
    Role.CEO,
    Role.CFO,
    Role.FinanceManager,
  )
  async getSubscriptionMetrics(
    @Req() req: AuthenticatedRequest,
  ): Promise<SubscriptionMetrics> {
    const tenantId = this.assertTenantId(req);
    return this.tenantSettingsService.getSubscriptionMetrics(tenantId);
  }

  /**
   * POST /api/v1/settings/test-smtp
   * Validates the saved SMTP configuration by sending a test email.
   */
  @Post("test-smtp")
  @Roles(Role.SuperAdmin, Role.AdminDirector, Role.TechnicalDirector)
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async testSmtp(
    @Req() req: AuthenticatedRequest,
    @Body() dto: TestSmtpDto,
  ): Promise<{ success: boolean; message: string }> {
    const tenantId = this.assertTenantId(req);
    return this.tenantSettingsService.testSmtpConnection(tenantId, dto.to);
  }

  /**
   * POST /api/v1/settings/test-erp
   * Validates the saved ERP/API configuration by probing the base URL.
   */
  @Post("test-erp")
  @Roles(Role.SuperAdmin, Role.AdminDirector, Role.TechnicalDirector)
  @HttpCode(HttpStatus.OK)
  async testErp(
    @Req() req: AuthenticatedRequest,
  ): Promise<{ success: boolean; message: string; statusCode?: number }> {
    const tenantId = this.assertTenantId(req);
    return this.tenantSettingsService.testErpConnection(tenantId);
  }
}
