import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Req,
  UnauthorizedException,
  UseGuards,
  HttpCode,
  HttpStatus,
  UsePipes,
  ValidationPipe,
} from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { TenancyGuard } from "../common/guards/tenancy.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { Role } from "@shared/types/role.enum";
import { AuthenticatedRequest } from "../common/interfaces/authenticated-request.interface";
import { BudgetVirementService } from "./budget-virement.service";
import {
  CreateBudgetVirementDto,
  SubmitVirementDto,
  ApproveVirementDto,
} from "./dto/index";

const VALIDATION_PIPE = new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
});

@Controller("budget-virement")
@UseGuards(JwtAuthGuard, TenancyGuard, RolesGuard)
export class BudgetVirementController {
  constructor(private readonly service: BudgetVirementService) {}

  private requireTenant(req: AuthenticatedRequest): string {
    if (!req.user || !req.user.tenant_id) {
      throw new UnauthorizedException(
        "User not authenticated or tenant ID is missing.",
      );
    }
    return req.user.tenant_id;
  }

  // ── Create virement ────────────────────────────────────────────────────

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Roles(
    Role.FinanceManager,
    Role.FinanceOfficer,
    Role.AdminDirector,
    Role.AdminManager,
    Role.CFO,
    Role.SuperAdmin,
  )
  @UsePipes(VALIDATION_PIPE)
  createVirement(
    @Body() dto: CreateBudgetVirementDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const tenantId = this.requireTenant(req);
    return this.service.createVirement(dto, req.user.id, tenantId);
  }

  @Get()
  @Roles(
    Role.FinanceManager,
    Role.CFO,
    Role.AdminDirector,
    Role.AdminManager,
    Role.SuperAdmin,
  )
  listVirements(@Req() req: AuthenticatedRequest) {
    const tenantId = this.requireTenant(req);
    const operationalBudgetId = (req.query as any)?.operational_budget_id;
    const status = (req.query as any)?.status;
    return this.service.listVirements(tenantId, operationalBudgetId, status);
  }

  @Get(":id")
  @Roles(
    Role.FinanceManager,
    Role.CFO,
    Role.AdminDirector,
    Role.AdminManager,
    Role.SuperAdmin,
  )
  getVirement(@Param("id") id: string, @Req() req: AuthenticatedRequest) {
    const tenantId = this.requireTenant(req);
    return this.service.getVirement(id, tenantId);
  }

  // ── Submit for approval ────────────────────────────────────────────────

  @Post(":id/submit")
  @Roles(
    Role.FinanceManager,
    Role.FinanceOfficer,
    Role.AdminDirector,
    Role.AdminManager,
    Role.CFO,
    Role.SuperAdmin,
  )
  @UsePipes(VALIDATION_PIPE)
  submitVirement(
    @Param("id") id: string,
    @Body() dto: SubmitVirementDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const tenantId = this.requireTenant(req);
    return this.service.submitVirement(
      { ...dto, virement_id: id },
      req.user,
      tenantId,
    );
  }

  // ── Approve / Reject ───────────────────────────────────────────────────

  @Post(":id/approve")
  @Roles(
    Role.CFO,
    Role.AdminDirector,
    Role.AdminManager,
    Role.FinanceManager,
    Role.SuperAdmin,
    Role.CEO,
    Role.OperationalDirector,
    Role.TechnicalDirector,
  )
  @UsePipes(VALIDATION_PIPE)
  approveVirement(
    @Param("id") id: string,
    @Body() dto: ApproveVirementDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const tenantId = this.requireTenant(req);
    const actorRole = req.user.roles
      .map((r: { name: string }) => r.name)
      .join(", ");
    return this.service.approveVirement(
      { ...dto, virement_id: id },
      req.user,
      actorRole,
      tenantId,
    );
  }

  @Post(":id/reject")
  @Roles(
    Role.CFO,
    Role.AdminDirector,
    Role.AdminManager,
    Role.FinanceManager,
    Role.SuperAdmin,
    Role.CEO,
  )
  @UsePipes(VALIDATION_PIPE)
  rejectVirement(
    @Param("id") id: string,
    @Body() dto: ApproveVirementDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const tenantId = this.requireTenant(req);
    const actorRole = req.user.roles
      .map((r: { name: string }) => r.name)
      .join(", ");
    return this.service.rejectVirement(
      { ...dto, virement_id: id },
      req.user,
      actorRole,
      tenantId,
    );
  }

  // ── Cancel ─────────────────────────────────────────────────────────────

  @Post(":id/cancel")
  @Roles(
    Role.FinanceManager,
    Role.CFO,
    Role.AdminDirector,
    Role.AdminManager,
    Role.SuperAdmin,
    Role.CEO,
  )
  cancelVirement(@Param("id") id: string, @Req() req: AuthenticatedRequest) {
    const tenantId = this.requireTenant(req);
    return this.service.cancelVirement(id, req.user, tenantId);
  }
}
