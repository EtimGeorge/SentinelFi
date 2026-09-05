import {
  Controller,
  Get,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  UsePipes,
  ValidationPipe,
  Req,
} from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { Role } from "@shared/types/role.enum";
import { AuditService } from "./audit.service";
import { GetAuditLogsDto } from "./dto/get-audit-logs.dto";
import { AuthenticatedRequest } from "../common/interfaces/authenticated-request.interface";

@Controller("admin/audit-logs")
@UseGuards(JwtAuthGuard, RolesGuard)
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  /**
   * GET /api/v1/admin/audit-logs
   * System-wide audit logs for SuperAdmins.
   */
  @Get()
  @Roles("SuperAdmin")
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
  async findAll(@Query() options: GetAuditLogsDto) {
    return this.auditService.findAuditLogs(options);
  }

  /**
   * GET /api/v1/admin/audit-logs/tenant
   * Filtered audit logs for Tenant Admins (Only their own tenant).
   */
  @Get("tenant")
  @Roles(Role.AdminDirector, Role.CEO)
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
  async findTenantLogs(
    @Query() options: GetAuditLogsDto,
    @Req() req: AuthenticatedRequest,
  ) {
    // Enforce tenantId from req.user to ensure admins only see their own tenant's logs
    options.tenantId = req.user.tenant_id;
    return this.auditService.findAuditLogs(options);
  }
}
