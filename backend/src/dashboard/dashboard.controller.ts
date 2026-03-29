import {
  Controller,
  Get,
  UseGuards,
  Req,
  BadRequestException,
  UseInterceptors,
} from "@nestjs/common";
import { CacheInterceptor, CacheTTL } from "@nestjs/cache-manager";
import { TenantCacheInterceptor } from "../common/interceptors/tenant-cache.interceptor";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { TenantAccessGuard } from "../common/guards/tenant-access.guard";
import { DashboardService } from "./dashboard.service";
import { AuthenticatedRequest } from "../common/interfaces/authenticated-request.interface";
import { Roles } from "../auth/decorators/roles.decorator";
import { Role } from "@shared/types/role.enum";
import { Query, Post, Body } from "@nestjs/common";
import { CreateAnnotationDto } from "./dto/create-annotation.dto";
import { AnnotationTargetType } from "./annotation.entity";

@Controller("dashboard")
@UseGuards(RolesGuard, TenantAccessGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get("summary")
  @UseInterceptors(TenantCacheInterceptor)
  @CacheTTL(600) // 10 minutes
  @Roles(
    Role.AdminDirector,
    Role.AdminManager,
    Role.CFO,
    Role.FinanceManager,
    Role.CEO,
    Role.OperationalDirector,
    Role.TechnicalDirector,
    Role.AssignedProjectUser,
  )
  async getSummary(@Req() req: AuthenticatedRequest) {
    const tenantId = req.user.tenant_id;

    if (!tenantId) {
      throw new BadRequestException(
        "Cannot get summary for a user without a tenant.",
      );
    }

    return this.dashboardService.getTenantSummary(tenantId);
  }

  @Get("executive")
  @UseInterceptors(TenantCacheInterceptor)
  @CacheTTL(600) // 10 minutes
  @Roles(
    Role.CEO,
    Role.CFO,
    Role.FinanceManager,
    Role.AdminDirector,
    Role.AdminManager,
  )
  async getExecutive(
    @Req() req: AuthenticatedRequest,
    @Query("projectId") projectId?: string,
  ) {
    const tenantId = req.user.tenant_id;
    if (!tenantId) {
      throw new BadRequestException(
        "Cannot get analytics for a user without a tenant.",
      );
    }
    return this.dashboardService.getExecutiveAnalytics(tenantId, projectId);
  }

  @Post("annotations")
  @Roles(
    Role.CEO,
    Role.CFO,
    Role.FinanceManager,
    Role.AdminDirector,
    Role.AdminManager,
  )
  async addAnnotation(
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreateAnnotationDto,
  ) {
    const tenantId = req.user.tenant_id;
    const userId = req.user.id;
    if (!tenantId) {
      throw new BadRequestException("Cannot add annotation without a tenant.");
    }
    return this.dashboardService.addAnnotation(tenantId, userId, dto);
  }

  @Get("annotations")
  @Roles(
    Role.CEO,
    Role.CFO,
    Role.FinanceManager,
    Role.AdminDirector,
    Role.AdminManager,
  )
  async getAnnotations(
    @Req() req: AuthenticatedRequest,
    @Query("targetType") targetType: AnnotationTargetType,
    @Query("targetId") targetId: string,
  ) {
    const tenantId = req.user.tenant_id;
    if (!tenantId) {
      throw new BadRequestException("Cannot get annotations without a tenant.");
    }
    return this.dashboardService.getAnnotations(tenantId, targetType, targetId);
  }
}
