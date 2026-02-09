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
  BadRequestException,
  UnauthorizedException,
  ParseBoolPipe,
  ParseUUIDPipe,
  Res,
  StreamableFile,
} from "@nestjs/common";
import { Response } from "express";
import { WbsService } from "../wbs/wbs.service";
import { CreateWbsBudgetDto } from "./dto/create-wbs-budget.dto";
import type { CreateLiveExpenseDto } from "./dto/create-live-expense.dto";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { CreateWbsCategoryDto } from "./dto/create-wbs-category.dto";
import { UpdateWbsCategoryDto } from "./dto/update-wbs-category.dto";
import { Role } from "@shared/types/role.enum";
import { AuthenticatedRequest } from "../common/interfaces/authenticated-request.interface";
import { WbsBudgetRollupDto } from "./dto/wbs-budget-rollup.dto";
import { UpdateWbsBudgetDto } from "./dto/update-wbs-budget.dto";
import { UpdateLiveExpenseDto } from "./dto/update-live-expense.dto";
import { GetWbsBudgetsDto } from "./dto/get-wbs-budgets.dto";
import { GetLiveExpensesDto } from "./dto/get-live-expenses.dto";

@Controller("wbs") // Base path is /api/v1/wbs
@UseGuards(RolesGuard)
export class WbsController {
  constructor(private readonly wbsService: WbsService) {} // Type back as WbsService

  @Get("budgets")
  @Roles(
    Role.Admin,
    Role.ITHead,
    Role.Finance,
    Role.OperationalHead,
    Role.CEO,
    Role.AssignedProjectUser,
    Role.SuperAdmin,
  )
  @UsePipes(new ValidationPipe({ transform: true }))
  async getWbsBudgets(
    @Query() getWbsBudgetsDto: GetWbsBudgetsDto,
    @Req() req: AuthenticatedRequest,
  ) {
    if (!req.user || !req.user.tenant_id) {
      throw new UnauthorizedException(
        "User not authenticated or tenant ID not found.",
      );
    }
    const tenantIdFromToken = req.user.tenant_id;
    return this.wbsService.findAllWbsBudgets(
      getWbsBudgetsDto,
      tenantIdFromToken,
    );
  }

  @Get("budget/rollup")
  @Roles(Role.Admin, Role.Finance, Role.CEO, Role.OperationalHead, Role.ITHead)
  async getWbsBudgetRollup(
    @Req() req: AuthenticatedRequest,
    @Query("startDate") startDate?: string,
    @Query("endDate") endDate?: string,
    @Query("projectId") projectId?: string,
  ) {
    if (!req.user || !req.user.tenant_id) {
      throw new UnauthorizedException("User not authenticated.");
    }
    const tenantId = req.user.tenant_id;
    return this.wbsService.getWbsBudgetRollup(tenantId, { startDate, endDate, projectId });
  }

  @Get("budgets/export")
  @Roles(
    Role.Admin,
    Role.ITHead,
    Role.Finance,
    Role.OperationalHead,
    Role.CEO,
    Role.AssignedProjectUser,
    Role.SuperAdmin,
  )
  async exportBudgets(
    @Query() getWbsBudgetsDto: GetWbsBudgetsDto,
    @Req() req: AuthenticatedRequest,
    @Res({ passthrough: true }) res: Response,
    @Query("format") format?: "csv" | "pdf" | "xlsx" | "docx",
  ): Promise<StreamableFile> {
    if (!req.user || !req.user.tenant_id) {
      throw new UnauthorizedException(
        "User not authenticated or tenant ID not found.",
      );
    }
    const tenantIdFromToken = req.user.tenant_id;
    const exportFormat = format || "csv";
    const data = await this.wbsService.exportWbsBudgetsToCsv(
      getWbsBudgetsDto,
      tenantIdFromToken,
    ); // Changed method name
    const filename = `wbs_budgets_export_${new Date().toISOString()}`;

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

    return new StreamableFile(data as Buffer);
  }

  @Get("expenses")
  @Roles(
    Role.Admin,
    Role.ITHead,
    Role.Finance,
    Role.OperationalHead,
    Role.CEO,
    Role.AssignedProjectUser,
    Role.SuperAdmin,
  )
  @UsePipes(new ValidationPipe({ transform: true }))
  async getLiveExpenses(
    @Query() getLiveExpensesDto: GetLiveExpensesDto,
    @Req() req: AuthenticatedRequest,
  ) {
    if (!req.user || !req.user.tenant_id) {
      throw new UnauthorizedException(
        "User not authenticated or tenant ID not found.",
      );
    }
    const tenantIdFromToken = req.user.tenant_id;
    return this.wbsService.findAllLiveExpenses(
      getLiveExpensesDto,
      tenantIdFromToken,
    );
  }

  @Get("exceptions")
  @Roles(Role.Admin, Role.Finance, Role.CEO)
  async getMajorExceptions(@Req() req: AuthenticatedRequest) {
    if (!req.user || !req.user.tenant_id) {
      throw new UnauthorizedException("User not authenticated.");
    }
    const tenantId = req.user.tenant_id;
    return this.wbsService.findMajorExceptions(tenantId);
  }

  @Get("expenses/export")
  @Roles(
    Role.Admin,
    Role.ITHead,
    Role.Finance,
    Role.OperationalHead,
    Role.CEO,
    Role.AssignedProjectUser,
    Role.SuperAdmin,
  )
  async exportExpenses(
    @Query() getLiveExpensesDto: GetLiveExpensesDto,
    @Req() req: AuthenticatedRequest,
    @Res({ passthrough: true }) res: Response,
    @Query("format") format?: "csv" | "pdf" | "xlsx" | "docx",
  ): Promise<StreamableFile> {
    if (!req.user || !req.user.tenant_id) {
      throw new UnauthorizedException(
        "User not authenticated or tenant ID not found.",
      );
    }
    const tenantIdFromToken = req.user.tenant_id;
    const exportFormat = format || "csv";
    const data = await this.wbsService.exportLiveExpensesToCsv(
      getLiveExpensesDto,
      tenantIdFromToken,
    );
    const filename = `live_expenses_export_${new Date().toISOString()}`;

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

    return new StreamableFile(data as Buffer);
  }

  @Delete("budget-draft/:id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(Role.Admin, Role.Finance)
  async deleteWbsItem(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Query("recursive", new ParseBoolPipe({ optional: true }))
    recursive: boolean = false,
    @Req() req: AuthenticatedRequest,
  ) {
    if (!req.user || !req.user.tenant_id) {
      throw new UnauthorizedException(
        "User not authenticated or tenant ID not found.",
      );
    }
    const tenantIdFromToken = req.user.tenant_id;
    await this.wbsService.deleteWbsItem(id, tenantIdFromToken, { recursive });
  }

  @Post("budget-draft")
  @HttpCode(HttpStatus.CREATED)
  @Roles(Role.Admin, Role.Finance, Role.AssignedProjectUser)
  @UsePipes(new ValidationPipe({ transform: true }))
  async createDraft(
    @Body() createWbsDto: CreateWbsBudgetDto,
    @Req() req: AuthenticatedRequest,
  ) {
    if (!req.user) {
      throw new UnauthorizedException("User not authenticated.");
    }
    const userIdFromToken = req.user.id;
    if (!req.user.tenant_id) {
      throw new BadRequestException(
        "Tenant ID not found in authenticated user payload.",
      );
    }
    const tenantIdFromToken = req.user.tenant_id;
    return this.wbsService.createWbsBudgetDraft(
      createWbsDto,
      userIdFromToken,
      tenantIdFromToken,
    );
  }

  @Post("budget-draft/batch")
  @HttpCode(HttpStatus.CREATED)
  @Roles(Role.Admin, Role.Finance)
  @UsePipes(new ValidationPipe({ transform: true }))
  async createDraftBatch(
    @Body() createWbsDtos: CreateWbsBudgetDto[],
    @Req() req: AuthenticatedRequest,
  ) {
    if (!req.user) {
      throw new UnauthorizedException("User not authenticated.");
    }
    const userIdFromToken = req.user.id;
    if (!req.user.tenant_id) {
      throw new BadRequestException(
        "Tenant ID not found in authenticated user payload.",
      );
    }
    const tenantIdFromToken = req.user.tenant_id;
    return this.wbsService.createWbsBudgetDraftBatch(
      createWbsDtos,
      userIdFromToken,
      tenantIdFromToken,
    );
  }

  @Patch("budget-draft/:id")
  @Roles(Role.Admin, Role.Finance)
  @UsePipes(new ValidationPipe({ transform: true }))
  async updateWbsBudget(
    @Param("id") id: string,
    @Body() updateWbsBudgetDto: UpdateWbsBudgetDto,
    @Req() req: AuthenticatedRequest,
  ) {
    if (!req.user || !req.user.tenant_id) {
      throw new UnauthorizedException(
        "User not authenticated or tenant ID not found.",
      );
    }
    const tenantIdFromToken = req.user.tenant_id;
    return this.wbsService.updateWbsBudget(
      id,
      updateWbsBudgetDto,
      tenantIdFromToken,
    );
  }

  @Post("expense/live-entry")
  @HttpCode(HttpStatus.CREATED)
  @Roles(Role.AssignedProjectUser)
  @UsePipes(new ValidationPipe({ transform: true }))
  async logLiveExpense(
    @Body() expenseDto: CreateLiveExpenseDto,
    @Req() req: AuthenticatedRequest,
  ) {
    if (!req.user) {
      throw new UnauthorizedException("User not authenticated.");
    }
    const userIdFromToken = req.user.id;
    if (!req.user.tenant_id) {
      throw new BadRequestException(
        "Tenant ID not found in authenticated user payload.",
      );
    }
    const tenantIdFromToken = req.user.tenant_id;
    return this.wbsService.logLiveExpenseEntry(
      expenseDto,
      userIdFromToken,
      tenantIdFromToken, // Pass tenantId to the service
    );
  }

  @Patch("expense/live-entry/:id")
  @Roles(Role.Admin, Role.Finance)
  @UsePipes(new ValidationPipe({ transform: true }))
  async updateLiveExpenseEntry(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body() updateLiveExpenseDto: UpdateLiveExpenseDto,
    @Req() req: AuthenticatedRequest,
  ) {
    if (!req.user || !req.user.tenant_id) {
      throw new UnauthorizedException("User not authenticated.");
    }
    const tenantIdFromToken = req.user.tenant_id;
    return this.wbsService.updateLiveExpenseEntry(
      id,
      updateLiveExpenseDto,
      tenantIdFromToken,
    );
  }

  // --- WBS CATEGORY ENDPOINTS ---

  @Get("categories")
  @Roles(Role.Admin, Role.Finance, Role.ITHead, Role.OperationalHead, Role.CEO)
  async getCategories(@Req() req: AuthenticatedRequest) {
    if (!req.user || !req.user.tenant_id) {
       throw new UnauthorizedException("User not authenticated.");
    }
    return this.wbsService.findAllWbsCategories(req.user.tenant_id);
  }

  @Post("category")
  @Roles(Role.Admin, Role.Finance)
  @UsePipes(new ValidationPipe({ transform: true }))
  async createCategory(
    @Body() createWbsCategoryDto: CreateWbsCategoryDto,
    @Req() req: AuthenticatedRequest,
  ) {
    if (!req.user || !req.user.tenant_id) {
      throw new UnauthorizedException("User not authenticated.");
    }
    return this.wbsService.createWbsCategory(
      createWbsCategoryDto.name,
      req.user.tenant_id,
    );
  }

  @Patch("category/:id")
  @Roles(Role.Admin, Role.Finance)
  @UsePipes(new ValidationPipe({ transform: true }))
  async updateCategory(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body() updateWbsCategoryDto: UpdateWbsCategoryDto,
    @Req() req: AuthenticatedRequest,
  ) {
    if (!req.user || !req.user.tenant_id) {
       throw new UnauthorizedException("User not authenticated.");
    }
    return this.wbsService.updateWbsCategory(
      id,
      updateWbsCategoryDto,
      req.user.tenant_id,
    );
  }

  @Delete("category/:id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(Role.Admin, Role.Finance)
  async deleteCategory(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Req() req: AuthenticatedRequest,
  ) {
    if (!req.user || !req.user.tenant_id) {
      throw new UnauthorizedException("User not authenticated.");
    }
    await this.wbsService.deleteWbsCategory(id, req.user.tenant_id);
  }
}
