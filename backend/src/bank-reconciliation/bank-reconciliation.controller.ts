import {
  Controller,
  Get,
  Post,
  Patch,
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
import { BankReconciliationService } from "./bank-reconciliation.service";
import {
  CreateBankAccountDto,
  UpdateBankAccountDto,
  CreateBankStatementLineDto,
  CreateReconciliationDto,
  MatchReconciliationLineDto,
  ApproveReconciliationDto,
  PostReconciliationDto,
} from "./dto/index";

const VALIDATION_PIPE = new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
});

@Controller("bank-reconciliation")
@UseGuards(JwtAuthGuard, TenancyGuard, RolesGuard)
export class BankReconciliationController {
  constructor(private readonly service: BankReconciliationService) {}

  private requireTenant(req: AuthenticatedRequest): string {
    if (!req.user || !req.user.tenant_id) {
      throw new UnauthorizedException(
        "User not authenticated or tenant ID is missing.",
      );
    }
    return req.user.tenant_id;
  }

  // ── Bank Accounts ──────────────────────────────────────────────────────

  @Post("accounts")
  @HttpCode(HttpStatus.CREATED)
  @Roles(
    Role.AdminDirector,
    Role.AdminManager,
    Role.CFO,
    Role.FinanceManager,
    Role.SuperAdmin,
  )
  @UsePipes(VALIDATION_PIPE)
  createBankAccount(
    @Body() dto: CreateBankAccountDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const tenantId = this.requireTenant(req);
    return this.service.createBankAccount(dto, req.user.id, tenantId);
  }

  @Get("accounts")
  @Roles(
    Role.FinanceManager,
    Role.CFO,
    Role.AdminDirector,
    Role.AdminManager,
    Role.SuperAdmin,
  )
  listBankAccounts(@Req() req: AuthenticatedRequest) {
    const tenantId = this.requireTenant(req);
    return this.service.listBankAccounts(tenantId);
  }

  @Patch("accounts/:id")
  @Roles(
    Role.AdminDirector,
    Role.AdminManager,
    Role.CFO,
    Role.FinanceManager,
    Role.SuperAdmin,
  )
  @UsePipes(VALIDATION_PIPE)
  updateBankAccount(
    @Param("id") id: string,
    @Body() dto: UpdateBankAccountDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const tenantId = this.requireTenant(req);
    return this.service.updateBankAccount(id, dto, tenantId);
  }

  // ── Bank Statement Lines ───────────────────────────────────────────────

  @Post("statement-lines")
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
  createBankStatementLine(
    @Body() dto: CreateBankStatementLineDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const tenantId = this.requireTenant(req);
    return this.service.createBankStatementLine(dto, tenantId);
  }

  @Get("statement-lines")
  @Roles(
    Role.FinanceManager,
    Role.CFO,
    Role.AdminDirector,
    Role.AdminManager,
    Role.SuperAdmin,
  )
  listBankStatementLines(@Req() req: AuthenticatedRequest) {
    const tenantId = this.requireTenant(req);
    const bankAccountId = (req.query as any)?.bank_account_id;
    const fromDate = (req.query as any)?.from_date;
    const toDate = (req.query as any)?.to_date;
    return this.service.listBankStatementLines(
      tenantId,
      bankAccountId,
      fromDate,
      toDate,
    );
  }

  // ── Reconciliations ────────────────────────────────────────────────────

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
  createReconciliation(
    @Body() dto: CreateReconciliationDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const tenantId = this.requireTenant(req);
    return this.service.createReconciliation(dto, req.user.id, tenantId);
  }

  @Get()
  @Roles(
    Role.FinanceManager,
    Role.CFO,
    Role.AdminDirector,
    Role.AdminManager,
    Role.SuperAdmin,
  )
  listReconciliations(@Req() req: AuthenticatedRequest) {
    const tenantId = this.requireTenant(req);
    const bankAccountId = (req.query as any)?.bank_account_id;
    const status = (req.query as any)?.status;
    const fromDate = (req.query as any)?.from_date;
    const toDate = (req.query as any)?.to_date;
    return this.service.listReconciliations(
      tenantId,
      bankAccountId,
      status,
      fromDate,
      toDate,
    );
  }

  @Get(":id")
  @Roles(
    Role.FinanceManager,
    Role.CFO,
    Role.AdminDirector,
    Role.AdminManager,
    Role.SuperAdmin,
  )
  getReconciliation(@Param("id") id: string, @Req() req: AuthenticatedRequest) {
    const tenantId = this.requireTenant(req);
    return this.service.getReconciliation(id, tenantId);
  }

  @Get(":id/lines")
  @Roles(
    Role.FinanceManager,
    Role.CFO,
    Role.AdminDirector,
    Role.AdminManager,
    Role.SuperAdmin,
  )
  getReconciliationLines(
    @Param("id") id: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const tenantId = this.requireTenant(req);
    return this.service.getReconciliationLines(id, tenantId);
  }

  @Post("lines/match")
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
  matchReconciliationLine(
    @Body() dto: MatchReconciliationLineDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const tenantId = this.requireTenant(req);
    return this.service.matchReconciliationLine(dto, req.user.id, tenantId);
  }

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
  approveReconciliation(
    @Param("id") id: string,
    @Body() dto: ApproveReconciliationDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const tenantId = this.requireTenant(req);
    const actorRole = req.user.roles
      ? req.user.roles.map((r: { name: string }) => r.name).join(", ")
      : "";
    return this.service.approveReconciliation(
      { ...dto, reconciliation_id: id },
      req.user,
      actorRole,
      tenantId,
    );
  }

  @Post(":id/post")
  @Roles(Role.CFO, Role.AdminDirector, Role.SuperAdmin, Role.CEO)
  @UsePipes(VALIDATION_PIPE)
  postReconciliation(
    @Param("id") id: string,
    @Body() dto: PostReconciliationDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const tenantId = this.requireTenant(req);
    return this.service.postReconciliation(
      { ...dto, reconciliation_id: id },
      req.user,
      tenantId,
    );
  }

  @Post(":id/cancel")
  @Roles(
    Role.CFO,
    Role.AdminDirector,
    Role.AdminManager,
    Role.FinanceManager,
    Role.SuperAdmin,
    Role.CEO,
  )
  cancelReconciliation(
    @Param("id") id: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const tenantId = this.requireTenant(req);
    return this.service.cancelReconciliation(id, req.user, tenantId);
  }
}
