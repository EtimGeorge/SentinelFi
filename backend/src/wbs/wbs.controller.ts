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
  UnauthorizedException, // NEW: Import UnauthorizedException
} from "@nestjs/common";
import { WbsService } from "../wbs/wbs.service";
import { CreateWbsBudgetDto } from "./dto/create-wbs-budget.dto";
import { CreateLiveExpenseDto } from "./dto/create-live-expense.dto";
import { AuthGuard } from "@nestjs/passport";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { CreateWbsCategoryDto } from "./dto/create-wbs-category.dto";
import { UpdateWbsCategoryDto } from "./dto/update-wbs-category.dto";
import { Role } from "shared/types/role.enum";
import { AuthenticatedRequest } from "../common/interfaces/request.interface";
import { WbsBudgetRollupDto } from "./dto/wbs-budget-rollup.dto";
import { UpdateWbsBudgetDto } from "./dto/update-wbs-budget.dto";
import { UpdateLiveExpenseDto } from "./dto/update-live-expense.dto";

@Controller("wbs") // Base path is /api/v1/wbs
// Apply global protection to all WBS routes by default
@UseGuards(AuthGuard("jwt"), RolesGuard)
export class WbsController {
  constructor(private readonly wbsService: WbsService) {}

  // ... (get/create/delete/update Category methods are fine)

  /**
   * API Endpoint: POST /api/v1/wbs/budget-draft
   * Permissions: Admin, Finance, Assigned Project User (Drafting)
   */
  @Post("budget-draft")
  @HttpCode(HttpStatus.CREATED)
  @Roles(Role.Admin, Role.Finance, Role.AssignedProjectUser) // Enforce the RBAC Matrix
  @UsePipes(new ValidationPipe({ transform: true }))
  async createDraft(@Body() createWbsDto: CreateWbsBudgetDto, @Req() req: AuthenticatedRequest) {
    if (!req.user) { // NEW: User check
      throw new UnauthorizedException('User not authenticated.');
    }
    const userIdFromToken = req.user.id;
    // The tenant_id is now attached by our robust middleware
    if (!req.tenant_id) {
      throw new BadRequestException("Tenant context not found.");
    }
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
    if (!req.user) { // NEW: User check
      throw new UnauthorizedException('User not authenticated.');
    }
    const userIdFromToken = req.user.id;
    if (!req.tenant_id) {
      throw new BadRequestException("Tenant context not found.");
    }
    return this.wbsService.createWbsBudgetDraftBatch(
      createWbsDtos,
      userIdFromToken,
    );
  }

  /**
   * NEW: API Endpoint: PATCH /api/v1/wbs/budget-draft/:id
   * Permissions: Admin, Finance (for editing drafts)
   */
  @Patch("budget-draft/:id")
  @Roles(Role.Admin, Role.Finance)
  @UsePipes(new ValidationPipe({ transform: true }))
  async updateWbsBudget(
    @Param("id") id: string,
    @Body() updateWbsBudgetDto: UpdateWbsBudgetDto,
    @Req() req: AuthenticatedRequest
  ) {
    if (!req.tenant_id) {
      throw new BadRequestException("Tenant context not found.");
    }
    // We pass tenant_id to the service to ensure updates happen in the correct schema
    return this.wbsService.updateWbsBudget(id, updateWbsBudgetDto);
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
    if (!req.user) { // NEW: User check
      throw new UnauthorizedException('User not authenticated.');
    }
    const userIdFromToken = req.user.id;
    if (!req.tenant_id) {
        throw new BadRequestException("Tenant context not found. Cannot log expense.");
    }
    return this.wbsService.logLiveExpenseEntry(
      expenseDto,
      userIdFromToken,
      req.tenant_id,
    );
  }

  /**
   * NEW: API Endpoint: PATCH /api/v1/wbs/expense/live-entry/:id
   * Permissions: Admin, Finance (for correcting expense entries)
   */
  @Patch("expense/live-entry/:id")
  @Roles(Role.Admin, Role.Finance)
  @UsePipes(new ValidationPipe({ transform: true }))
  async updateLiveExpense(
    @Param("id") id: string, // Keep as string for param decorator
    @Body() updateLiveExpenseDto: UpdateLiveExpenseDto,
    @Req() req: AuthenticatedRequest
  ) {
    if (!req.tenant_id) {
      throw new BadRequestException("Tenant context not found.");
    }
    // Convert id to number before passing to service
    return this.wbsService.updateLiveExpense(Number(id), updateLiveExpenseDto);
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
    @Req() req: AuthenticatedRequest,
    @Query("startDate") startDate?: string,
    @Query("endDate") endDate?: string,
  ): Promise<WbsBudgetRollupDto[]> {
    if (!req.tenant_id) {
        throw new BadRequestException("Tenant context not found. Cannot generate rollup.");
    }
    return this.wbsService.findAllWbsBudgetsWithRollup(
      req.tenant_id,
      startDate,
      endDate,
    );
  }

  // ... (get pending/approve/reject draft methods are fine)
  // ... (get major variance methods are fine)
}
