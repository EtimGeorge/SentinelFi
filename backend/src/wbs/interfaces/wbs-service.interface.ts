import { WbsBudgetEntity } from '../wbs-budget.entity';
import { LiveExpenseEntity } from '../live-expense.entity';
import { WbsCategoryEntity } from '../wbs-category.entity';
import { CreateWbsBudgetDto } from '../dto/create-wbs-budget.dto';
import { CreateLiveExpenseDto } from '../dto/create-live-expense.dto';
import { UpdateWbsBudgetDto } from '../dto/update-wbs-budget.dto';
import { UpdateLiveExpenseDto } from '../dto/update-live-expense.dto';
import { UpdateWbsCategoryDto } from '../dto/update-wbs-category.dto';
import { GetWbsBudgetsDto } from '../dto/get-wbs-budgets.dto';
import { GetLiveExpensesDto } from '../dto/get-live-expenses.dto';
import { WbsBudgetRollupDto } from '../dto/wbs-budget-rollup.dto';
import { GetProjectsDto } from '../../projects/dto/get-projects.dto';
import { Buffer } from 'buffer'; // Needed for export methods

export interface IWbsService {
  // WBS Budget (Draft) Operations
  createWbsBudgetDraft(createWbsDto: CreateWbsBudgetDto, userId: string): Promise<WbsBudgetEntity>;
  createWbsBudgetDraftBatch(createWbsDtos: CreateWbsBudgetDto[], userId: string): Promise<WbsBudgetEntity[]>;
  updateWbsBudget(id: string, updateWbsBudgetDto: UpdateWbsBudgetDto): Promise<WbsBudgetEntity>;
  deleteWbsItem(id: string, options: { recursive: boolean }): Promise<void>;
  
  // Live Expense Operations
  logLiveExpenseEntry(expenseDto: CreateLiveExpenseDto, userId: string, tenant_id: string): Promise<LiveExpenseEntity>;
  updateLiveExpense(id: number, updateLiveExpenseDto: UpdateLiveExpenseDto): Promise<LiveExpenseEntity>;

  // Read Operations (General)
  findAllWbsBudgets(options: GetWbsBudgetsDto): Promise<{ budgets: WbsBudgetEntity[]; total: number }>;
  findAllLiveExpenses(options: GetLiveExpensesDto): Promise<{ expenses: LiveExpenseEntity[]; total: number }>;
  findAllWbsBudgetsWithRollup(tenant_id: string, startDate?: string, endDate?: string): Promise<WbsBudgetRollupDto[]>;
  
  // WBS Category Operations (Master Data)
  findAllCategories(): Promise<WbsCategoryEntity[]>;
  createCategory(code: string, description: string): Promise<WbsCategoryEntity>;
  deleteCategory(id: string): Promise<void>;
  updateCategory(id: string, updateWbsCategoryDto: UpdateWbsCategoryDto): Promise<WbsCategoryEntity>;

  // Approval/Variance Operations (NEW FEATURES)
  findPendingBudgetDrafts(): Promise<WbsBudgetEntity[]>;
  approveBudgetDraft(id: string): Promise<WbsBudgetEntity>;
  rejectBudgetDraft(id: string): Promise<WbsBudgetEntity>;
  findMajorVarianceExceptions(): Promise<LiveExpenseEntity[]>;

  // Export Operations
  exportBudgetsToFormat(options: GetWbsBudgetsDto, format: "csv" | "pdf" | "xlsx" | "docx"): Promise<Buffer>;
  exportExpensesToFormat(options: GetLiveExpensesDto, format: "csv" | "pdf" | "xlsx" | "docx"): Promise<Buffer>;

  // Other Operations
  seedWbsDataForTenant(tenant_id: string, wbsData: any[], userId: string): Promise<WbsBudgetEntity[]>;
  findAllProjects(options: GetProjectsDto): Promise<{ projects: (WbsBudgetEntity & { total_paid: number })[]; total: number }>; // This one still seems out of place, but exists in service
}
