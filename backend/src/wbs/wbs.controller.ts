import { Controller, Post, Body, Get, UsePipes, ValidationPipe, HttpStatus, HttpCode, UseGuards, Req } from '@nestjs/common';
import { WbsService } from '../wbs/wbs.service';
import { CreateWbsBudgetDto } from './dto/create-wbs-budget.dto';
import { CreateLiveExpenseDto } from './dto/create-live-expense.dto';
import { AuthGuard } from '@nestjs/passport'; // <-- New Import
import { RolesGuard } from '../auth/guards/roles.guard'; // <-- New Import
import { Roles } from '../auth/decorators/roles.decorator'; // <-- New Import
import { Role } from '../auth/enums/role.enum'; // <-- New Import

@Controller('wbs') // Base path is /api/v1/wbs
// Apply global protection to all WBS routes by default
@UseGuards(AuthGuard('jwt'), RolesGuard) 
export class WbsController {
  constructor(private readonly wbsService: WbsService) {}

  /**
   * API Endpoint: POST /api/v1/wbs/budget-draft
   * Permissions: Admin, Finance, Assigned Project User (Drafting)
   */
  @Post('budget-draft')
  @HttpCode(HttpStatus.CREATED)
  @Roles(Role.Admin, Role.Finance, Role.AssignedProjectUser) // Enforce the RBAC Matrix
  @UsePipes(new ValidationPipe({ transform: true }))
  async createDraft(@Body() createWbsDto: CreateWbsBudgetDto) {
    return this.wbsService.createWbsBudgetDraft(createWbsDto);
  }
  
  /**
   * API Endpoint: POST /api/v1/wbs/expense/live-entry
   * Permissions: Assigned Project User ONLY (CRUCIAL CONSTRAINT)
   */
  @Post('expense/live-entry')
  @HttpCode(HttpStatus.CREATED)
  @Roles(Role.AssignedProjectUser) // Enforce CRUCIAL CONSTRAINT: Only Project User can write expenses
  @UsePipes(new ValidationPipe({ transform: true }))
  async logLiveExpense(@Body() expenseDto: CreateLiveExpenseDto, @Req() req: any) {
    // FIX PHASE 2 PLACEHOLDER: Extract user ID from the authenticated token
    const userIdFromToken = req.user.id; 
    return this.wbsService.logLiveExpenseEntry(expenseDto, userIdFromToken);
  }

  /**
   * API Endpoint: GET /api/v1/wbs/budget/rollup
   * Permissions: All read roles (CEO, Finance, Operational Head, IT Head, Admin)
   */
  @Get('budget/rollup')
  @Roles(Role.Admin, Role.ITHead, Role.Finance, Role.OperationalHead, Role.CEO, Role.AssignedProjectUser)
  async getAllWbsWithRollup(): Promise<any[]> {
    return this.wbsService.findAllWbsBudgetsWithRollup();
  }
}