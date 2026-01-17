import { Controller, Get, UseGuards, Req, BadRequestException } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { TenantAccessGuard } from '../common/guards/tenant-access.guard';
import { DashboardService } from './dashboard.service';
import { AuthenticatedRequest } from '../common/interfaces/authenticated-request.interface';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@shared/types/role.enum';

@Controller('dashboard')
@UseGuards(JwtAuthGuard, RolesGuard, TenantAccessGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('summary')
  @Roles(Role.Admin, Role.Finance, Role.CEO, Role.OperationalHead, Role.ITHead, Role.AssignedProjectUser)
  async getSummary(@Req() req: AuthenticatedRequest) {
    const tenantId = req.user.tenant_id;
    
    // Although the TenantAccessGuard should prevent this, this check satisfies TypeScript
    // and provides a fallback in case the guard chain is misconfigured.
    if (!tenantId) {
      throw new BadRequestException('Cannot get summary for a user without a tenant.');
    }

    return this.dashboardService.getTenantSummary(tenantId);
  }
}
