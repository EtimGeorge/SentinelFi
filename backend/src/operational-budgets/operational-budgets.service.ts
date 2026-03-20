import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
  Inject,
} from "@nestjs/common";
import { Repository, Like, Between, DataSource } from "typeorm";
import { TENANT_DATA_SOURCE } from "../database/constants";
import { OperationalBudgetEntity } from "./operational-budget.entity";
import { CreateOperationalBudgetDto } from "./dto/create-operational-budget.dto";
import { UpdateOperationalBudgetDto } from "./dto/update-operational-budget.dto";
import { GetOperationalBudgetsDto } from "./dto/get-operational-budgets.dto";
import { OperationalBudgetCategoryEntity } from "./operational-budget-category.entity";
import { OperationalExpenseEntity, OperationalExpenseStatus } from "./operational-expense.entity";
import { PayrollEntryEntity } from "./payroll-entry.entity";
import { BudgetCategoryEntity } from "./budget-category.entity";
import { OperationalBudgetPeriodAllocationEntity, PeriodType } from "./operational-budget-period-allocation.entity";
import { BudgetControlService } from "../common/budget-control.service";
import { PdfUtility } from "../common/pdf.utility";
import { ExcelUtility } from "../common/excel.utility";
import { WordUtility } from "../common/word.utility";
import { Buffer } from "buffer";
import { VarianceFlag } from "@shared/types";
import { NotificationsService } from "../notifications/notifications.service";


// ---- OPEX Rollup Types ----
export interface OpexCategoryRollup {
  id: string;
  name: string;
  budgeted: number;
  actual: number;
  variance: number;
  burnRate: number;
  status: 'OVERRUN' | 'AT_RISK' | 'HEALTHY';
}

export interface OpexBudgetRollup {
  budget_id: string;
  name: string;
  type: string;
  status: string;
  start_date: Date;
  end_date: Date;
  budgeted: number;
  actual: number;
  variance: number;
  burnRate: number;
  categories: OpexCategoryRollup[];
}

export interface OpexRollupResult {
  budgets: OpexBudgetRollup[];
  summary: {
    totalBudgeted: number;
    totalActual: number;
    totalVariance: number;
    efficiencyScore: number;
    topBurningCategories: { name: string; actual: number; burnRate: number }[];
  };
}
// ---------------------------



@Injectable()
export class OperationalBudgetsService {
  private readonly logger = new Logger(OperationalBudgetsService.name);

  constructor(
    @Inject(TENANT_DATA_SOURCE) private dataSource: DataSource,
    @Inject("OPERATIONALBUDGET_REPOSITORY")
    private operationalBudgetRepository: Repository<OperationalBudgetEntity>,
    @Inject("PAYROLLENTRY_REPOSITORY")
    private payrollEntryRepository: Repository<PayrollEntryEntity>,
    @Inject("OPERATIONALEXPENSE_REPOSITORY")
    private operationalExpenseRepository: Repository<OperationalExpenseEntity>,
    @Inject("BUDGETCATEGORY_REPOSITORY")
    private budgetCategoryRepository: Repository<BudgetCategoryEntity>,
    @Inject("OPERATIONALBUDGETPERIODALLOCATION_REPOSITORY")
    private allocationRepository: Repository<OperationalBudgetPeriodAllocationEntity>,
    private readonly budgetControlService: BudgetControlService,
    private readonly notificationsService: NotificationsService,
  ) {}

  // Centralized Governance Constants
  private readonly CRITICAL_OVERRIDE_ROLES = ['CFO', 'CEO', 'Admin Director', 'SuperAdmin'];
  private readonly MAJOR_OVERRIDE_ROLES = ['Finance Manager', 'CFO', 'CEO', 'Admin Director', 'SuperAdmin', 'Finance Officer'];

  async logExpense(
    expenseData: Partial<OperationalExpenseEntity>,
    userId: string,
    tenantId: string,
    actorRole?: string,
  ): Promise<OperationalExpenseEntity> {
    let finalStatus = expenseData.status || OperationalExpenseStatus.PENDING; // Could be explicitly set
    let finalFlag = VarianceFlag.NO_VARIANCE;

    // Automatically deduct from associated operational budget category if specified
    if (expenseData.operational_budget_category_id) {
        // Find category to get the budget relationship
        const category = await this.dataSource.getRepository(OperationalBudgetCategoryEntity).findOne({
            where: { operational_budget_category_id: expenseData.operational_budget_category_id, tenant_id: tenantId },
            relations: ['operationalBudget']
        });

        if (category && category.operationalBudget) {
            const budget = category.operationalBudget;
            
            // Re-use logic from WbsService but adapt for OPEX limit vs Actual Spread
            const totalActual = Number(budget.actual_spent || 0);
            const budgetLimit = Number(budget.budgeted_amount || 0);
            
            // Calculate Pending Opex Expenses
            const pendingResults = await this.dataSource.query(
               `SELECT COALESCE(SUM(amount), 0) as total FROM operational_expense WHERE category_operational_budget_category_id = $1 AND tenant_id = $2 AND status = 'PENDING'`,
               [category.operational_budget_category_id, tenantId]
            );
            // We'll estimate overrun based just on budget limits to mimic wbs
            const projectedTotal = totalActual + parseFloat(pendingResults[0]?.total || 0) + Number(expenseData.amount || 0);

            // Tiered Variance Checking
            if (budgetLimit <= 0) {
               finalFlag = VarianceFlag.CRITICAL_VARIANCE;
               const msg = `CRITICAL OVERRUN on OPEX Budget ${budget.name}: Budget has $0 defined, but expense is being logged.`;
               this.notificationsService.sendVarianceAlert('Critical OPEX Overrun', msg, 'error');
            } else if (projectedTotal > budgetLimit) {
               const variancePercentage = ((projectedTotal - budgetLimit) / budgetLimit) * 100;
               if (variancePercentage >= 10) {
                  finalFlag = VarianceFlag.CRITICAL_VARIANCE;
               } else if (variancePercentage >= 5) {
                  finalFlag = VarianceFlag.MAJOR_VARIANCE;
               } else {
                  finalFlag = VarianceFlag.MINOR_VARIANCE;
               }
            }

            // Governance Decisions
            if (finalFlag === VarianceFlag.CRITICAL_VARIANCE || finalFlag === VarianceFlag.MAJOR_VARIANCE) {
                const isCritical = finalFlag === VarianceFlag.CRITICAL_VARIANCE;
                const isAuthorizedAtAll = isCritical
                  ? actorRole && this.CRITICAL_OVERRIDE_ROLES.includes(actorRole)
                  : actorRole && this.MAJOR_OVERRIDE_ROLES.includes(actorRole);

                if (!expenseData.override_reason) {
                     throw new BadRequestException({
                        statusCode: 403,
                        errorCode: finalFlag,
                        message: `OPEX overrun limit reached. Requires justification override.`,
                        requiredRoles: isCritical ? this.CRITICAL_OVERRIDE_ROLES : this.MAJOR_OVERRIDE_ROLES,
                     });
                }

                if (isAuthorizedAtAll) {
                  finalFlag = VarianceFlag.OVERRIDE_APPLIED;
                  finalStatus = OperationalExpenseStatus.APPROVED;
                  this.logger.warn(`[OPEX] AUTHORIZED OVERRIDE by ${actorRole} | Budget: ${budget.name} | Reason: ${expenseData.override_reason}`);
                } else {
                  finalStatus = OperationalExpenseStatus.PENDING;
                  this.logger.log(`[OPEX] PENDING APPROVAL routed for ${actorRole} | Budget: ${budget.name}`);
                }
            } else {
                finalStatus = OperationalExpenseStatus.APPROVED; // Auto-approve if no critical/major variance
            }

            // Update category actual spent ONLY if approved
            if (finalStatus === OperationalExpenseStatus.APPROVED) {
               category.actual_spent = Number(category.actual_spent) + Number(expenseData.amount || 0);
               await this.dataSource.getRepository(OperationalBudgetCategoryEntity).save(category);

               budget.actual_spent = Number(budget.actual_spent) + Number(expenseData.amount || 0);
               await this.operationalBudgetRepository.save(budget);
            }
        }
    }

    const expense = this.operationalExpenseRepository.create({
      ...expenseData,
      status: finalStatus,
      variance_flag: finalFlag,
      logged_by_user_id: userId,
      tenant_id: tenantId,
    });

    return this.operationalExpenseRepository.save(expense);
  }

  async logPayrollEntry(
    payrollData: Partial<PayrollEntryEntity>,
    userId: string,
    tenantId: string,
  ): Promise<PayrollEntryEntity> {
    const entry = this.payrollEntryRepository.create({
      ...payrollData,
      processed_by_user_id: userId,
      tenant_id: tenantId,
    });

    // Automatically deduct from associated operational budget if specified
    if (payrollData.operational_budget_id) {
        const budget = await this.operationalBudgetRepository.findOne({
            where: { operational_budget_id: payrollData.operational_budget_id, tenant_id: tenantId }
        });
        if (budget) {
            // Validate budget constraint
            await this.budgetControlService.validateAndAlertOperationalExpense(
                budget,
                Number(payrollData.net_pay || 0)
            );

            budget.actual_spent = Number(budget.actual_spent) + Number(payrollData.net_pay || 0);
            await this.operationalBudgetRepository.save(budget);
        }
    }

    return this.payrollEntryRepository.save(entry);
  }

  async deleteExpense(expenseId: string, tenantId: string): Promise<void> {
    const expense = await this.operationalExpenseRepository.findOne({
      where: { operational_expense_id: expenseId, tenant_id: tenantId },
    });

    if (!expense) {
      throw new NotFoundException(`Expense ${expenseId} not found.`);
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      if (expense.operational_budget_category_id) {
        const category = await queryRunner.manager.findOne(OperationalBudgetCategoryEntity, {
          where: { operational_budget_category_id: expense.operational_budget_category_id, tenant_id: tenantId },
          relations: ['operationalBudget'],
        });

        if (category) {
          // Revert category spend
          category.actual_spent = Number(category.actual_spent) - Number(expense.amount);
          await queryRunner.manager.save(OperationalBudgetCategoryEntity, category);

          // Revert budget spend
          if (category.operationalBudget) {
            const budget = category.operationalBudget;
            budget.actual_spent = Number(budget.actual_spent) - Number(expense.amount);
            await queryRunner.manager.save(OperationalBudgetEntity, budget);
          }
        }
      }

      await queryRunner.manager.delete(OperationalExpenseEntity, expenseId);
      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async updateExpense(
    expenseId: string,
    updateData: Partial<OperationalExpenseEntity>,
    tenantId: string,
  ): Promise<OperationalExpenseEntity> {
    const expense = await this.operationalExpenseRepository.findOne({
      where: { operational_expense_id: expenseId, tenant_id: tenantId },
    });

    if (!expense) {
      throw new NotFoundException(`Expense ${expenseId} not found.`);
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const amountDelta = Number(updateData.amount ?? expense.amount) - Number(expense.amount);

      if (amountDelta !== 0 && expense.operational_budget_category_id) {
        const category = await queryRunner.manager.findOne(OperationalBudgetCategoryEntity, {
          where: { operational_budget_category_id: expense.operational_budget_category_id, tenant_id: tenantId },
          relations: ['operationalBudget'],
        });

        if (category) {
          // Adjust category spend
          category.actual_spent = Number(category.actual_spent) + amountDelta;
          await queryRunner.manager.save(OperationalBudgetCategoryEntity, category);

          // Adjust budget spend
          if (category.operationalBudget) {
            const budget = category.operationalBudget;
            budget.actual_spent = Number(budget.actual_spent) + amountDelta;
            await queryRunner.manager.save(OperationalBudgetEntity, budget);
          }
        }
      }

      Object.assign(expense, updateData);
      const saved = await queryRunner.manager.save(OperationalExpenseEntity, expense);
      await queryRunner.commitTransaction();
      return saved;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async findAllExpenses(
    tenantId: string,
    filters: {
      budget_id?: string;
      category_id?: string;
      status?: string;
      startDate?: string;
      endDate?: string;
    } = {},
  ): Promise<OperationalExpenseEntity[]> {
    const { budget_id, category_id, status, startDate, endDate } = filters;

    const queryBuilder = this.operationalExpenseRepository
      .createQueryBuilder("expense")
      .leftJoinAndSelect("expense.category", "category")
      .leftJoinAndSelect("category.operationalBudget", "budget")
      .where("expense.tenant_id = :tenantId", { tenantId });

    if (budget_id) {
      queryBuilder.andWhere("category.operational_budget_id = :budget_id", { budget_id });
    }
    if (category_id) {
      queryBuilder.andWhere("expense.operational_budget_category_id = :category_id", { category_id });
    }
    if (status) {
      queryBuilder.andWhere("expense.status = :status", { status });
    }
    if (startDate && endDate) {
      queryBuilder.andWhere("expense.expense_date BETWEEN :startDate AND :endDate", {
        startDate,
        endDate,
      });
    }

    queryBuilder.orderBy("expense.expense_date", "DESC");

    return queryBuilder.getMany();
  }

  async create(
    createOperationalBudgetDto: CreateOperationalBudgetDto,
    userId: string,
    tenantId: string,
  ): Promise<OperationalBudgetEntity> {
    const operationalBudget = this.operationalBudgetRepository.create({
      ...createOperationalBudgetDto,
      created_by_user_id: userId,
      tenant_id: tenantId, // Set tenantId
    });
    return this.operationalBudgetRepository.save(operationalBudget);
  }

  async findAll(
    options: GetOperationalBudgetsDto,
    tenantId: string,
  ): Promise<{ operationalBudgets: OperationalBudgetEntity[]; total: number }> {
    const {
      page = 1,
      limit = 10,
      name,
      type,
      status,
      startDate,
      endDate,
      created_by_user_id,
    } = options;
    const skip = (page - 1) * limit;

    const queryBuilder = this.operationalBudgetRepository
      .createQueryBuilder("operationalBudget")
      .where("operationalBudget.tenant_id = :tenantId", { tenantId });

    if (name) {
      queryBuilder.andWhere("operationalBudget.name ILIKE :name", {
        name: `%${name}%`,
      });
    }
    if (type) {
      queryBuilder.andWhere("operationalBudget.type = :type", { type });
    }
    if (status) {
      queryBuilder.andWhere("operationalBudget.status = :status", { status });
    }
    if (created_by_user_id) {
      queryBuilder.andWhere(
        "operationalBudget.created_by_user_id = :created_by_user_id",
        { created_by_user_id },
      );
    }
    if (startDate || endDate) {
      if (startDate && endDate) {
        queryBuilder.andWhere(
          "operationalBudget.start_date BETWEEN :startDate AND :endDate",
          { startDate, endDate },
        );
      } else if (startDate) {
        queryBuilder.andWhere("operationalBudget.start_date >= :startDate", {
          startDate,
        });
      } else if (endDate) {
        queryBuilder.andWhere("operationalBudget.end_date <= :endDate", {
          endDate,
        });
      }
    }

    const [operationalBudgets, total] = await queryBuilder
      .leftJoinAndSelect("operationalBudget.createdBy", "user") // Join createdBy user
      .skip(skip)
      .take(limit)
      .orderBy("operationalBudget.name", "ASC")
      .getManyAndCount();

    return { operationalBudgets, total };
  }

  async findOne(
    operational_budget_id: string,
    tenantId: string,
  ): Promise<OperationalBudgetEntity> {
    const operationalBudget = await this.operationalBudgetRepository.findOne({
      where: { operational_budget_id, tenant_id: tenantId },
      relations: ["createdBy"], // Include createdBy user
    });
    if (!operationalBudget) {
      throw new NotFoundException(
        `Operational Budget with ID "${operational_budget_id}" not found.`,
      );
    }
    return operationalBudget;
  }

  async update(
    operational_budget_id: string,
    updateOperationalBudgetDto: UpdateOperationalBudgetDto,
    tenantId: string,
  ): Promise<OperationalBudgetEntity> {
    const operationalBudget = await this.findOne(
      operational_budget_id,
      tenantId,
    );
    Object.assign(operationalBudget, updateOperationalBudgetDto);
    operationalBudget.updated_at = new Date();
    return this.operationalBudgetRepository.save(operationalBudget);
  }

  async remove(operational_budget_id: string, tenantId: string): Promise<void> {
    const result = await this.operationalBudgetRepository.delete({
      operational_budget_id,
      tenant_id: tenantId,
    });
    if (result.affected === 0) {
      throw new NotFoundException(
        `Operational Budget with ID "${operational_budget_id}" not found.`,
      );
    }
  }

  async exportOperationalBudgetsToFormat(
    options: GetOperationalBudgetsDto,
    format: "csv" | "pdf" | "xlsx" | "docx",
    tenantId: string,
  ): Promise<Buffer> {
    const { name, type, status, startDate, endDate, created_by_user_id } =
      options;

    const queryBuilder = this.operationalBudgetRepository
      .createQueryBuilder("operationalBudget")
      .where("operationalBudget.tenant_id = :tenantId", { tenantId });

    if (name) {
      queryBuilder.andWhere("operationalBudget.name ILIKE :name", {
        name: `%${name}%`,
      });
    }
    if (type) {
      queryBuilder.andWhere("operationalBudget.type = :type", { type });
    }
    if (status) {
      queryBuilder.andWhere("operationalBudget.status = :status", { status });
    }
    if (created_by_user_id) {
      queryBuilder.andWhere(
        "operationalBudget.created_by_user_id = :created_by_user_id",
        { created_by_user_id },
      );
    }
    if (startDate || endDate) {
      if (startDate && endDate) {
        queryBuilder.andWhere(
          "operationalBudget.start_date BETWEEN :startDate AND :endDate",
          { startDate, endDate },
        );
      } else if (startDate) {
        queryBuilder.andWhere("operationalBudget.start_date >= :startDate", {
          startDate,
        });
      } else if (endDate) {
        queryBuilder.andWhere("operationalBudget.end_date <= :endDate", {
          endDate,
        });
      }
    }

    const operationalBudgets = await queryBuilder
      .leftJoinAndSelect("operationalBudget.createdBy", "user") // Join createdBy user for export
      .orderBy("operationalBudget.name", "ASC")
      .getMany();

    const emptyReportMessage =
      "No operational budget data found for the given criteria.";

    if (operationalBudgets.length === 0) {
      if (format === "pdf") {
        return Buffer.from(
          await PdfUtility.generateOperationalBudgetReport(
            [],
            emptyReportMessage,
          ),
        );
      } else if (format === "xlsx") {
        return Buffer.from(
          await ExcelUtility.generateOperationalBudgetReport(
            [],
            emptyReportMessage,
          ),
        );
      } else if (format === "docx") {
        return Buffer.from(
          await WordUtility.generateOperationalBudgetReport(
            [],
            emptyReportMessage,
          ),
        );
      }
      return Buffer.from(emptyReportMessage, "utf-8");
    }

    if (format === "pdf") {
      const pdfUint8Array = await PdfUtility.generateOperationalBudgetReport(
        operationalBudgets,
        "Operational Budget Report",
      );
      return Buffer.from(pdfUint8Array);
    } else if (format === "xlsx") {
      return Buffer.from(
        await ExcelUtility.generateOperationalBudgetReport(
          operationalBudgets,
          "Operational Budget Report",
        ),
      );
    } else if (format === "docx") {
      return Buffer.from(
        await WordUtility.generateOperationalBudgetReport(
          operationalBudgets,
          "Operational Budget Report",
        ),
      );
    }

    // CSV Export Logic
    const headers = [
      "ID",
      "Name",
      "Description",
      "Type",
      "Budgeted Amount",
      "Actual Spent",
      "Start Date",
      "End Date",
      "Status",
      "Created By", // Changed from User ID to User Name/Email
      "Created At",
      "Updated At",
    ].join(",");

    const rows = operationalBudgets.map((budget) => {
      return [
        `"${budget.operational_budget_id}"`,
        `"${budget.name.replace(/"/g, '""')}"`,
        `"${budget.description ? budget.description.replace(/"/g, '""') : ""}"`,
        budget.type,
        budget.budgeted_amount,
        budget.actual_spent,
        budget.start_date.toISOString().split("T")[0],
        budget.end_date.toISOString().split("T")[0],
        budget.status,
        `"${budget.createdBy?.email || budget.created_by_user_id}"`, // Use user email if available
        budget.created_at.toISOString(),
        budget.updated_at ? budget.updated_at.toISOString() : "",
      ].join(",");
    });

    const csvString = [headers, ...rows].join("\n");
    return Buffer.from(csvString, "utf-8");
  }

  // --- Category Management ---

  async getAvailableCategories(tenantId: string): Promise<BudgetCategoryEntity[]> {
    // Fetch system defaults (tenant_id is null) AND tenant specific categories
    return this.budgetCategoryRepository.find({
      where: [
        { is_system_default: true, is_active: true },
        { tenant_id: tenantId, is_active: true },
      ],
      order: { name: "ASC" },
    });
  }

  async createCustomCategory(
    name: string,
    type: string, // Cast to enum in implementation if needed
    tenantId: string,
    description?: string
  ): Promise<BudgetCategoryEntity> {
    const category = this.budgetCategoryRepository.create({
      name,
      type: type as any,
      tenant_id: tenantId,
      description,
      is_system_default: false,
    });
    return this.budgetCategoryRepository.save(category);
  }

  // --- Grid & Allocation Management ---

  async getBudgetGrid(
    operational_budget_id: string,
    tenantId: string
  ): Promise<OperationalBudgetCategoryEntity[]> {
    // Fetch budget categories with their allocations
    return this.dataSource.getRepository(OperationalBudgetCategoryEntity).find({
      where: { operational_budget_id, tenant_id: tenantId },
      relations: ["allocations"],
      order: { name: "ASC" },
    });
  }

  async upsertAllocation(
    operational_budget_category_id: string,
    period_date: string, // YYYY-MM-DD
    amount: number,
    period_type: PeriodType,
    tenantId: string
  ): Promise<OperationalBudgetPeriodAllocationEntity> {
    // Verify ownership via category
    const category = await this.dataSource.getRepository(OperationalBudgetCategoryEntity).findOne({
      where: { operational_budget_category_id, tenant_id: tenantId },
    });

    if (!category) {
      throw new NotFoundException("Budget Category not found or access denied.");
    }

    const date = new Date(period_date);
    
    let allocation = await this.allocationRepository.findOne({
      where: {
        operational_budget_category_id,
        period_date: date, // TypeORM handles date string/object comparison well usually
      },
    });

    if (allocation) {
      allocation.planned_amount = amount;
      // We might update period_type here if it changes, but usually it's fixed for the view
      allocation.period_type = period_type; 
    } else {
      allocation = this.allocationRepository.create({
        operational_budget_category_id,
        period_date: date,
        planned_amount: amount,
        period_type,
      });
    }

    const saved = await this.allocationRepository.save(allocation);
    
    // Recalculate Total Budgeted for the Category
    await this.recalculateCategoryTotal(operational_budget_category_id);
    
    return saved;
  }

  private async recalculateCategoryTotal(categoryId: string) {
    const { sum } = await this.allocationRepository
      .createQueryBuilder("allocation")
      .select("SUM(allocation.planned_amount)", "sum")
      .where("allocation.operational_budget_category_id = :categoryId", { categoryId })
      .getRawOne();
      
    await this.dataSource.getRepository(OperationalBudgetCategoryEntity).update(
      categoryId, 
      { budgeted_amount: sum || 0 }
    );
     
    // We should also roll up to the Parent Budget, but ensuring consistency in a distributed update requires locking or careful steps.
    // For now, we update the category. The Parent Budget update can be triggered or handled separately.
  }

  /**
   * OPEX ROLLUP — Dedicated OPEX summary endpoint
   * Returns budget→category→expense aggregation with:
   * - Temporal filtering (daily/weekly/monthly/all)
   * - Category-level variance and burn rate
   * - Top spending categories for analytics
   * - Period-over-period trend indicators
   */
  async getOpexRollup(
    tenantId: string,
    filters: {
      startDate?: string;
      endDate?: string;
      budget_id?: string;
      type?: string;
    } = {}
  ): Promise<OpexRollupResult> {
    const { startDate, endDate, budget_id, type } = filters;

    // Step 1: Fetch all active budgets for tenant
    const budgetQb = this.operationalBudgetRepository
      .createQueryBuilder('b')
      .leftJoinAndSelect('b.categories', 'cat')
      .where('b.tenant_id = :tenantId', { tenantId });

    if (budget_id) budgetQb.andWhere('b.operational_budget_id = :budget_id', { budget_id });
    if (type) budgetQb.andWhere('b.type = :type', { type });

    const budgets = await budgetQb.getMany();

    if (!budgets.length) {
      return { budgets: [], summary: { totalBudgeted: 0, totalActual: 0, totalVariance: 0, efficiencyScore: 100, topBurningCategories: [] } };
    }

    const categoryIds = budgets.flatMap(b => b.categories?.map(c => c.operational_budget_category_id) ?? []);

    // Step 2: Aggregate actual expenses per category with temporal filter
    let expenseQb = this.operationalExpenseRepository
      .createQueryBuilder('e')
      .select('e.operational_budget_category_id', 'category_id')
      .addSelect('SUM(e.amount)', 'actual_in_period')
      .where('e.tenant_id = :tenantId', { tenantId });

    if (categoryIds.length > 0) {
      expenseQb.andWhere('e.operational_budget_category_id IN (:...categoryIds)', { categoryIds });
    }
    if (startDate) expenseQb.andWhere('e.expense_date >= :startDate', { startDate });
    if (endDate) expenseQb.andWhere('e.expense_date <= :endDate', { endDate });

    expenseQb.andWhere("e.status != 'REJECTED'").groupBy('e.operational_budget_category_id');

    const actualByCategory: { category_id: string; actual_in_period: string }[] = await expenseQb.getRawMany();
    const actualMap = new Map(actualByCategory.map(r => [r.category_id, parseFloat(r.actual_in_period) || 0]));

    // Step 3: Build structured rollup per budget
    let totalBudgeted = 0;
    let totalActual = 0;

    const rolledUpBudgets: OpexBudgetRollup[] = budgets.map(budget => {
      const categories: OpexCategoryRollup[] = (budget.categories || []).map(cat => {
        const budgeted = parseFloat(String(cat.budgeted_amount)) || 0;
        const actual = actualMap.get(cat.operational_budget_category_id) ?? (parseFloat(String(cat.actual_spent)) || 0);
        const variance = budgeted - actual;
        const burnRate = budgeted > 0 ? (actual / budgeted) * 100 : 0;

        return {
          id: cat.operational_budget_category_id,
          name: cat.name,
          budgeted,
          actual,
          variance,
          burnRate: parseFloat(burnRate.toFixed(2)),
          status: burnRate > 100 ? 'OVERRUN' : burnRate > 85 ? 'AT_RISK' : 'HEALTHY',
        };
      });

      // Sort categories by actual spend descending for clarity
      categories.sort((a, b) => b.actual - a.actual);

      const budgetBudgeted = parseFloat(String(budget.budgeted_amount)) || 0;
      const budgetActual = categories.reduce((s, c) => s + c.actual, 0);
      const budgetVariance = budgetBudgeted - budgetActual;

      totalBudgeted += budgetBudgeted;
      totalActual += budgetActual;

      return {
        budget_id: budget.operational_budget_id,
        name: budget.name,
        type: budget.type,
        status: budget.status,
        start_date: budget.start_date,
        end_date: budget.end_date,
        budgeted: budgetBudgeted,
        actual: budgetActual,
        variance: budgetVariance,
        burnRate: budgetBudgeted > 0 ? parseFloat(((budgetActual / budgetBudgeted) * 100).toFixed(2)) : 0,
        categories,
      };
    });

    // Sort budgets by burn rate descending (most critical first)
    rolledUpBudgets.sort((a, b) => b.burnRate - a.burnRate);

    const totalVariance = totalBudgeted - totalActual;
    const efficiencyScore = totalBudgeted > 0 ? parseFloat(((1 - totalActual / totalBudgeted) * 100).toFixed(2)) : 100;

    // Top 5 burning categories across all budgets
    const allCategories = rolledUpBudgets.flatMap(b => b.categories);
    allCategories.sort((a, b) => b.actual - a.actual);
    const topBurningCategories = allCategories.slice(0, 5).map(c => ({ name: c.name, actual: c.actual, burnRate: c.burnRate }));

    return {
      budgets: rolledUpBudgets,
      summary: {
        totalBudgeted,
        totalActual,
        totalVariance,
        efficiencyScore,
        topBurningCategories,
      },
    };
  }

  /**
   * ADVANCED: Operational Payroll Bot
   * Batch generates payroll entries based on a provided template mapping.
   */
  async runPayrollBot(
    payrollTemplate: { employee_name: string; base_salary: number; operational_budget_id: string; employee_id?: string }[],
    userId: string,
    tenantId: string,
  ): Promise<PayrollEntryEntity[]> {
      const results: PayrollEntryEntity[] = [];
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

      this.logger.log(`Running Payroll Bot for ${payrollTemplate.length} employees on tenant ${tenantId}`);

      for (const item of payrollTemplate) {
          // Calculate simple net pay (ignoring tax/pension for bot simplicity unless specified)
          const entry = await this.logPayrollEntry({
              ...item,
              pay_period_start: startOfMonth,
              pay_period_end: endOfMonth,
              payment_date: now,
              net_pay: Number(item.base_salary),
              status: 'PAID'
          }, userId, tenantId);
          results.push(entry);
      }
      return results;
  }
}
