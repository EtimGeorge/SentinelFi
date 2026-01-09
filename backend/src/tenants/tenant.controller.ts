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
} from "@nestjs/common";

import { AuthGuard } from "@nestjs/passport";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";

import { TenantService } from "./tenant.service";

import { UpdateTenantDto } from "../superadmin/dto/create-tenant.dto";
import { TenantEntity } from "./tenant.entity";
import { Role } from "shared/types/role.enum";

@Controller("admin/tenants") // Base path: /api/v1/admin/tenants
@UseGuards(AuthGuard("jwt"), RolesGuard)
@Roles(Role.Admin, Role.Finance, Role.SuperAdmin) // All tenant management is restricted
export class TenantController {
  constructor(private readonly tenantService: TenantService) {}



  @Get()
  async findAllTenants(): Promise<TenantEntity[]> {
    return this.tenantService.findAllTenants();
  }

  @Get(":id")
  async findOneTenant(@Param("id") id: string): Promise<TenantEntity> {
    return this.tenantService.findOneTenant(id);
  }

  @Patch(":id")
  async updateTenant(
    @Param("id") id: string,
    @Body() updateTenantDto: UpdateTenantDto,
  ): Promise<TenantEntity> {
    return this.tenantService.updateTenant(
      id,
      updateTenantDto, // Pass the DTO directly
    );
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteTenant(@Param("id") id: string): Promise<void> {
    await this.tenantService.deleteTenant(id);
  }
}
