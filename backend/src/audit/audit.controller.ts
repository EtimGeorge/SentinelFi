import { Controller, Get, Query, UseGuards, Res, Req, ForbiddenException } from '@nestjs/common'; // Added Req, ForbiddenException
import { Response } from 'express';
import { AuditService } from './audit.service';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from 'shared/types/role.enum';
import { AuditLogEntity } from './audit.entity';
import { PaginationDto, DateRangeDto } from '../common/dto/pagination.dto';
import { AuthenticatedRequest } from '../common/middleware/tenancy.middleware'; // Corrected import path
import { AuthGuard } from '@nestjs/passport'; // For @AuthGuard('jwt')
import { RolesGuard } from '../auth/guards/roles.guard'; // For @RolesGuard


@Controller('admin/audit') // Changed controller path
@UseGuards(AuthGuard('jwt'), RolesGuard) // Protect audit routes
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get('logs')
  @Roles(Role.Admin, Role.SuperAdmin, Role.ITHead) // Only authorized roles can view audit logs
  async getAuditLogs(
    @Req() req: AuthenticatedRequest, // Access req.user.tenant_id
    @Query() paginationDto: PaginationDto,
    @Query() dateRangeDto: DateRangeDto,
    @Query('userId') userId?: string,
    @Query('action') action?: string,
    @Query('targetType') targetType?: string,
  ): Promise<{ logs: AuditLogEntity[]; total: number }> {
    // Audit logs are stored in the public schema, but we should still filter by tenant context
    // This allows SuperAdmins to view all, but Admins to view only their tenant's audit logs
    const tenantIdFromUser = req.user?.tenant_id;
    const userRole = req.user?.role;
    const tenantIdFromQuery = req.query?.tenantId as string | undefined; // Get tenantId from query params

    let filterTenantId: string | undefined = undefined; // Default to all logs for SuperAdmins/ITHeads

    // SuperAdmin and IT Head can explicitly filter by any tenantId, or see all if none provided
    if (userRole === Role.SuperAdmin || userRole === Role.ITHead) {
      if (tenantIdFromQuery) {
        // If SuperAdmin/ITHead explicitly provides a tenantId in query, filter by it
        filterTenantId = tenantIdFromQuery;
      }
      // If no tenantId query param, filterTenantId remains undefined, meaning findAuditLogs will not filter by tenantId.
    } else if (tenantIdFromUser) {
      // Regular Admin can only see their own tenant's logs
      filterTenantId = tenantIdFromUser;
    } else {
        // If no tenantId is found for a non-SuperAdmin/ITHead, and they try to access audit logs
        throw new ForbiddenException("You must be assigned to a tenant to view audit logs.");
    }

    return this.auditService.findAuditLogs({
      ...paginationDto,
      ...dateRangeDto,
      userId,
      action,
      targetType,
      tenantId: filterTenantId, // Pass the refined filterTenantId
    });
  }
}
