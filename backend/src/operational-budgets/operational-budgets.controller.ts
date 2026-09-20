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
  Req,
  Delete,
  Param,
  Patch,
  Query,
  ParseUUIDPipe,
  UnauthorizedException,
  Res,
  StreamableFile,
} from "@nestjs/common";
import { Response } from "express";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { Role } from "shared/types/role.enum";
import { AuthenticatedRequest } from "../common/interfaces/request.interface";
import { OperationalBudgetsService } from "./operational-budgets.service";
import { CreateOperationalBudgetDto } from "./dto/create-operational-budget.dto";
import { UpdateOperationalBudgetDto } from "./dto/update-operational-budget.dto";
import { GetOperationalBudgetsDto } from "./dto/get-operational-budgets.dto";
import { CreateOperationalExpenseDto } from "./dto/create-operational-expense.dto";
import { UpdateOperationalExpenseDto } from "./dto/update-operational-expense.dto";
import { LogPayrollEntryDto } from "./dto/log-payroll-entry.dto";
import { RunPayrollBotDto } from "./dto/run-payroll-bot.dto";
import { UpsertAllocationDto } from "./dto/upsert-allocation.dto";
import { OperationalBudgetExportQueryDto } from "./dto/operational-budget-export.dto";
import { GetOpexAnalyticsDto } from "./dto/get-opex-analytics.dto";
import { GetOperationalExpensesDto } from "./dto/get-operational-expenses.dto";
import { UpdateBudgetCategoryDto } from "./dto/update-budget-category.dto";

@Controller("operational-budgets") // Base path is /api/v1/operational-budgets
@UseGuards(RolesGuard)
export class OperationalBudgetsController {
  constructor(
    private readonly operationalBudgetsService: OperationalBudgetsService,
  ) {}

  /**
   * Resolve the actor's primary role name from the request payload.
   * JwtStrategy attaches `roles: SimpleRole[]` (shared UserPayload); the
   * legacy singular `role` field is kept as a fallback.
   */
  private getActorRole(req: AuthenticatedRequest): string | undefined {
    const user = req.user as {
      roles?: { name: string }[];
      role?: string;
    } | undefined;
    return user?.roles?.[0]?.name ?? user?.role ?? undefined;
  }

  /**
   * API Endpoint: POST /api/v1/operational-budgets
   * Permissions: Admin, Finance, SuperAdmin
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Roles(
    Role.AdminDirector,
    Role.AdminManager,
    Role.CFO,
    Role.FinanceManager,
    Role.SuperAdmin,
  )
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
  async createOperationalBudget(
    @Body() createOperationalBudgetDto: CreateOperationalBudgetDto,
    @Req() req: AuthenticatedRequest,
  ) {
    if (!req.user || !req.user.tenant_id) {
      throw new UnauthorizedException(
        "User not authenticated or tenant ID is missing.",
      );
    }
    return this.operationalBudgetsService.create(
      createOperationalBudgetDto,
      req.user.id,
      req.user.tenant_id,
    );
  }

  /**
   * API Endpoint: POST /api/v1/operational-budgets/expense
   * Permissions: Admin, Finance, SuperAdmin
   */
  @Post("expense")
  @HttpCode(HttpStatus.CREATED)
  @Roles(
    Role.AdminDirector,
    Role.AdminManager,
    Role.CFO,
    Role.FinanceManager,
    Role.SuperAdmin,
  )
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
  async logExpense(
    @Body() expenseData: CreateOperationalExpenseDto,
    @Req() req: AuthenticatedRequest,
  ) {
    if (!req.user || !req.user.tenant_id) {
      throw new UnauthorizedException(
        "User not authenticated or tenant ID is missing.",
      );
    }
    return this.operationalBudgetsService.logExpense(
      expenseData,
      req.user.id,
      req.user.tenant_id,
      this.getActorRole(req),
    );
  }

  /**
   * API Endpoint: PATCH /api/v1/operational-budgets/expense/:id
   */
  @Patch("expense/:id")
  @Roles(
    Role.AdminDirector,
    Role.AdminManager,
    Role.CFO,
    Role.FinanceManager,
    Role.SuperAdmin,
  )
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
  async updateExpense(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body() updateData: UpdateOperationalExpenseDto,
    @Req() req: AuthenticatedRequest,
  ) {
    if (!req.user || !req.user.tenant_id) {
      throw new UnauthorizedException("User not authenticated.");
    }
    return this.operationalBudgetsService.updateExpense(
      id,
      updateData,
      req.user.tenant_id,
      req.user.id,
      this.getActorRole(req),
    );
  }

  /**
   * API Endpoint: DELETE /api/v1/operational-budgets/expense/:id
   */
  @Delete("expense/:id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(
    Role.AdminDirector,
    Role.AdminManager,
    Role.CFO,
    Role.FinanceManager,
    Role.SuperAdmin,
  )
  async deleteExpense(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Req() req: AuthenticatedRequest,
  ) {
    if (!req.user || !req.user.tenant_id) {
      throw new UnauthorizedException("User not authenticated.");
    }
    await this.operationalBudgetsService.deleteExpense(
      id,
      req.user.tenant_id,
      req.user.id,
    );
  }

  /**
   * API Endpoint: POST /api/v1/operational-budgets/expense/:id/approve
   * Permissions: Admin, Finance, SuperAdmin
   */
  @Post("expense/:id/approve")
  @Roles(
    Role.AdminDirector,
    Role.AdminManager,
    Role.CFO,
    Role.FinanceManager,
    Role.SuperAdmin,
  )
  async approveExpense(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Req() req: AuthenticatedRequest,
  ) {
    if (!req.user || !req.user.tenant_id) {
      throw new UnauthorizedException("User not authenticated.");
    }
    return this.operationalBudgetsService.approveExpense(
      id,
      req.user.tenant_id,
      req.user.id,
      this.getActorRole(req),
    );
  }

  /**
   * API Endpoint: POST /api/v1/operational-budgets/expense/:id/reject
   * Permissions: Admin, Finance, SuperAdmin
   */
  @Post("expense/:id/reject")
  @Roles(
    Role.AdminDirector,
    Role.AdminManager,
    Role.CFO,
    Role.FinanceManager,
    Role.SuperAdmin,
  )
  async rejectExpense(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body() body: { reason?: string },
    @Req() req: AuthenticatedRequest,
  ) {
    if (!req.user || !req.user.tenant_id) {
      throw new UnauthorizedException("User not authenticated.");
    }
    return this.operationalBudgetsService.rejectExpense(
      id,
      req.user.tenant_id,
      req.user.id,
      this.getActorRole(req),
      body?.reason,
    );
  }

  /**
   * API Endpoint: POST /api/v1/operational-budgets/expense/:id/reverse
   * Phase 4 (4.9): reversal journal for an APPROVED expense — restores the
   * budget's actual spend via an inverse journal and releases the hold.
   * Permissions: Finance governance roles
   */
  @Post("expense/:id/reverse")
  @Roles(
    Role.AdminDirector,
    Role.AdminManager,
    Role.CFO,
    Role.FinanceManager,
    Role.SuperAdmin,
  )
  async reverseExpense(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body() body: { reason?: string },
    @Req() req: AuthenticatedRequest,
  ) {
    if (!req.user || !req.user.tenant_id) {
      throw new UnauthorizedException("User not authenticated.");
    }
    return this.operationalBudgetsService.reverseExpense(
      id,
      req.user.tenant_id,
      req.user.id,
      this.getActorRole(req),
      body?.reason,
    );
  }

  /**
   * API Endpoint: GET /api/v1/operational-budgets/expense/all
   */
  @Get("expense/all")
  @Roles(
    Role.AdminDirector,
    Role.AdminManager,
    Role.CFO,
    Role.FinanceManager,
    Role.SuperAdmin,
    Role.CEO,
    Role.OperationalDirector,
  )
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
  async findAllOperationalExpenses(
    @Query() query: GetOperationalExpensesDto,
    @Req() req: AuthenticatedRequest,
  ) {
    if (!req.user || !req.user.tenant_id) {
      throw new UnauthorizedException("User not authenticated.");
    }
    return this.operationalBudgetsService.findAllExpenses(
      req.user.tenant_id,
      query,
    );
  }

  /**
   * API Endpoint: POST /api/v1/operational-budgets/payroll
   * Permissions: Admin, Finance, SuperAdmin
   */
  @Post("payroll")
  @HttpCode(HttpStatus.CREATED)
  @Roles(
    Role.AdminDirector,
    Role.AdminManager,
    Role.CFO,
    Role.FinanceManager,
    Role.SuperAdmin,
  )
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
  async logPayroll(
    @Body() payrollData: LogPayrollEntryDto,
    @Req() req: AuthenticatedRequest,
  ) {
    if (!req.user || !req.user.tenant_id) {
      throw new UnauthorizedException(
        "User not authenticated or tenant ID is missing.",
      );
    }
    return this.operationalBudgetsService.logPayrollEntry(
      payrollData,
      req.user.id,
      req.user.tenant_id,
      this.getActorRole(req),
    );
  }

  /**
   * API Endpoint: GET /api/v1/operational-budgets/rollup
   * OPEX Intelligence rollup — aggregates budget → category → actual spend
   * with temporal filtering, burn rates, and efficiency score.
   * Permissions: All read roles
   */
  @Get("rollup")
  @Roles(
    Role.AdminDirector,
    Role.AdminManager,
    Role.CEO,
    Role.CFO,
    Role.FinanceManager,
    Role.OperationalDirector,
    Role.TechnicalDirector,
    Role.SuperAdmin,
  )
  async getOpexRollup(
    @Query("startDate") startDate?: string,
    @Query("endDate") endDate?: string,
    @Query("budget_id") budget_id?: string,
    @Query("type") type?: string,
    @Req() req?: AuthenticatedRequest,
  ) {
    if (!req?.user?.tenant_id)
      throw new UnauthorizedException("User not authenticated.");
    return this.operationalBudgetsService.getOpexRollup(req.user.tenant_id, {
      startDate,
      endDate,
      budget_id,
      type,
    });
  }

  /**
   * API Endpoint: GET /api/v1/operational-budgets/analytics?from=&to=
   * Canonical unified OPEX analytics envelope (single FE source of truth).
   * Declared BEFORE /:id so "analytics" is not captured by the UUID param.
   * Permissions: All read roles
   */
  @Get("analytics")
  @Roles(
    Role.AdminDirector,
    Role.AdminManager,
    Role.CEO,
    Role.CFO,
    Role.FinanceManager,
    Role.OperationalDirector,
    Role.TechnicalDirector,
    Role.SuperAdmin,
  )
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
  async getOpexAnalytics(
    @Query() query: GetOpexAnalyticsDto,
    @Req() req: AuthenticatedRequest,
  ) {
    if (!req.user || !req.user.tenant_id) {
      throw new UnauthorizedException("User not authenticated.");
    }
    return this.operationalBudgetsService.getOpexAnalytics(
      req.user.tenant_id,
      query.from,
      query.to,
    );
  }

  /**
   * API Endpoint: GET /api/v1/operational-budgets/needs-attention
   * Phase 4 (4.10): single OPEX "needs attention" queue — pending approvals,
   * category overruns, and variance-flagged expenses.
   * Permissions: All read/governance roles
   */
  @Get("needs-attention")
  @Roles(
    Role.AdminDirector,
    Role.AdminManager,
    Role.CEO,
    Role.CFO,
    Role.FinanceManager,
    Role.OperationalDirector,
    Role.TechnicalDirector,
    Role.SuperAdmin,
  )
  async getOpexNeedsAttention(
    @Req() req: AuthenticatedRequest,
    @Query("limit") limit?: string,
  ) {
    if (!req.user || !req.user.tenant_id) {
      throw new UnauthorizedException("User not authenticated.");
    }
    const parsedLimit = limit ? parseInt(limit, 10) || 50 : 50;
    return this.operationalBudgetsService.getOpexNeedsAttention(
      req.user.tenant_id,
      parsedLimit,
    );
  }

  /**
   * API Endpoint: GET /api/v1/operational-budgets
   * Permissions: All read roles (Admin, CEO, Finance, OperationalHead, ITHead, SuperAdmin)
   */
  @Get()
  @Roles(
    Role.AdminDirector,
    Role.AdminManager,
    Role.CEO,
    Role.CFO,
    Role.FinanceManager,
    Role.OperationalDirector,
    Role.TechnicalDirector,
    Role.SuperAdmin,
  )
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
  async findAllOperationalBudgets(
    @Query() getOperationalBudgetsDto: GetOperationalBudgetsDto,
    @Req() req: AuthenticatedRequest,
  ) {
    if (!req.user || !req.user.tenant_id) {
      throw new UnauthorizedException(
        "User not authenticated or tenant ID is missing.",
      );
    }
    return this.operationalBudgetsService.findAll(
      getOperationalBudgetsDto,
      req.user.tenant_id,
    );
  }

  /**
   * API Endpoint: GET /api/v1/operational-budgets/export
   * Permissions: All read roles
   * Exports operational budget data to CSV, PDF, or XLSX.
   * NOTE: Declared BEFORE /:id so "export" is not captured by the UUID param.
   */
  @Get("export")
  @Roles(
    Role.AdminDirector,
    Role.AdminManager,
    Role.CEO,
    Role.CFO,
    Role.FinanceManager,
    Role.OperationalDirector,
    Role.TechnicalDirector,
    Role.SuperAdmin,
  )
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
  async exportOperationalBudgets(
    @Query() getOperationalBudgetsDto: OperationalBudgetExportQueryDto,
    @Res({ passthrough: true }) res: Response,
    @Req() req: AuthenticatedRequest,
  ): Promise<StreamableFile> {
    if (!req.user || !req.user.tenant_id) {
      throw new UnauthorizedException(
        "User not authenticated or tenant ID is missing.",
      );
    }
    const exportFormat = getOperationalBudgetsDto.format || "csv"; // Default to CSV
    const data =
      await this.operationalBudgetsService.exportOperationalBudgetsToFormat(
        getOperationalBudgetsDto,
        exportFormat,
        req.user.tenant_id,
      );
    const filename = `operational_budgets_export_${new Date().toISOString()}`;

    let contentType: string;

    switch (exportFormat) {
      case "pdf":
        contentType = "application/pdf";
        res.set({
          "Content-Type": contentType,
          "Content-Disposition": `attachment; filename="${filename}.pdf"`,
        });
        break;
      case "xlsx":
        contentType =
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
        res.set({
          "Content-Type": contentType,
          "Content-Disposition": `attachment; filename="${filename}.xlsx"`,
        });
        break;
      case "docx":
        contentType =
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
        res.set({
          "Content-Type": contentType,
          "Content-Disposition": `attachment; filename="${filename}.docx"`,
        });
        break;
      default: // csv
        contentType = "text/csv";
        res.set({
          "Content-Type": contentType,
          "Content-Disposition": `attachment; filename="${filename}.csv"`,
        });
        break;
    }

    // The service must return a Buffer for this to work
    return new StreamableFile(data as Buffer);
  }

  /**
   * API Endpoint: GET /api/v1/operational-budgets/:id
   * Permissions: All read roles
   */
  @Get(":id")
  @Roles(
    Role.AdminDirector,
    Role.AdminManager,
    Role.CEO,
    Role.CFO,
    Role.FinanceManager,
    Role.OperationalDirector,
    Role.TechnicalDirector,
    Role.SuperAdmin,
  )
  async findOneOperationalBudget(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Req() req: AuthenticatedRequest,
  ) {
    if (!req.user || !req.user.tenant_id) {
      throw new UnauthorizedException(
        "User not authenticated or tenant ID is missing.",
      );
    }
    return this.operationalBudgetsService.findOne(id, req.user.tenant_id);
  }

  /**
   * API Endpoint: PATCH /api/v1/operational-budgets/:id
   * Permissions: Admin, Finance, SuperAdmin
   */
  @Patch(":id")
  @Roles(
    Role.AdminDirector,
    Role.AdminManager,
    Role.CFO,
    Role.FinanceManager,
    Role.SuperAdmin,
  )
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
  async updateOperationalBudget(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body() updateOperationalBudgetDto: UpdateOperationalBudgetDto,
    @Req() req: AuthenticatedRequest,
  ) {
    if (!req.user || !req.user.tenant_id) {
      throw new UnauthorizedException(
        "User not authenticated or tenant ID is missing.",
      );
    }
    return this.operationalBudgetsService.update(
      id,
      updateOperationalBudgetDto,
      req.user.tenant_id,
    );
  }

  /**
   * API Endpoint: DELETE /api/v1/operational-budgets/:id
   * Permissions: Admin, SuperAdmin
   */
  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(Role.AdminDirector, Role.AdminManager, Role.CEO, Role.SuperAdmin)
  async removeOperationalBudget(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Req() req: AuthenticatedRequest,
  ) {
    if (!req.user || !req.user.tenant_id) {
      throw new UnauthorizedException(
        "User not authenticated or tenant ID is missing.",
      );
    }
    await this.operationalBudgetsService.remove(id, req.user.tenant_id);
  }

  /**
   * API Endpoint: POST /api/v1/operational-budgets/run-bot
   * Permissions: Admin, Finance, SuperAdmin
   */
  @Post("run-bot")
  @HttpCode(HttpStatus.OK)
  @Roles(
    Role.AdminDirector,
    Role.AdminManager,
    Role.CFO,
    Role.FinanceManager,
    Role.SuperAdmin,
  )
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
  async triggerPayrollBot(
    @Body() payload: RunPayrollBotDto,
    @Req() req: AuthenticatedRequest,
  ) {
    if (!req.user || !req.user.tenant_id) {
      throw new UnauthorizedException(
        "User not authenticated or tenant ID is missing.",
      );
    }
    return this.operationalBudgetsService.runPayrollBot(
      payload.template,
      req.user.id,
      req.user.tenant_id,
      this.getActorRole(req),
    );
  }

  // --- Category Endpoints ---

  @Get("categories/list")
  @Roles(
    Role.AdminDirector,
    Role.AdminManager,
    Role.CFO,
    Role.FinanceManager,
    Role.SuperAdmin,
    Role.CEO,
    Role.OperationalDirector,
  )
  async getCategories(@Req() req: AuthenticatedRequest) {
    if (!req.user || !req.user.tenant_id) {
      throw new UnauthorizedException("User not authenticated.");
    }
    return this.operationalBudgetsService.getAvailableCategories(
      req.user.tenant_id,
    );
  }

  @Post("categories")
  @Roles(
    Role.AdminDirector,
    Role.AdminManager,
    Role.CFO,
    Role.FinanceManager,
    Role.SuperAdmin,
  )
  async createCategory(
    @Body() body: { name: string; type: string; description?: string },
    @Req() req: AuthenticatedRequest,
  ) {
    if (!req.user || !req.user.tenant_id) {
      throw new UnauthorizedException("User not authenticated.");
    }
    return this.operationalBudgetsService.createCustomCategory(
      body.name,
      body.type,
      req.user.tenant_id,
      body.description,
    );
  }

  @Patch("categories/:id")
  @Roles(
    Role.AdminDirector,
    Role.AdminManager,
    Role.CFO,
    Role.FinanceManager,
    Role.SuperAdmin,
  )
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
  async updateCategory(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateBudgetCategoryDto,
    @Req() req: AuthenticatedRequest,
  ) {
    if (!req.user || !req.user.tenant_id) {
      throw new UnauthorizedException("User not authenticated.");
    }
    return this.operationalBudgetsService.updateCategory(
      id,
      dto,
      req.user.tenant_id,
    );
  }

  @Delete("categories/:id")
  @HttpCode(HttpStatus.OK)
  @Roles(
    Role.AdminDirector,
    Role.AdminManager,
    Role.CFO,
    Role.FinanceManager,
    Role.SuperAdmin,
  )
  async deleteCategory(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Req() req: AuthenticatedRequest,
  ) {
    if (!req.user || !req.user.tenant_id) {
      throw new UnauthorizedException("User not authenticated.");
    }
    return this.operationalBudgetsService.deleteCategory(
      id,
      req.user.tenant_id,
    );
  }

  // --- Grid Endpoints ---

  @Get(":id/grid")
  @Roles(
    Role.AdminDirector,
    Role.AdminManager,
    Role.CFO,
    Role.FinanceManager,
    Role.SuperAdmin,
    Role.CEO,
    Role.OperationalDirector,
  )
  async getBudgetGrid(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Req() req: AuthenticatedRequest,
  ) {
    if (!req.user || !req.user.tenant_id) {
      throw new UnauthorizedException("User not authenticated.");
    }
    return this.operationalBudgetsService.getBudgetGrid(id, req.user.tenant_id);
  }

  /**
   * API Endpoint: GET /api/v1/operational-budgets/:id/forecast-bridge
   * Phase 4 (4.6): rolling forecast bridge (actual → forecast → plan) per
   * period for the planning grid.
   * Declared BEFORE /:id/planning-grid generic patterns are unaffected.
   */
  @Get(":id/forecast-bridge")
  @Roles(
    Role.AdminDirector,
    Role.AdminManager,
    Role.CFO,
    Role.FinanceManager,
    Role.SuperAdmin,
    Role.CEO,
    Role.OperationalDirector,
  )
  async getBudgetForecastBridge(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Req() req: AuthenticatedRequest,
  ) {
    if (!req.user || !req.user.tenant_id) {
      throw new UnauthorizedException("User not authenticated.");
    }
    return this.operationalBudgetsService.getBudgetForecastBridge(
      id,
      req.user.tenant_id,
    );
  }

  @Post(":id/planning-grid")
  @Roles(
    Role.AdminDirector,
    Role.AdminManager,
    Role.CFO,
    Role.FinanceManager,
    Role.SuperAdmin,
  )
  async savePlanningGrid(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body() body: { cells: any[] },
    @Req() req: AuthenticatedRequest,
  ) {
    if (!req.user || !req.user.tenant_id) {
      throw new UnauthorizedException("User not authenticated.");
    }
    return this.operationalBudgetsService.savePlanningGrid(
      id,
      req.user.tenant_id,
      body?.cells || [],
      req.user.id,
      this.getActorRole(req),
    );
  }

  @Post(":id/submit-to-governance")
  @Roles(
    Role.AdminDirector,
    Role.AdminManager,
    Role.CFO,
    Role.FinanceManager,
    Role.SuperAdmin,
  )
  async submitBudgetToGovernance(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Req() req: AuthenticatedRequest,
  ) {
    if (!req.user || !req.user.tenant_id) {
      throw new UnauthorizedException("User not authenticated.");
    }
    return this.operationalBudgetsService.submitToGovernance(
      id,
      req.user.tenant_id,
      req.user.id,
      this.getActorRole(req),
    );
  }

  @Post("allocation")
  @Roles(
    Role.AdminDirector,
    Role.AdminManager,
    Role.CFO,
    Role.FinanceManager,
    Role.SuperAdmin,
  )
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
  async upsertAllocation(
    @Body()
    body: UpsertAllocationDto,
    @Req() req: AuthenticatedRequest,
  ) {
    if (!req.user || !req.user.tenant_id) {
      throw new UnauthorizedException("User not authenticated.");
    }
    return this.operationalBudgetsService.upsertAllocation(
      body.operational_budget_category_id,
      body.period_date,
      body.amount,
      body.period_type,
      req.user.tenant_id,
    );
  }
}
