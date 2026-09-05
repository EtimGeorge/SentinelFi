import {
  Controller,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  Post,
  UploadedFile,
  UseInterceptors,
  UsePipes,
  ValidationPipe,
  Query,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";

import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard"; // Use new JwtAuthGuard
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";

import { TenantService } from "./tenant.service";

import {
  CreateTenantDto,
  UpdateTenantDto,
  UpdateTenantBrandingDto,
  GetTenantsDto,
} from "../superadmin/dto/create-tenant.dto";
import { TenantEntity } from "./tenant.entity";
import { Role } from "shared/types/role.enum";

import { AuthenticatedRequest } from "../common/interfaces/authenticated-request.interface";
import { ForbiddenException, Req } from "@nestjs/common";

@Controller("admin/tenants") // Base path: /api/v1/admin/tenants
@UseGuards(JwtAuthGuard, RolesGuard)
export class TenantController {
  constructor(private readonly tenantService: TenantService) {}

  /**
   * Returns metadata for the caller's own tenant.
   * Access: Tenant Admins, CFOs, etc.
   */
  @Get("my")
  @Roles(
    Role.AdminDirector,
    Role.AdminManager,
    Role.CEO,
    Role.CFO,
    Role.SuperAdmin,
  )
  async getMyTenant(@Req() req: AuthenticatedRequest): Promise<TenantEntity> {
    if (!req.user.tenant_id) {
      throw new ForbiddenException(
        "No tenant associated with this account. If you are a SuperAdmin, use the global search.",
      );
    }
    return this.tenantService.findOneTenant(req.user.tenant_id);
  }

  /**
   * Updates branding metadata for the caller's own tenant.
   * Access: Tenant Admins, CFOs, etc.
   */
  @Patch("my/branding")
  @Roles(Role.AdminDirector, Role.AdminManager, Role.CEO, Role.SuperAdmin)
  async updateMyTenantBranding(
    @Req() req: AuthenticatedRequest,
    @Body() updateTenantBrandingDto: UpdateTenantBrandingDto,
  ): Promise<TenantEntity> {
    if (!req.user.tenant_id) {
      throw new ForbiddenException("No tenant associated with this account.");
    }
    return this.tenantService.updateBranding(
      req.user.tenant_id,
      updateTenantBrandingDto,
    );
  }

  /**
   * Returns all tenants in the platform.
   * Access: SuperAdmin only.
   */
  @Get()
  @Roles(Role.SuperAdmin)
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
  async findAllTenants(@Query() query: GetTenantsDto): Promise<any> {
    return await this.tenantService.findAllTenants();
  }

  /**
   * Provisions a new tenant.
   * Access: SuperAdmin only.
   */
  @Post()
  @Roles(Role.SuperAdmin)
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(FileInterceptor("initialBudgetFile"))
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
  async createTenant(
    @Body() createTenantDto: CreateTenantDto,
    @UploadedFile() file?: Express.Multer.File,
  ): Promise<TenantEntity> {
    return this.tenantService.createTenant(createTenantDto, file);
  }

  /**
   * Find a specific tenant by ID.
   * Access: SuperAdmin only (for cross-tenant lookup).
   */
  @Get(":id")
  @Roles(Role.SuperAdmin)
  async findOneTenant(@Param("id") id: string): Promise<TenantEntity> {
    return this.tenantService.findOneTenant(id);
  }

  /**
   * Update tenant metadata.
   * Access: SuperAdmin only.
   */
  @Patch(":id")
  @Roles(Role.SuperAdmin)
  async updateTenant(
    @Param("id") id: string,
    @Body() updateTenantDto: UpdateTenantDto,
  ): Promise<TenantEntity> {
    return this.tenantService.updateTenant(id, updateTenantDto);
  }

  /**
   * Update tenant branding metadata.
   * Access: SuperAdmin only.
   */
  @Patch(":id/branding")
  @Roles(Role.SuperAdmin)
  async updateTenantBranding(
    @Param("id") id: string,
    @Body() updateTenantBrandingDto: UpdateTenantBrandingDto,
  ): Promise<TenantEntity> {
    return this.tenantService.updateBranding(id, updateTenantBrandingDto);
  }

  /**
   * Delete a tenant (destructive).
   * Access: SuperAdmin only.
   */
  @Delete(":id")
  @Roles(Role.SuperAdmin)
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteTenant(@Param("id") id: string): Promise<void> {
    await this.tenantService.deleteTenant(id);
  }
}
