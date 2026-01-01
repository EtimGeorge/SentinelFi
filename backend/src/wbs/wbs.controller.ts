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
} from "@nestjs/common";
import { WbsService } from "../wbs/wbs.service";
import { CreateWbsBudgetDto } from "./dto/create-wbs-budget.dto";
import { CreateLiveExpenseDto } from "./dto/create-live-expense.dto";
import { AuthGuard } from "@nestjs/passport"; // <-- New Import
import { RolesGuard } from "../auth/guards/roles.guard"; // <-- New Import
import { Roles } from "../auth/decorators/roles.decorator"; // <-- New Import
import { CreateWbsCategoryDto } from "./dto/create-wbs-category.dto";
import { UpdateWbsCategoryDto } from "./dto/update-wbs-category.dto";
import { Role } from "shared/types/role.enum";

import { AuthenticatedRequest } from "backend/src/common/interfaces/authenticated-request.interface"; // Adjust path as needed
import { WbsBudgetRollupDto } from "./dto/wbs-budget-rollup.dto";

@Controller("wbs") // Base path is /api/v1/wbs
// Apply global protection to all WBS routes by default
@UseGuards(AuthGuard("jwt"), RolesGuard)
export class WbsController {
  constructor(private readonly wbsService: WbsService) {}

  /**
   * NEW FEATURE: GET /api/v1/wbs/categories
   * Role: All roles that need to select a category.
   */
  @Get("categories")
  @Roles(
    Role.Admin,
    Role.Finance,
    Role.AssignedProjectUser,
    Role.OperationalHead,
  )
  async getCategories() {
    return this.wbsService.findAllCategories();
  }

  /**
   * NEW FEATURE: POST /api/v1/wbs/categories
   * Role: Admin/Finance only (Category Creation)
   */
  @Post("categories")
  @HttpCode(HttpStatus.CREATED)
  @Roles(Role.Admin, Role.Finance)
  @UsePipes(new ValidationPipe({ transform: true }))
  async createCategory(@Body() createWbsCategoryDto: CreateWbsCategoryDto) {
    return this.wbsService.createCategory(
      createWbsCategoryDto.code,
      createWbsCategoryDto.description,
    );
  }

  /**
   * NEW FEATURE: DELETE /api/v1/wbs/categories/:id
   * Role: Admin/Finance only (Category Deletion)
   */
  @Delete("categories/:id")
  @HttpCode(HttpStatus.NO_CONTENT) // 204 No Content for successful deletion
  @Roles(Role.Admin, Role.Finance)
  async deleteCategory(@Param("id") id: string) {
    await this.wbsService.deleteCategory(id);
  }

  /**
   * NEW FEATURE: PATCH /api/v1/wbs/categories/:id
   * Role: Admin/Finance only (Category Update)
   */
  @Patch("categories/:id")
  @HttpCode(HttpStatus.OK) // 200 OK for successful update
  @Roles(Role.Admin, Role.Finance)
  @UsePipes(new ValidationPipe({ transform: true }))
  async updateCategory(
    @Param("id") id: string,
    @Body() updateWbsCategoryDto: UpdateWbsCategoryDto,
  ) {
    return this.wbsService.updateCategory(
      id,
      updateWbsCategoryDto, // Pass the DTO directly
    );
  }

  /**
   * API Endpoint: POST /api/v1/wbs/budget-draft
   * Permissions: Admin, Finance, Assigned Project User (Drafting)
   */
  @Post("budget-draft")
  @HttpCode(HttpStatus.CREATED)
  @Roles(Role.Admin, Role.Finance, Role.AssignedProjectUser) // Enforce the RBAC Matrix
  @UsePipes(new ValidationPipe({ transform: true }))
  async createDraft(@Body() createWbsDto: CreateWbsBudgetDto, @Req() req: AuthenticatedRequest) {
    const userIdFromToken = req.user.id;
    return this.wbsService.createWbsBudgetDraft(createWbsDto, userIdFromToken);
  }

  @Post("budget-draft/batch")
  @HttpCode(HttpStatus.CREATED)
  @Roles(Role.Admin, Role.Finance)
  @UsePipes(new ValidationPipe({ transform: true }))
  async createDraftBatch(
    @Body() createWbsDtos: CreateWbsBudgetDto[],
    @Req() req: AuthenticatedRequest,
  ) {
    const userIdFromToken = req.user.id;
    return this.wbsService.createWbsBudgetDraftBatch(
      createWbsDtos,
      userIdFromToken,
    );
  }

  /**
   * API Endpoint: POST /api/v1/wbs/expense/live-entry
   * Permissions: Assigned Project User ONLY (CRUCIAL CONSTRAINT)
   */
  @Post("expense/live-entry")
  @HttpCode(HttpStatus.CREATED)
  @Roles(Role.AssignedProjectUser) // Enforce CRUCIAL CONSTRAINT: Only Project User can write expenses
  @UsePipes(new ValidationPipe({ transform: true }))
  async logLiveExpense(
    @Body() expenseDto: CreateLiveExpenseDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const userIdFromToken = req.user.id;
    // Pass clientSchema from the authenticated user's JWT payload
    const clientSchemaFromToken = req.user.clientSchema;
    if (!clientSchemaFromToken) {
      throw new Error("Client schema not found in JWT payload.");
    }
    return this.wbsService.logLiveExpenseEntry(
      clientSchemaFromToken,
      expenseDto,
      userIdFromToken,
    );
  }

  /**
   * API Endpoint: GET /api/v1/wbs/budget/rollup
   * Permissions: All read roles (CEO, Finance, Operational Head, IT Head, Admin)
   */
  @Get("budget/rollup")
  @Roles(
    Role.Admin,
    Role.ITHead,
    Role.Finance,
    Role.OperationalHead,
    Role.CEO,
    Role.AssignedProjectUser,
  )
  async getAllWbsWithRollup(
    @Req() req: AuthenticatedRequest, // Inject AuthenticatedRequest to get clientSchema
    @Query("startDate") startDate?: string,
    @Query("endDate") endDate?: string,
  ): Promise<WbsBudgetRollupDto[]> {
    const clientSchemaFromToken = req.user.clientSchema;
    if (!clientSchemaFromToken) {
      throw new Error("Client schema not found in JWT payload.");
    }
    return this.wbsService.findAllWbsBudgetsWithRollup(
      clientSchemaFromToken,
      startDate,
      endDate,
    );
  }

  /**
   * NEW FEATURE: GET /api/v1/wbs/budget-drafts/pending
   * Role: Admin, Finance (for approval workflow)
   */
  @Get("budget-drafts/pending")
  @Roles(Role.Admin, Role.Finance)
  async getPendingBudgetDrafts() {
    return this.wbsService.findPendingBudgetDrafts();
  }

  /**
   * NEW FEATURE: PATCH /api/v1/wbs/budget-drafts/:id/approve
   * Role: Admin, Finance (to approve drafts)
   */
  @Patch("budget-drafts/:id/approve")
  @Roles(Role.Admin, Role.Finance)
  async approveBudgetDraft(@Param("id") id: string) {
    return this.wbsService.approveBudgetDraft(id);
  }

  /**
   * NEW FEATURE: PATCH /api/v1/wbs/budget-drafts/:id/reject
   * Role: Admin, Finance (to reject drafts)
   */
  @Patch("budget-drafts/:id/reject")
  @Roles(Role.Admin, Role.Finance)
  async rejectBudgetDraft(@Param("id") id: string) {
    return this.wbsService.rejectBudgetDraft(id);
  }

  /**
   * NEW FEATURE: GET /api/v1/expense/exceptions/major-variance
   * Role: Admin, Finance, OperationalHead (to review exceptions)
   */
  @Get("expense/exceptions/major-variance")
  @Roles(Role.Admin, Role.Finance, Role.OperationalHead)
  async getMajorVarianceExceptions() {
    return this.wbsService.findMajorVarianceExceptions();
  }
}
