import {
  Controller,
  Get,
  Query,
  UseGuards,
  Res,
  Req,
  ForbiddenException,
} from "@nestjs/common";
import { Response } from "express";
import { AuditService } from "./audit.service";
import { Roles } from "../auth/decorators/roles.decorator";
import { Role as RoleEnum } from "@shared/types/role.enum";
import { AuditLogEntity } from "./audit.entity";
import { PaginationDto, DateRangeDto } from "../common/dto/pagination.dto";
import { AuthenticatedRequest } from "../common/interfaces/authenticated-request.interface";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";

@Controller("admin/audit")
@UseGuards(JwtAuthGuard, RolesGuard)
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get("logs")
  @Roles(RoleEnum.Admin, RoleEnum.SuperAdmin, RoleEnum.ITHead, RoleEnum.CEO, RoleEnum.Finance)
  async getAuditLogs(
    @Req() req: AuthenticatedRequest,
    @Query() paginationDto: PaginationDto,
    @Query() dateRangeDto: DateRangeDto,
    @Query("userId") userId?: string,
    @Query("action") action?: string,
    @Query("targetType") targetType?: string,
  ): Promise<{ logs: AuditLogEntity[]; total: number }> {
    const tenantIdFromUser = req.user?.tenant_id;
    const userRoles = req.user?.roles.map(r => r.name) || [];
    const tenantIdFromQuery = req.query?.tenantId as string | undefined;

    let filterTenantId: string | undefined = undefined;

    // SuperAdmins and ITHeads can view logs across tenants if they provide a tenantId in the query
    if (userRoles.includes(RoleEnum.SuperAdmin) || userRoles.includes(RoleEnum.ITHead)) {
      if (tenantIdFromQuery) {
        filterTenantId = tenantIdFromQuery;
      }
      // If they don't provide a query, SuperAdmin sees all (null), ITHead sees their own
      else if (userRoles.includes(RoleEnum.ITHead)) {
        filterTenantId = tenantIdFromUser === null ? undefined : tenantIdFromUser;
      }
    } else if (tenantIdFromUser) {
      // Other authorized roles (Admin, CEO, Finance) are restricted to their own tenant
      filterTenantId = tenantIdFromUser;
    } else {
      // This case should not be hit if logic is correct, as non-SuperAdmins must have a tenant
      throw new ForbiddenException(
        "You must be assigned to a tenant to view audit logs.",
      );
    }

    return this.auditService.findAuditLogs({
      ...paginationDto,
      ...dateRangeDto,
      userId,
      action,
      targetType,
      tenantId: filterTenantId,
    });
  }
}
