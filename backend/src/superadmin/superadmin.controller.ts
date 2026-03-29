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
} from "@nestjs/common";
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

@Controller("super")
@UseGuards(JwtAuthGuard, RolesGuard)
export class SuperAdminController {
  constructor(private readonly superAdminService: SuperAdminService) {}

  @Post("tenants")
  @Roles("SuperAdmin")
  @HttpCode(HttpStatus.CREATED)
  @UsePipes(new ValidationPipe({ transform: true }))
  async createTenant(@Body() createTenantDto: CreateTenantDto) {
    return this.superAdminService.createTenant(createTenantDto);
  }

  @Get("tenants")
  @Roles("SuperAdmin")
  @UsePipes(new ValidationPipe({ transform: true }))
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
  @UsePipes(new ValidationPipe({ transform: true }))
  async updateTenant(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body() updateTenantDto: UpdateTenantDto,
  ) {
    return this.superAdminService.updateTenant(id, updateTenantDto);
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
  ) {
    return this.superAdminService.updateTenantPlan(tenantId, updateData);
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
  @UsePipes(new ValidationPipe({ transform: true })) // Add validation pipe for DTO
  async impersonateUser(
    @Body() impersonateUserDto: ImpersonateUserDto, // Changed from Param to Body with DTO
    @Req() req: AuthenticatedRequest,
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
    return { access_token: impersonationToken };
  }

  @Post("tenants/:tenantId/impersonate")
  @Roles("SuperAdmin")
  @HttpCode(HttpStatus.OK)
  async impersonateTenant(
    @Param("tenantId", new ParseUUIDPipe()) tenantId: string,
    @Req() req: AuthenticatedRequest,
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
    return { access_token: impersonationToken };
  }

  @Post("impersonate/stop")
  @Roles("SuperAdmin")
  @HttpCode(HttpStatus.OK)
  async stopImpersonation(
    @Body("userId") userId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    if (!req.user || !req.user.id) {
      throw new UnauthorizedException("SuperAdmin ID not found.");
    }
    await this.superAdminService.stopImpersonation(req.user.id, userId);
    return { success: true };
  }

  // --- NEW TENANT MANAGEMENT ENDPOINTS ---

  @Delete("tenants/:id")
  @Roles("SuperAdmin")
  @HttpCode(HttpStatus.NO_CONTENT)
  async softDeleteTenant(@Param("id", new ParseUUIDPipe()) id: string) {
    return this.superAdminService.softDeleteTenant(id);
  }

  @Patch("tenants/:id/reset-password")
  @Roles("SuperAdmin")
  @HttpCode(HttpStatus.OK)
  async resetTenantAdminPassword(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body() resetDto: ResetTenantAdminPasswordDto,
  ) {
    return this.superAdminService.resetTenantAdminPassword(id, resetDto);
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
}
