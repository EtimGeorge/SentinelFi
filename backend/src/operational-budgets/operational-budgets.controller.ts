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

@Controller("operational-budgets") // Base path is /api/v1/operational-budgets
@UseGuards(RolesGuard)
export class OperationalBudgetsController {
  constructor(
    private readonly operationalBudgetsService: OperationalBudgetsService,
  ) {}

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
  @UsePipes(new ValidationPipe({ transform: true }))
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
  async logExpense(@Body() expenseData: any, @Req() req: AuthenticatedRequest) {
    if (!req.user || !req.user.tenant_id) {
      throw new UnauthorizedException(
        "User not authenticated or tenant ID is missing.",
      );
    }
    const actorRole = req.user.role;
    return this.operationalBudgetsService.logExpense(
      expenseData,
      req.user.id,
      req.user.tenant_id,
      actorRole,
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
  async updateExpense(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body() updateData: any,
    @Req() req: AuthenticatedRequest,
  ) {
    if (!req.user || !req.user.tenant_id) {
      throw new UnauthorizedException("User not authenticated.");
    }
    return this.operationalBudgetsService.updateExpense(
      id,
      updateData,
      req.user.tenant_id,
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
    await this.operationalBudgetsService.deleteExpense(id, req.user.tenant_id);
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
  async findAllOperationalExpenses(
    @Query()
    query: {
      budget_id?: string;
      category_id?: string;
      status?: string;
      startDate?: string;
      endDate?: string;
    },
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
  async logPayroll(@Body() payrollData: any, @Req() req: AuthenticatedRequest) {
    if (!req.user || !req.user.tenant_id) {
      throw new UnauthorizedException(
        "User not authenticated or tenant ID is missing.",
      );
    }
    return this.operationalBudgetsService.logPayrollEntry(
      payrollData,
      req.user.id,
      req.user.tenant_id,
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
  @UsePipes(new ValidationPipe({ transform: true }))
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
  @UsePipes(new ValidationPipe({ transform: true }))
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
   * API Endpoint: GET /api/v1/operational-budgets/export
   * Permissions: All read roles
   * Exports operational budget data to CSV, PDF, or XLSX.
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
  async exportOperationalBudgets(
    @Query() getOperationalBudgetsDto: GetOperationalBudgetsDto,
    @Res({ passthrough: true }) res: Response,
    @Req() req: AuthenticatedRequest,
    @Query("format") format?: "csv" | "pdf" | "xlsx" | "docx",
  ): Promise<StreamableFile> {
    if (!req.user || !req.user.tenant_id) {
      throw new UnauthorizedException(
        "User not authenticated or tenant ID is missing.",
      );
    }
    const exportFormat = format || "csv"; // Default to CSV
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
  async triggerPayrollBot(
    @Body() payload: { template: any[] },
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

  @Post("allocation")
  @Roles(
    Role.AdminDirector,
    Role.AdminManager,
    Role.CFO,
    Role.FinanceManager,
    Role.SuperAdmin,
  )
  async upsertAllocation(
    @Body()
    body: {
      operational_budget_category_id: string;
      period_date: string;
      amount: number;
      period_type: any;
    },
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
