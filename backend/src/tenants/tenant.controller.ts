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

import { CreateTenantDto, UpdateTenantDto, GetTenantsDto } from "../superadmin/dto/create-tenant.dto"; // Corrected import path
import { TenantEntity } from "./tenant.entity";
import { Role } from "shared/types/role.enum";

@Controller("admin/tenants") // Base path: /api/v1/admin/tenants
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SuperAdmin, Role.Admin, Role.Finance) // Expanded roles to match frontend TenantProjectSetupPage requirements
export class TenantController {
  constructor(private readonly tenantService: TenantService) {}

  @Get()
  @UsePipes(new ValidationPipe({ transform: true }))
  async findAllTenants(@Query() query: GetTenantsDto): Promise<any> {
    return this.tenantService.findAllTenants();
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(FileInterceptor('initialBudgetFile'))
  @UsePipes(new ValidationPipe({ transform: true }))
  async createTenant(
    @Body() createTenantDto: CreateTenantDto,
    @UploadedFile() file?: Express.Multer.File,
  ): Promise<TenantEntity> {
    return this.tenantService.createTenant(createTenantDto, file);
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
      updateTenantDto,
    );
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteTenant(@Param("id") id: string): Promise<void> {
    await this.tenantService.deleteTenant(id);
  }
}