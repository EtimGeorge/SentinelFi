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
  UseInterceptors,
  UploadedFile,
  NotFoundException,
  InternalServerErrorException,
  ConflictException,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
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
import { WbsValidationResultDto } from "./dto/wbs-validation-result.dto";

@Controller("wbs") // Base path is /api/v1/wbs
@UseGuards(RolesGuard)
export class WbsController {
  constructor(private readonly wbsService: WbsService) {} // Type back as WbsService

  @Get("budgets")
  @Roles(
    Role.AdminDirector,
    Role.AdminManager,
    Role.TechnicalDirector,
    Role.CFO,
    Role.FinanceManager,
    Role.OperationalDirector,
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
  @Roles(Role.AdminDirector, Role.AdminManager, Role.CFO, Role.FinanceManager, Role.CEO, Role.OperationalDirector, Role.TechnicalDirector)
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
    Role.AdminDirector,
    Role.AdminManager,
    Role.TechnicalDirector,
    Role.CFO,
    Role.FinanceManager,
    Role.OperationalDirector,
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

  @Get("budgets/:id/dossier")
  @Roles(Role.AdminDirector, Role.AdminManager, Role.CFO, Role.FinanceManager, Role.CEO, Role.OperationalDirector, Role.TechnicalDirector)
  async getBudgetDossier(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Req() req: AuthenticatedRequest,
  ) {
    if (!req.user || !req.user.tenant_id) {
      throw new UnauthorizedException("User not authenticated.");
    }
    return this.wbsService.findBudgetDossier(id, req.user.tenant_id);
  }

  @Get("expenses/:id/dossier")
  @Roles(Role.AdminDirector, Role.AdminManager, Role.CFO, Role.FinanceManager, Role.CEO, Role.OperationalDirector, Role.TechnicalDirector)
  async getExpenseDossier(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Req() req: AuthenticatedRequest,
  ) {
    if (!req.user || !req.user.tenant_id) {
      throw new UnauthorizedException("User not authenticated.");
    }
    return this.wbsService.findExpenseDossier(id, req.user.tenant_id);
  }

  @Get("expenses")
  @Roles(
    Role.AdminDirector,
    Role.AdminManager,
    Role.TechnicalDirector,
    Role.CFO,
    Role.FinanceManager,
    Role.OperationalDirector,
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
  @Roles(Role.AdminDirector, Role.AdminManager, Role.CFO, Role.FinanceManager, Role.CEO)
  async getMajorExceptions(@Req() req: AuthenticatedRequest) {
    if (!req.user || !req.user.tenant_id) {
      throw new UnauthorizedException("User not authenticated.");
    }
    const tenantId = req.user.tenant_id;
    return this.wbsService.findMajorExceptions(tenantId);
  }

  @Get("expenses/export")
  @Roles(
    Role.AdminDirector,
    Role.AdminManager,
    Role.TechnicalDirector,
    Role.CFO,
    Role.FinanceManager,
    Role.OperationalDirector,
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
  @Roles(Role.AdminDirector, Role.AdminManager, Role.CFO, Role.FinanceManager)
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
    try {
      await this.wbsService.deleteWbsItem(id, tenantIdFromToken, { recursive });
    } catch (error: any) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(`Failed to delete WBS item: ${error.message}`);
    }
  }

  @Post("budget-draft")
  @HttpCode(HttpStatus.CREATED)
  @Roles(Role.AdminDirector, Role.AdminManager, Role.CFO, Role.FinanceManager, Role.AssignedProjectUser)
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
    try {
      return await this.wbsService.createWbsBudgetDraft(
        createWbsDto,
        userIdFromToken,
        tenantIdFromToken,
      );
    } catch (error: any) {
      if (error instanceof NotFoundException || error instanceof BadRequestException || error instanceof ConflictException) {
        throw error;
      }
      throw new InternalServerErrorException(`Failed to create WBS draft: ${error.message}`);
    }
  }

  @Post("budget-draft/batch")
  @HttpCode(HttpStatus.CREATED)
  @Roles(Role.AdminDirector, Role.AdminManager, Role.CFO, Role.FinanceManager)
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
    try {
      return await this.wbsService.createWbsBudgetDraftBatch(
        createWbsDtos,
        userIdFromToken,
        tenantIdFromToken,
      );
    } catch (error: any) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException(`Failed to create batch WBS drafts: ${error.message}`);
    }
  }

  @Patch("budget-draft/reorder")
  @Roles(Role.AdminDirector, Role.AdminManager, Role.CFO, Role.FinanceManager)
  async reorderBudgets(
    @Body("items") items: { id: string; sort_order: number }[],
    @Req() req: AuthenticatedRequest,
  ) {
    if (!req.user || !req.user.tenant_id) {
      throw new UnauthorizedException("User not authenticated.");
    }
    try {
      return await this.wbsService.reorderWbsItems(items, req.user.tenant_id);
    } catch (error: any) {
      throw new InternalServerErrorException(`Failed to reorder WBS items: ${error.message}`);
    }
  }

  @Patch("budget-draft/:id")
  @Roles(Role.AdminDirector, Role.AdminManager, Role.CFO, Role.FinanceManager)
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
    try {
      return await this.wbsService.updateWbsBudget(
        id,
        updateWbsBudgetDto,
        tenantIdFromToken,
      );
    } catch (error: any) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(`Failed to update WBS draft: ${error.message}`);
    }
  }

  @Get("budget-draft/:id/impact")
  @Roles(Role.AdminDirector, Role.AdminManager, Role.CFO, Role.FinanceManager)
  async getBudgetImpactAnalysis(
    @Param("id") id: string,
    @Req() req: AuthenticatedRequest,
  ) {
    if (!req.user || !req.user.tenant_id) {
       throw new UnauthorizedException("User not authenticated.");
    }
    try {
      return await this.wbsService.getBudgetImpactAnalysis(id, req.user.tenant_id);
    } catch (error: any) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
         throw error;
      }
      throw new InternalServerErrorException(`Failed to analyze budget impact: ${error.message}`);
    }
  }

  @Post("budget-draft/validate")
  @Roles(Role.AdminDirector, Role.AdminManager, Role.CFO, Role.FinanceManager)
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ValidationPipe({ transform: true }))
  async validateDraft(
    @Body() dto: CreateWbsBudgetDto,
    @Req() req: AuthenticatedRequest,
    @Query("existingItemId") existingItemId?: string,
  ): Promise<WbsValidationResultDto> {
    if (!req.user || !req.user.tenant_id) {
      throw new UnauthorizedException("User not authenticated.");
    }
    try {
      return await this.wbsService.validateWbsItemDraft(
        dto,
        req.user.tenant_id,
        existingItemId,
      );
    } catch (error: any) {
      throw new InternalServerErrorException(`Structural validation failed: ${error.message}`);
    }
  }

  @Post("expense/live-entry")
  @HttpCode(HttpStatus.CREATED)
  @Roles(Role.AssignedProjectUser, Role.FinanceOfficer, Role.FinanceManager, Role.CFO, Role.CEO, Role.AdminDirector)
  @UsePipes(new ValidationPipe({ transform: true }))
  async logLiveExpense(
    @Body() expenseDto: CreateLiveExpenseDto,
    @Req() req: AuthenticatedRequest,
  ) {
    if (!req.user) {
      throw new UnauthorizedException("User not authenticated.");
    }
    if (!req.user.tenant_id) {
      throw new BadRequestException("Tenant ID not found in authenticated user payload.");
    }
    try {
      return await this.wbsService.logLiveExpenseEntry(
        expenseDto,
        req.user.id,
        req.user.tenant_id,
        (req.user.roles?.[0] as any)?.name ?? req.user.roles?.[0], // Extract role name from SimpleRole or plain string
      );
    } catch (error: any) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException(`Failed to log live expense: ${error.message}`);
    }
  }

  @Post("expense/live-entry/batch")
  @HttpCode(HttpStatus.CREATED)
  @Roles(Role.AssignedProjectUser, Role.FinanceOfficer, Role.FinanceManager, Role.CFO, Role.CEO, Role.AdminDirector)
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async logLiveExpenseBatch(
    @Body() batchDto: { entries: CreateLiveExpenseDto[] },
    @Req() req: AuthenticatedRequest,
  ) {
    if (!req.user || !req.user.tenant_id) {
      throw new UnauthorizedException("User not authenticated.");
    }
    if (!batchDto.entries || !batchDto.entries.length) {
      throw new BadRequestException("entries array must contain at least one expense.");
    }
    try {
      return await this.wbsService.logLiveExpenseBatch(
        batchDto.entries,
        req.user.id,
        req.user.tenant_id,
        (req.user.roles?.[0] as any)?.name ?? req.user.roles?.[0],
      );
    } catch (error: any) {
      if (error instanceof BadRequestException || error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException(`Failed to log batch expenses: ${error.message}`);
    }
  }

  // --- NEW: Asynchronous Override Endpoints ---

  @Get("expense/overruns/pending")
  @Roles(Role.CEO, Role.CFO, Role.AdminDirector, Role.FinanceManager)
  async getPendingOverruns(@Req() req: AuthenticatedRequest) {
    if (!req.user || !req.user.tenant_id) {
      throw new UnauthorizedException("User not authenticated.");
    }
    return this.wbsService.findPendingOverruns(req.user.tenant_id);
  }

  @Post("expense/overruns/:id/approve")
  @Roles(Role.CEO, Role.CFO, Role.AdminDirector, Role.FinanceManager)
  @HttpCode(HttpStatus.OK)
  async approveOverrun(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Req() req: AuthenticatedRequest,
  ) {
    if (!req.user || !req.user.tenant_id) {
      throw new UnauthorizedException("User not authenticated.");
    }
    try {
      return await this.wbsService.approveOverrun(
        id,
        req.user.tenant_id,
        (req.user.roles?.[0] as any)?.name ?? (req.user.roles?.[0] || 'System')
      );
    } catch (error: any) {
      if (error instanceof BadRequestException || error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException(`Failed to approve overrun: ${error.message}`);
    }
  }

  @Patch("expense/live-entry/:id")
  @Roles(Role.AdminDirector, Role.AdminManager, Role.CFO, Role.FinanceManager)
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

  @Delete("expense/live-entry/:id")
  @Roles(Role.AdminDirector, Role.AdminManager, Role.CFO, Role.FinanceManager)
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteLiveExpenseEntry(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Req() req: AuthenticatedRequest,
  ) {
    if (!req.user || !req.user.tenant_id) {
      throw new UnauthorizedException("User not authenticated.");
    }
    await this.wbsService.deleteLiveExpenseEntry(id, req.user.tenant_id);
  }

  @Post("expense/live-entry/batch-delete")
  @Roles(Role.AdminDirector, Role.AdminManager, Role.CFO, Role.FinanceManager)
  @HttpCode(HttpStatus.OK)
  async deleteLiveExpenseBatch(
    @Body("ids") ids: string[],
    @Req() req: AuthenticatedRequest,
  ) {
    if (!req.user || !req.user.tenant_id) {
      throw new UnauthorizedException("User not authenticated.");
    }
    return this.wbsService.deleteLiveExpenseBatch(ids, req.user.tenant_id);
  }

  // --- WBS CATEGORY ENDPOINTS ---

  @Get("categories")
  @Roles(Role.AdminDirector, Role.AdminManager, Role.CFO, Role.FinanceManager, Role.TechnicalDirector, Role.OperationalDirector, Role.CEO)
  async getCategories(
    @Req() req: AuthenticatedRequest,
    @Query("includeInactive") includeInactiveRaw?: string
  ) {
    if (!req.user || !req.user.tenant_id) {
       throw new UnauthorizedException("User not authenticated.");
    }
    const includeInactive = includeInactiveRaw === 'true';
    return this.wbsService.findAllWbsCategories(req.user.tenant_id, includeInactive);
  }

  @Post("categories")
  @Roles(Role.AdminDirector, Role.AdminManager, Role.CFO, Role.FinanceManager)
  @UsePipes(new ValidationPipe({ transform: true }))
  async createCategory(
    @Body() createWbsCategoryDto: CreateWbsCategoryDto,
    @Req() req: AuthenticatedRequest,
  ) {
    if (!req.user || !req.user.tenant_id) {
      throw new UnauthorizedException("User not authenticated.");
    }
    try {
      return await this.wbsService.createWbsCategory(
        createWbsCategoryDto,
        req.user.tenant_id,
      );
    } catch (error: any) {
      if (error instanceof NotFoundException || error instanceof ConflictException) {
        throw error;
      }
      throw new InternalServerErrorException(`Failed to create WBS Category: ${error.message}`);
    }
  }

  @Patch("categories/:id")
  @Roles(Role.AdminDirector, Role.AdminManager, Role.CFO, Role.FinanceManager)
  @UsePipes(new ValidationPipe({ transform: true }))
  async updateCategory(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body() updateWbsCategoryDto: UpdateWbsCategoryDto,
    @Req() req: AuthenticatedRequest,
  ) {
    if (!req.user || !req.user.tenant_id) {
       throw new UnauthorizedException("User not authenticated.");
    }
    try {
      return await this.wbsService.updateWbsCategory(
        id,
        updateWbsCategoryDto,
        req.user.tenant_id,
      );
    } catch (error: any) {
      if (error instanceof NotFoundException || error instanceof ConflictException || error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException(`Failed to update WBS Category: ${error.message}`);
    }
  }

  @Delete("categories/:id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(Role.AdminDirector, Role.AdminManager, Role.CFO, Role.FinanceManager)
  async deleteCategory(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Query("forceSoftDelete") forceSoftDeleteRaw: string | undefined,
    @Req() req: AuthenticatedRequest,
  ) {
    if (!req.user || !req.user.tenant_id) {
      throw new UnauthorizedException("User not authenticated.");
    }
    const forceSoftDelete = forceSoftDeleteRaw === 'true';
    const result = await this.wbsService.deleteWbsCategory(id, req.user.tenant_id, forceSoftDelete);
    if (!result.softDeleted && result.usageCount > 0) {
      throw new ConflictException({
        message: `Category is used in ${result.usageCount} project(s). Provide forceSoftDelete=true to deactivate.`,
        usageCount: result.usageCount,
        requiresSoftDeleteConfirmation: true
      });
    }
  }

  // --- NEW: Budget Status Workflow ---

  @Patch("budget-draft/:id/status")
  @Roles(Role.AdminDirector, Role.AdminManager, Role.CFO, Role.FinanceManager, Role.CEO, Role.SuperAdmin)
  @UsePipes(new ValidationPipe({ transform: true }))
  async changeStatus(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body("status") status: string,
    @Req() req: AuthenticatedRequest,
  ) {
    if (!req.user || !req.user.tenant_id) {
      throw new UnauthorizedException("User not authenticated.");
    }
    try {
      return await this.wbsService.changeWbsBudgetStatus(
        id,
        status as any,
        req.user.tenant_id,
        req.user // Pass the full user object for DOA checks
      );
    } catch (error: any) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException(`Failed to change budget status: ${error.message}`);
    }
  }

  @Patch("project/:projectId/submit")
  @Roles(Role.AdminDirector, Role.AdminManager, Role.CFO, Role.FinanceManager, Role.AssignedProjectUser)
  async submitProjectBudget(
    @Param("projectId", new ParseUUIDPipe()) projectId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    if (!req.user || !req.user.tenant_id) {
       throw new UnauthorizedException("User not authenticated.");
    }
    try {
       return await this.wbsService.submitProjectBudgetDrafts(projectId, req.user.tenant_id);
    } catch (error: any) {
       throw new InternalServerErrorException(`Failed to submit project budget: ${error.message}`);
    }
  }

  // --- NEW: Budget vs. Contract Value Validation ---

  @Get("budget/validate-against-contract/:projectId")
  @Roles(Role.AdminDirector, Role.AdminManager, Role.CFO, Role.FinanceManager, Role.CEO)
  async validateBudgetAgainstContract(
    @Param("projectId", new ParseUUIDPipe()) projectId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    if (!req.user || !req.user.tenant_id) {
      throw new UnauthorizedException("User not authenticated.");
    }
    return this.wbsService.validateBudgetAgainstContractValue(
      projectId,
      req.user.tenant_id,
    );
  }

  // --- NEW: Seed Default Categories ---

  @Post("categories/seed")
  @HttpCode(HttpStatus.CREATED)
  @Roles(Role.AdminDirector, Role.AdminManager, Role.CEO)
  async seedCategories(@Req() req: AuthenticatedRequest) {
    if (!req.user || !req.user.tenant_id) {
      throw new UnauthorizedException("User not authenticated.");
    }
    return this.wbsService.seedDefaultCategories(req.user.tenant_id);
  }

  // --- NEW: WBS Template Endpoints ---

  @Get("templates")
  @Roles(Role.AdminDirector, Role.AdminManager, Role.CFO, Role.FinanceManager, Role.TechnicalDirector, Role.OperationalDirector, Role.CEO)
  async getTemplates(@Req() req: AuthenticatedRequest) {
    if (!req.user || !req.user.tenant_id) {
       throw new UnauthorizedException("User not authenticated.");
    }
    return this.wbsService.findAllTemplates(req.user.tenant_id);
  }

  @Post("templates/apply/:projectId")
  @Roles(Role.AdminDirector, Role.AdminManager, Role.CFO, Role.FinanceManager)
  @UsePipes(new ValidationPipe({ transform: true }))
  async applyTemplate(
    @Param("projectId", new ParseUUIDPipe()) projectId: string,
    @Body("templateId", new ParseUUIDPipe()) templateId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    if (!req.user || !req.user.tenant_id) {
       throw new UnauthorizedException("User not authenticated.");
    }
    await this.wbsService.applyTemplateToProject(
      projectId,
      templateId,
      req.user.id,
      req.user.tenant_id,
    );
    return { message: 'Template applied successfully' };
  }

  @Post("templates/seed")
  @HttpCode(HttpStatus.CREATED)
  @Roles(Role.SuperAdmin, Role.AdminDirector, Role.CEO) // Allow AdminDirector for tenant seeding
  async seedTemplates(@Req() req: AuthenticatedRequest) {
    await this.wbsService.seedDefaultTemplates();
    return { message: 'Templates seeded successfully' };
  }

  @Post("import-csv/:projectId")
  @Roles(Role.AdminDirector, Role.AdminManager, Role.CFO, Role.FinanceManager)
  async importCsv(
    @Param("projectId", new ParseUUIDPipe()) projectId: string,
    @Body("csvContent") csvContent: string,
    @Req() req: AuthenticatedRequest,
  ) {
    if (!req.user || !req.user.tenant_id) {
       throw new UnauthorizedException("User not authenticated.");
    }
    return this.wbsService.importWbsFromCsv(
      projectId,
      csvContent,
      req.user.id,
      req.user.tenant_id,
    );
  }

  @Post("import-excel/:projectId")
  @Roles(Role.AdminDirector, Role.AdminManager, Role.CFO, Role.FinanceManager)
  @UseInterceptors(FileInterceptor("file"))
  async importExcel(
    @Param("projectId", new ParseUUIDPipe()) projectId: string,
    @UploadedFile() file: any,
    @Req() req: AuthenticatedRequest,
  ) {
    if (!req.user || !req.user.tenant_id) {
      throw new UnauthorizedException("User not authenticated.");
    }
    if (!file || !file.buffer) {
      throw new BadRequestException("No file provided.");
    }
    return this.wbsService.importWbsFromExcel(
      projectId,
      file.buffer,
      req.user.id,
      req.user.tenant_id,
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // RECALL AN APPROVED BUDGET
  // Senior approvers (CFO, AdminDirector, CEO) can revoke their own approval.
  // The item status becomes RECALLED, which flows back to the approval queue.
  // ─────────────────────────────────────────────────────────────────────────────
  @Patch("budget/:id/recall")
  @Roles(Role.CFO, Role.FinanceManager, Role.AdminDirector, Role.AdminManager, Role.CEO, Role.SuperAdmin)
  async recallApproval(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body("reason") reason: string | undefined,
    @Req() req: AuthenticatedRequest,
  ) {
    if (!req.user || !req.user.tenant_id) {
      throw new UnauthorizedException("User not authenticated.");
    }
    try {
      return await this.wbsService.recallWbsBudgetApproval(
        id,
        req.user.tenant_id,
        req.user,
        reason,
      );
    } catch (error: any) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException(`Failed to recall approval: ${error.message}`);
    }
  }

  @Get('capex-intelligence')
  @Roles(Role.CEO, Role.CFO, Role.AdminDirector, Role.FinanceManager, Role.TechnicalDirector, Role.OperationalDirector)
  async getCapexIntelligence(
    @Req() req: AuthenticatedRequest,
    @Query('projectId') projectId?: string,
  ) {
    if (!req.user?.tenant_id) throw new UnauthorizedException('User not authenticated.');
    return this.wbsService.getCapexIntelligence(req.user.tenant_id, projectId);
  }

  @Get("projects/:id/report-pdf")
  @Roles(Role.AdminDirector, Role.AdminManager, Role.CFO, Role.FinanceManager, Role.CEO, Role.SuperAdmin)
  async getProjectBudgetReport(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Req() req: AuthenticatedRequest,
    @Res() res: Response,
  ) {
    if (!req.user || !req.user.tenant_id) {
      throw new UnauthorizedException("User not authenticated.");
    }
    const buffer = await this.wbsService.generateBudgetReportPdf(id, req.user.tenant_id);

    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename=Budget-Report-${id}.pdf`,
      "Content-Length": buffer.length,
    });
    res.end(buffer);
  }
}

