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
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from 'shared/types/role.enum';
import { SuperAdminService } from './superadmin.service';
import { CreateTenantDto, UpdateTenantDto, GetTenantsDto } from './dto/create-tenant.dto';
import { UpdateTenantPlanDto } from './dto/tenant-plan.dto';
import { AuthenticatedRequest } from '../common/interfaces/authenticated-request.interface';

@Controller('super')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SuperAdminController {
  constructor(private readonly superAdminService: SuperAdminService) {}

  @Post('tenants')
  @Roles(Role.SuperAdmin)
  @HttpCode(HttpStatus.CREATED)
  @UsePipes(new ValidationPipe({ transform: true }))
  async createTenant(@Body() createTenantDto: CreateTenantDto) {
    return this.superAdminService.createTenant(createTenantDto);
  }

  @Get('tenants')
  @Roles(Role.SuperAdmin)
  @UsePipes(new ValidationPipe({ transform: true }))
  async findAllTenants(@Query() getTenantsDto: GetTenantsDto) {
    return this.superAdminService.findAllTenants(getTenantsDto);
  }

  @Patch('tenants/:id')
  @Roles(Role.SuperAdmin)
  @UsePipes(new ValidationPipe({ transform: true }))
  async updateTenant(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() updateTenantDto: UpdateTenantDto,
  ) {
    return this.superAdminService.updateTenant(id, updateTenantDto);
  }

  @Get('tenants/:id/plan')
  @Roles(Role.SuperAdmin)
  @HttpCode(HttpStatus.OK)
  async getTenantPlanDetails(
    @Param('id', new ParseUUIDPipe()) tenantId: string,
  ) {
    return this.superAdminService.getTenantPlan(tenantId);
  }

  @Patch('tenants/:id/plan')
  @Roles(Role.SuperAdmin)
  @HttpCode(HttpStatus.OK)
  async updateTenantPlanDetails(
    @Param('id', new ParseUUIDPipe()) tenantId: string,
    @Body() updateData: UpdateTenantPlanDto,
  ) {
    return this.superAdminService.updateTenantPlan(tenantId, updateData);
  }

  @Get('analytics/tenant-count')
  @Roles(Role.SuperAdmin)
  @HttpCode(HttpStatus.OK)
  async getTenantCount() {
    return this.superAdminService.getTenantCount();
  }

  @Get('analytics/tenant-growth')
  @Roles(Role.SuperAdmin)
  @HttpCode(HttpStatus.OK)
  async getTenantGrowth(@Query('period') period: string) {
    return this.superAdminService.getTenantGrowth(period);
  }

  @Get('analytics/user-growth')
  @Roles(Role.SuperAdmin)
  @HttpCode(HttpStatus.OK)
  async getUserGrowth(@Query('period') period: string) {
    return this.superAdminService.getUserGrowth(period);
  }

  @Get('analytics/system-health')
  @Roles(Role.SuperAdmin)
  @HttpCode(HttpStatus.OK)
  async getSystemHealthMetrics() {
    return this.superAdminService.getSystemHealth();
  }

  @Get('analytics/total-users')
  @Roles(Role.SuperAdmin)
  @HttpCode(HttpStatus.OK)
  async getTotalUsersCount() {
    return this.superAdminService.getTotalUsers();
  }

  @Get('analytics/mrr-estimate')
  @Roles(Role.SuperAdmin)
  @HttpCode(HttpStatus.OK)
  async getMmrEstimateValue() {
    return this.superAdminService.getMmrEstimate();
  }

  @Get('analytics/wbs-metrics')
  @Roles(Role.SuperAdmin)
  @HttpCode(HttpStatus.OK)
  async getWbsMetrics(@Query('tenantId') tenantId?: string) {
    return this.superAdminService.getWbsMetrics(tenantId);
  }

  @Get('analytics/operational-budget-metrics')
  @Roles(Role.SuperAdmin)
  @HttpCode(HttpStatus.OK)
  async getOperationalBudgetMetrics(@Query('tenantId') tenantId?: string) {
    return this.superAdminService.getOperationalBudgetMetrics(tenantId);
  }

  @Post('tenants/:id/impersonate')
  @Roles(Role.SuperAdmin)
  @HttpCode(HttpStatus.OK)
  async impersonateTenantAdmin(
    @Param('id', new ParseUUIDPipe()) tenantId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    if (!req.user || !req.user.id) {
      throw new UnauthorizedException('Impersonator user ID not found in token.');
    }
    const impersonationToken = await this.superAdminService.impersonateTenantAdmin(tenantId, req.user.id);
    return { access_token: impersonationToken };
  }
}