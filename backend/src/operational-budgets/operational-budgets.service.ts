import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
  Logger,
  Inject,
} from "@nestjs/common";
import {
  Repository,
  Like,
  Between,
  DataSource,
  LessThanOrEqual,
} from "typeorm";
import { TENANT_DATA_SOURCE } from "../database/constants";
import { OperationalBudgetEntity } from "./operational-budget.entity";
import { CreateOperationalBudgetDto } from "./dto/create-operational-budget.dto";
import { UpdateOperationalBudgetDto } from "./dto/update-operational-budget.dto";
import { GetOperationalBudgetsDto } from "./dto/get-operational-budgets.dto";
import { UpdateBudgetCategoryDto } from "./dto/update-budget-category.dto";
import { OperationalBudgetCategoryEntity } from "./operational-budget-category.entity";
import {
  OperationalExpenseEntity,
  OperationalExpenseStatus,
} from "./operational-expense.entity";
import { PayrollEntryEntity, PayrollEntryStatus } from "./payroll-entry.entity";
import { BudgetCategoryEntity } from "./budget-category.entity";
import { AuditService } from "../audit/audit.service";
import {
  OperationalBudgetPeriodAllocationEntity,
  PeriodType,
} from "./operational-budget-period-allocation.entity";
import { BudgetControlService } from "../common/budget-control.service";
import { PdfUtility } from "../common/pdf.utility";
import { ExcelUtility } from "../common/excel.utility";
import { WordUtility } from "../common/word.utility";
import { Buffer } from "buffer";
import {
  VarianceFlag,
  OpexAnalytics,
  OpexAnalyticsSeries,
  OpexAnalyticsSeriesDepartment,
  OpexAnalyticsPeriodRow,
  OpexAnalyticsMonthlyTrend,
  OpexAnalyticsRecentExpense,
} from "@shared/types";
import { NotificationsService } from "../notifications/notifications.service";

// ---- OPEX Rollup Types ----
export interface OpexCategoryRollup {
  id: string;
  name: string;
  budgeted: number;
  actual: number;
  variance: number;
  burnRate: number;
  status: "OVERRUN" | "AT_RISK" | "HEALTHY";
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

export interface PlanningGridCell {
  operational_budget_category_id?: string;
  categoryId?: string;
  period_date?: string;
  periodDate?: string;
  amount?: number;
  planned_amount?: number;
  period_type?: PeriodType;
  periodType?: PeriodType;
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
    private readonly auditService: AuditService,
  ) {}

  // Centralized Governance Constants
  private readonly CRITICAL_OVERRIDE_ROLES = [
    "CFO",
    "CEO",
    "Admin Director",
    "SuperAdmin",
  ];
  private readonly MAJOR_OVERRIDE_ROLES = [
    "Finance Manager",
    "CFO",
    "CEO",
    "Admin Director",
    "SuperAdmin",
    "Finance Officer",
  ];

  private isOverrideRoleFor(flag: VarianceFlag, role?: string): boolean {
    if (!role) return false;
    if (flag === VarianceFlag.CRITICAL_VARIANCE) {
      return this.CRITICAL_OVERRIDE_ROLES.includes(role);
    }
    if (flag === VarianceFlag.MAJOR_VARIANCE) {
      return this.MAJOR_OVERRIDE_ROLES.includes(role);
    }
    return true;
  }

  private varianceRequiresOverride(
    flag: VarianceFlag,
  ): flag is VarianceFlag.CRITICAL_VARIANCE | VarianceFlag.MAJOR_VARIANCE {
    return (
      flag === VarianceFlag.CRITICAL_VARIANCE ||
      flag === VarianceFlag.MAJOR_VARIANCE
    );
  }

  private async writeExpenseAudit(
    userId: string,
    tenantId: string,
    expenseId: string,
    before: unknown,
    after: unknown,
  ): Promise<void> {
    const description = `[OPEX] EXPENSE MUTATION | before: ${JSON.stringify(before ?? {})} after: ${JSON.stringify(after ?? {})}`;
    this.auditService.log(
      userId,
      "OPEX_EXPENSE_MUTATION",
      tenantId,
      description,
      {
        before: before ?? null,
        after: after ?? null,
        targetType: "OPERATIONAL_EXPENSE",
        targetId: expenseId,
      },
    );
    this.logger.log(description);
  }

  private expenseSnapshot(
    e: OperationalExpenseEntity,
  ): Record<string, unknown> {
    return {
      operational_expense_id: e.operational_expense_id,
      tenant_id: e.tenant_id,
      operational_budget_category_id: e.operational_budget_category_id,
      item_description: e.item_description,
      amount: Number(e.amount),
      expense_date: e.expense_date,
      vendor: e.vendor,
      receipt_url: e.receipt_url,
      status: e.status,
      logged_by_user_id: e.logged_by_user_id,
      variance_flag: e.variance_flag,
      override_reason: e.override_reason ?? null,
      created_at: e.created_at,
      updated_at: e.updated_at,
    };
  }

  /**
   * Keep the period-allocation `actual_amount` in sync when a settled
   * expense/payroll consumes budget. Allocations are the only period view of a
   * budget, so this writes the most-recent allocation covering the amount date
   * (period_date <= date). Never let a secondary analytics write fail the
   * primary ledger operation.
   */
  private async bumpPeriodAllocationActual(
    scopeId: string,
    byBudget: boolean,
    tenantId: string,
    amountDate: Date,
    delta: number,
  ): Promise<void> {
    if (!delta) return;
    try {
      let allocation: OperationalBudgetPeriodAllocationEntity | null;
      if (!byBudget) {
        allocation = await this.allocationRepository.findOne({
          where: {
            operational_budget_category_id: scopeId,
            tenant_id: tenantId,
            period_date: LessThanOrEqual(amountDate),
          },
          order: { period_date: "DESC" },
        });
      } else {
        // Payroll links to the budget, not a category: attribute the amount to
        // the most-recent period allocation across the budget's categories.
        allocation = await this.allocationRepository
          .createQueryBuilder("allocation")
          .innerJoin(
            OperationalBudgetCategoryEntity,
            "cat",
            "cat.operational_budget_category_id = allocation.operational_budget_category_id",
          )
          .where("cat.operational_budget_id = :budgetId", { budgetId: scopeId })
          .andWhere("allocation.tenant_id = :tenantId", { tenantId })
          .andWhere("allocation.period_date <= :amountDate", { amountDate })
          .orderBy("allocation.period_date", "DESC")
          .getOne();
      }

      if (!allocation) return;
      allocation.actual_amount = Number(allocation.actual_amount) + delta;
      await this.allocationRepository.save(allocation);
    } catch (error) {
      this.logger.warn(
        `[OPEX] period allocation actual_amount write skipped: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

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
      const category = await this.dataSource
        .getRepository(OperationalBudgetCategoryEntity)
        .findOne({
          where: {
            operational_budget_category_id:
              expenseData.operational_budget_category_id,
            tenant_id: tenantId,
          },
          relations: ["operationalBudget"],
        });

      if (category && category.operationalBudget) {
        const budget = category.operationalBudget;

        // Re-use logic from WbsService but adapt for OPEX limit vs Actual Spread
        const totalActual = Number(budget.actual_spent || 0);
        const budgetLimit = Number(budget.budgeted_amount || 0);

        // Calculate Pending Opex Expenses
        const pendingResults = await this.dataSource.query(
          `SELECT COALESCE(SUM(amount), 0) as total FROM operational_expense WHERE category_operational_budget_category_id = $1 AND tenant_id = $2 AND status = 'PENDING'`,
          [category.operational_budget_category_id, tenantId],
        );
        // We'll estimate overrun based just on budget limits to mimic wbs
        const projectedTotal =
          totalActual +
          parseFloat(pendingResults[0]?.total || 0) +
          Number(expenseData.amount || 0);

        // Tiered Variance Checking
        if (budgetLimit <= 0) {
          finalFlag = VarianceFlag.CRITICAL_VARIANCE;
          const msg = `[OPEX] VARIANCE TIER CRITICAL | ${budget.name}: Budget has $0 defined, but expense is being logged.`;
          this.notificationsService.sendVarianceAlert(
            "Critical OPEX Overrun",
            msg,
            "error",
          );
        } else if (projectedTotal > budgetLimit) {
          const variancePercentage =
            ((projectedTotal - budgetLimit) / budgetLimit) * 100;
          if (variancePercentage >= 10) {
            finalFlag = VarianceFlag.CRITICAL_VARIANCE;
          } else if (variancePercentage >= 5) {
            finalFlag = VarianceFlag.MAJOR_VARIANCE;
          } else {
            finalFlag = VarianceFlag.MINOR_VARIANCE;
          }

          this.notificationsService.sendVarianceAlert(
            `${finalFlag.replace(/_/g, " ")}`,
            `[OPEX] VARIANCE TIER ${finalFlag} | ${budget.name} | ${variancePercentage.toFixed(2)}% over budget (${(projectedTotal - budgetLimit).toFixed(2)} excess).`,
            finalFlag === VarianceFlag.CRITICAL_VARIANCE ||
              finalFlag === VarianceFlag.MAJOR_VARIANCE
              ? "error"
              : "warning",
          );
        }

        // Governance Decisions
        if (this.varianceRequiresOverride(finalFlag)) {
          const isCritical = finalFlag === VarianceFlag.CRITICAL_VARIANCE;
          const isAuthorizedAtAll = isCritical
            ? actorRole && this.CRITICAL_OVERRIDE_ROLES.includes(actorRole)
            : actorRole && this.MAJOR_OVERRIDE_ROLES.includes(actorRole);

          if (!expenseData.override_reason) {
            throw new BadRequestException({
              statusCode: 403,
              errorCode: finalFlag,
              message: `OPEX overrun limit reached. Requires justification override.`,
              requiredRoles: isCritical
                ? this.CRITICAL_OVERRIDE_ROLES
                : this.MAJOR_OVERRIDE_ROLES,
            });
          }

          if (isAuthorizedAtAll) {
            // SoD: at log time the actor IS the submitter — an overrun that
            // requires an override must be approved by a DIFFERENT approver.
            throw new ForbiddenException(
              "[OPEX] SoD BLOCKED: approver cannot approve own submission",
            );
          }

          finalStatus = OperationalExpenseStatus.PENDING;
          this.logger.log(
            `[OPEX] PENDING APPROVAL routed for ${actorRole || "unknown"} | Budget: ${budget.name}`,
          );
        } else {
          finalStatus = OperationalExpenseStatus.APPROVED; // Auto-approve if no critical/major variance
        }

        // Update category actual spent ONLY if approved
        if (finalStatus === OperationalExpenseStatus.APPROVED) {
          category.actual_spent =
            Number(category.actual_spent) + Number(expenseData.amount || 0);
          await this.dataSource
            .getRepository(OperationalBudgetCategoryEntity)
            .save(category);

          budget.actual_spent =
            Number(budget.actual_spent) + Number(expenseData.amount || 0);
          await this.operationalBudgetRepository.save(budget);

          await this.bumpPeriodAllocationActual(
            category.operational_budget_category_id,
            false,
            tenantId,
            expenseData.expense_date
              ? new Date(expenseData.expense_date)
              : new Date(),
            Number(expenseData.amount || 0),
          );
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

    const saved = await this.operationalExpenseRepository.save(expense);
    await this.writeExpenseAudit(userId, tenantId, saved.operational_expense_id, null, saved);
    return saved;
  }

  async logPayrollEntry(
    payrollData: Partial<PayrollEntryEntity>,
    userId: string,
    tenantId: string,
    actorRole?: string,
  ): Promise<PayrollEntryEntity> {
    const entryStatus = payrollData.status ?? PayrollEntryStatus.PAID;
    if (entryStatus === ("APPROVED" as PayrollEntryStatus)) {
      // SoD: a submitter cannot self-approve their own payroll entry at log time.
      throw new ForbiddenException(
        "[OPEX] SoD BLOCKED: approver cannot approve own submission",
      );
    }

    const entry = this.payrollEntryRepository.create({
      ...payrollData,
      status: entryStatus,
      processed_by_user_id: userId,
      tenant_id: tenantId,
    });

    // Automatically deduct from associated operational budget if specified
    if (payrollData.operational_budget_id) {
      const budget = await this.operationalBudgetRepository.findOne({
        where: {
          operational_budget_id: payrollData.operational_budget_id,
          tenant_id: tenantId,
        },
      });
      if (budget) {
        // Validate budget constraint
        const health =
          await this.budgetControlService.validateAndAlertOperationalExpense(
            budget,
            Number(payrollData.net_pay || 0),
          );

        if (health === "OVER_BUDGET" && entry.status === PayrollEntryStatus.PAID) {
          // SoD: over-budget payroll cannot be self-approved at log time —
          // route to PENDING for a separate approver.
          entry.status = PayrollEntryStatus.PENDING;
          this.logger.warn(
            `[OPEX] PENDING APPROVAL routed for ${actorRole || "unknown"} | Budget: ${budget.name}`,
          );
        }

        if (entry.status === PayrollEntryStatus.PAID) {
          budget.actual_spent =
            Number(budget.actual_spent) + Number(payrollData.net_pay || 0);
          await this.operationalBudgetRepository.save(budget);

          await this.bumpPeriodAllocationActual(
            payrollData.operational_budget_id,
            true,
            tenantId,
            payrollData.payment_date
              ? new Date(payrollData.payment_date)
              : new Date(),
            Number(payrollData.net_pay || 0),
          );
        }
      }
    }

    return this.payrollEntryRepository.save(entry);
  }

  async deleteExpense(
    expenseId: string,
    tenantId: string,
    actorUserId?: string,
  ): Promise<void> {
    const expense = await this.operationalExpenseRepository.findOne({
      where: { operational_expense_id: expenseId, tenant_id: tenantId },
    });

    if (!expense) {
      throw new NotFoundException(`Expense ${expenseId} not found.`);
    }

    if (expense.status === OperationalExpenseStatus.APPROVED) {
      throw new BadRequestException(
        "APPROVED expense cannot be deleted; initiate a reversal/journal entry instead",
      );
    }

    if (actorUserId) {
      await this.writeExpenseAudit(
        actorUserId,
        tenantId,
        expenseId,
        expense,
        null,
      );
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      if (expense.operational_budget_category_id) {
        const category = await queryRunner.manager.findOne(
          OperationalBudgetCategoryEntity,
          {
            where: {
              operational_budget_category_id:
                expense.operational_budget_category_id,
              tenant_id: tenantId,
            },
            relations: ["operationalBudget"],
          },
        );

        if (category) {
          // Revert category spend
          category.actual_spent =
            Number(category.actual_spent) - Number(expense.amount);
          await queryRunner.manager.save(
            OperationalBudgetCategoryEntity,
            category,
          );

          // Revert budget spend
          if (category.operationalBudget) {
            const budget = category.operationalBudget;
            budget.actual_spent =
              Number(budget.actual_spent) - Number(expense.amount);
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
    actorUserId?: string,
    actorRole?: string,
  ): Promise<OperationalExpenseEntity> {
    const expense = await this.operationalExpenseRepository.findOne({
      where: { operational_expense_id: expenseId, tenant_id: tenantId },
    });

    if (!expense) {
      throw new NotFoundException(`Expense ${expenseId} not found.`);
    }

    // Mass-assignment guard: only a whitelisted subset of columns is ever
    // copied onto the entity (defense in depth beyond the DTO whitelist).
    const safeData: Pick<
      Partial<OperationalExpenseEntity>,
      | "operational_budget_category_id"
      | "item_description"
      | "amount"
      | "expense_date"
      | "vendor"
      | "receipt_url"
      | "status"
      | "variance_flag"
      | "override_reason"
    > = updateData;

    const requestedStatus = safeData.status;

    if (requestedStatus && requestedStatus !== expense.status) {
      this.enforceExpenseStatusTransition(
        expense,
        requestedStatus,
        actorUserId,
        actorRole,
      );
    }

    const beforeSnapshot = this.expenseSnapshot(expense);
    const oldAmount = Number(expense.amount);
    const newAmount =
      safeData.amount !== undefined ? Number(safeData.amount) : oldAmount;
    const amountDelta = newAmount - oldAmount;
    const newCategoryId =
      (safeData.operational_budget_category_id as string | undefined) ??
      expense.operational_budget_category_id;
    const reparenting =
      newCategoryId !== expense.operational_budget_category_id;

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      if (reparenting) {
        const oldCategory = await queryRunner.manager.findOne(
          OperationalBudgetCategoryEntity,
          {
            where: {
              operational_budget_category_id:
                expense.operational_budget_category_id,
              tenant_id: tenantId,
            },
            relations: ["operationalBudget"],
          },
        );
        const newCategory = await queryRunner.manager.findOne(
          OperationalBudgetCategoryEntity,
          {
            where: {
              operational_budget_category_id: newCategoryId,
              tenant_id: tenantId,
            },
            relations: ["operationalBudget"],
          },
        );

        if (!newCategory) {
          throw new BadRequestException(
            `Target budget category ${newCategoryId} not found for this tenant.`,
          );
        }

        if (oldCategory) {
          oldCategory.actual_spent =
            Number(oldCategory.actual_spent) - oldAmount;
          await queryRunner.manager.save(
            OperationalBudgetCategoryEntity,
            oldCategory,
          );
          if (oldCategory.operationalBudget) {
            oldCategory.operationalBudget.actual_spent =
              Number(oldCategory.operationalBudget.actual_spent) - oldAmount;
            await queryRunner.manager.save(
              OperationalBudgetEntity,
              oldCategory.operationalBudget,
            );
          }
        }

        newCategory.actual_spent =
          Number(newCategory.actual_spent) + newAmount;
        await queryRunner.manager.save(
          OperationalBudgetCategoryEntity,
          newCategory,
        );
        if (newCategory.operationalBudget) {
          newCategory.operationalBudget.actual_spent =
            Number(newCategory.operationalBudget.actual_spent) + newAmount;
          await queryRunner.manager.save(
            OperationalBudgetEntity,
            newCategory.operationalBudget,
          );
        }
      } else if (amountDelta !== 0 && expense.operational_budget_category_id) {
        const category = await queryRunner.manager.findOne(
          OperationalBudgetCategoryEntity,
          {
            where: {
              operational_budget_category_id:
                expense.operational_budget_category_id,
              tenant_id: tenantId,
            },
            relations: ["operationalBudget"],
          },
        );

        if (category) {
          // Adjust category spend
          category.actual_spent = Number(category.actual_spent) + amountDelta;
          await queryRunner.manager.save(
            OperationalBudgetCategoryEntity,
            category,
          );

          // Adjust budget spend
          if (category.operationalBudget) {
            const budget = category.operationalBudget;
            budget.actual_spent =
              Number(budget.actual_spent) + amountDelta;
            await queryRunner.manager.save(OperationalBudgetEntity, budget);
          }
        }
      }

      Object.assign(expense, safeData);
      const saved = await queryRunner.manager.save(
        OperationalExpenseEntity,
        expense,
      );
      await queryRunner.commitTransaction();

      if (actorUserId) {
        await this.writeExpenseAudit(
          actorUserId,
          tenantId,
          expenseId,
          beforeSnapshot,
          this.expenseSnapshot(saved),
        );
      }

      return saved;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  private enforceExpenseStatusTransition(
    expense: OperationalExpenseEntity,
    nextStatus: OperationalExpenseStatus,
    actorUserId?: string,
    actorRole?: string,
  ): void {
    if (expense.status === OperationalExpenseStatus.APPROVED) {
      throw new BadRequestException(
        "APPROVED expense cannot be modified; initiate a reversal/journal entry instead",
      );
    }

    if (expense.status === OperationalExpenseStatus.REVERSED) {
      throw new BadRequestException(
        "REVERSED expense is terminal and cannot be modified.",
      );
    }

    if (
      nextStatus === OperationalExpenseStatus.APPROVED ||
      nextStatus === OperationalExpenseStatus.REJECTED
    ) {
      if (
        actorUserId &&
        expense.logged_by_user_id &&
        expense.logged_by_user_id === actorUserId
      ) {
        throw new BadRequestException(
          "[OPEX] SoD BLOCKED: approver cannot approve own submission",
        );
      }

      if (
        this.varianceRequiresOverride(expense.variance_flag) &&
        !this.isOverrideRoleFor(expense.variance_flag, actorRole)
      ) {
        throw new BadRequestException(
          `OPEX overrun approval for ${expense.variance_flag} requires an authorized override role.`,
        );
      }
    }
  }

  async approveExpense(
    expenseId: string,
    tenantId: string,
    approverUserId: string,
    actorRole?: string,
  ): Promise<OperationalExpenseEntity> {
    const expense = await this.operationalExpenseRepository.findOne({
      where: { operational_expense_id: expenseId, tenant_id: tenantId },
    });

    if (!expense) {
      throw new NotFoundException(`Expense ${expenseId} not found.`);
    }

    if (expense.logged_by_user_id === approverUserId) {
      throw new ForbiddenException(
        "[OPEX] SoD BLOCKED: approver cannot approve own submission",
      );
    }

    if (
      this.varianceRequiresOverride(expense.variance_flag) &&
      !this.isOverrideRoleFor(expense.variance_flag, actorRole)
    ) {
      throw new ForbiddenException(
        `OPEX overrun approval for ${expense.variance_flag} requires one of: ${
          expense.variance_flag === VarianceFlag.CRITICAL_VARIANCE
            ? this.CRITICAL_OVERRIDE_ROLES
            : this.MAJOR_OVERRIDE_ROLES
        }.`,
      );
    }

    if (expense.status !== OperationalExpenseStatus.PENDING) {
      throw new BadRequestException(
        `[OPEX] Expense ${expenseId} is not PENDING (current status: ${expense.status}).`,
      );
    }

    const beforeSnapshot = this.expenseSnapshot(expense);
    expense.status = OperationalExpenseStatus.APPROVED;
    const approved = await this.operationalExpenseRepository.save(expense);
    await this.writeExpenseAudit(
      approverUserId,
      tenantId,
      expenseId,
      beforeSnapshot,
      this.expenseSnapshot(approved),
    );

    // Update category + budget actual spend (same as logExpense)
    if (expense.operational_budget_category_id) {
      const category = await this.dataSource
        .getRepository(OperationalBudgetCategoryEntity)
        .findOne({
          where: {
            operational_budget_category_id: expense.operational_budget_category_id,
            tenant_id: tenantId,
          },
          relations: ["operationalBudget"],
        });

      if (category) {
        category.actual_spent =
          Number(category.actual_spent) + Number(expense.amount || 0);
        await this.dataSource
          .getRepository(OperationalBudgetCategoryEntity)
          .save(category);

        if (category.operationalBudget) {
          const budget = category.operationalBudget;
          budget.actual_spent =
            Number(budget.actual_spent) + Number(expense.amount || 0);
          await this.operationalBudgetRepository.save(budget);
        }
      }
    }

    this.logger.warn(
      `[OPEX] APPROVED by ${actorRole} | ${expense.item_description} | Approver: ${approverUserId} (SoD: submitter ${expense.logged_by_user_id} != approver)`,
    );

    return approved;
  }

  async rejectExpense(
    expenseId: string,
    tenantId: string,
    approverUserId: string,
    actorRole?: string,
    reason?: string,
  ): Promise<OperationalExpenseEntity> {
    const expense = await this.operationalExpenseRepository.findOne({
      where: { operational_expense_id: expenseId, tenant_id: tenantId },
    });

    if (!expense) {
      throw new NotFoundException(`Expense ${expenseId} not found.`);
    }

    if (expense.status !== OperationalExpenseStatus.PENDING) {
      throw new BadRequestException(
        `[OPEX] Expense ${expenseId} is not PENDING (current status: ${expense.status}).`,
      );
    }

    if (expense.logged_by_user_id === approverUserId) {
      throw new ForbiddenException(
        "[OPEX] SoD BLOCKED: approver cannot reject own submission",
      );
    }

    const beforeSnapshot = this.expenseSnapshot(expense);
    expense.status = OperationalExpenseStatus.REJECTED;
    const rejected = await this.operationalExpenseRepository.save(expense);
    await this.writeExpenseAudit(
      approverUserId,
      tenantId,
      expenseId,
      beforeSnapshot,
      this.expenseSnapshot(rejected),
    );

    this.logger.warn(
      `[OPEX] REJECTED by ${actorRole} | ${expense.item_description} | Reason: ${reason || "No reason provided"}`,
    );

    return rejected;
  }

  async findAllExpenses(
    tenantId: string,
    filters: {
      budget_id?: string;
      category_id?: string;
      status?: string;
      startDate?: string;
      endDate?: string;
      page?: number;
      limit?: number;
    } = {},
  ): Promise<{ data: OperationalExpenseEntity[]; total: number }> {
    const {
      budget_id,
      category_id,
      status,
      startDate,
      endDate,
      page = 1,
      limit = 10,
    } = filters;
    const skip = (page - 1) * limit;

    const queryBuilder = this.operationalExpenseRepository
      .createQueryBuilder("expense")
      .leftJoinAndSelect("expense.category", "category")
      .leftJoinAndSelect("category.operationalBudget", "budget")
      .where("expense.tenant_id = :tenantId", { tenantId });

    if (budget_id) {
      queryBuilder.andWhere("category.operational_budget_id = :budget_id", {
        budget_id,
      });
    }
    if (category_id) {
      queryBuilder.andWhere(
        "expense.operational_budget_category_id = :category_id",
        { category_id },
      );
    }
    if (status) {
      queryBuilder.andWhere("expense.status = :status", { status });
    }
    if (startDate && endDate) {
      queryBuilder.andWhere(
        "expense.expense_date BETWEEN :startDate AND :endDate",
        {
          startDate,
          endDate,
        },
      );
    }

    const [data, total] = await queryBuilder
      .orderBy("expense.expense_date", "DESC")
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return { data, total };
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

  async getAvailableCategories(
    tenantId: string,
  ): Promise<BudgetCategoryEntity[]> {
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
    description?: string,
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

  async updateCategory(
    id: string,
    dto: UpdateBudgetCategoryDto,
    tenantId: string,
  ): Promise<BudgetCategoryEntity> {
    const category = await this.budgetCategoryRepository.findOne({
      where: { id },
    });

    if (!category || category.tenant_id !== tenantId) {
      throw new NotFoundException(
        `Budget category "${id}" not found for this tenant.`,
      );
    }

    if (category.is_system_default) {
      throw new BadRequestException(
        "System default categories cannot be modified.",
      );
    }

    Object.assign(category, dto);
    category.updated_at = new Date();
    return this.budgetCategoryRepository.save(category);
  }

  async deleteCategory(
    id: string,
    tenantId: string,
  ): Promise<BudgetCategoryEntity> {
    const category = await this.budgetCategoryRepository.findOne({
      where: { id },
    });

    if (!category || category.tenant_id !== tenantId) {
      throw new NotFoundException(
        `Budget category "${id}" not found for this tenant.`,
      );
    }

    if (category.is_system_default) {
      throw new BadRequestException(
        "System default categories cannot be deleted.",
      );
    }

    // Guard: block deletion while any expense references this category. The
    // catalog table has no FK to expenses, so usage is resolved by the shared
    // category name against the tenant's operational budget categories.
    const inUseRows = (await this.dataSource.query(
      `SELECT COUNT(*)::int AS count
         FROM operational_expense e
         JOIN operational_budget_category obc
           ON obc.operational_budget_category_id = e.operational_budget_category_id
        WHERE e.tenant_id = $1
          AND obc.tenant_id = $1
          AND obc.name = $2
          AND e.deleted_at IS NULL`,
      [tenantId, category.name],
    )) as { count: number | string }[];

    const inUseCount = Number(inUseRows?.[0]?.count ?? 0);
    if (inUseCount > 0) {
      throw new ConflictException(
        `Budget category "${category.name}" is in use by ${inUseCount} expense(s) and cannot be deleted.`,
      );
    }

    // Soft-delete: this entity has no deleted_at column, so the existing
    // is_active flag is the soft-delete signal (getAvailableCategories filters it).
    category.is_active = false;
    category.updated_at = new Date();
    return this.budgetCategoryRepository.save(category);
  }

  // --- Grid & Allocation Management ---

  async getBudgetGrid(
    operational_budget_id: string,
    tenantId: string,
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
    tenantId: string,
  ): Promise<OperationalBudgetPeriodAllocationEntity> {
    // Verify ownership via category
    const category = await this.dataSource
      .getRepository(OperationalBudgetCategoryEntity)
      .findOne({
        where: { operational_budget_category_id, tenant_id: tenantId },
      });

    if (!category) {
      throw new NotFoundException(
        "Budget Category not found or access denied.",
      );
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
        tenant_id: tenantId,
      });
    }

    const saved = await this.allocationRepository.save(allocation);

    // Recalculate Total Budgeted for the Category
    await this.recalculateCategoryTotal(operational_budget_category_id);

    return saved;
  }

  private async recalculateCategoryTotal(categoryId: string) {
    const category = await this.dataSource
      .getRepository(OperationalBudgetCategoryEntity)
      .findOne({
        where: { operational_budget_category_id: categoryId },
      });

    if (!category) {
      return;
    }

    const { sum } = await this.allocationRepository
      .createQueryBuilder("allocation")
      .select("SUM(allocation.planned_amount)", "sum")
      .where("allocation.operational_budget_category_id = :categoryId", {
        categoryId,
      })
      .getRawOne();

    await this.dataSource
      .getRepository(OperationalBudgetCategoryEntity)
      .update(categoryId, { budgeted_amount: sum || 0 });

    // Roll up to the owning Parent Budget: budgeted_amount = SUM of its categories.
    const { catSum } = await this.dataSource
      .getRepository(OperationalBudgetCategoryEntity)
      .createQueryBuilder("cat")
      .select("SUM(cat.budgeted_amount)", "catSum")
      .where("cat.operational_budget_id = :budgetId", {
        budgetId: category.operational_budget_id,
      })
      .getRawOne();

    await this.operationalBudgetRepository.update(
      category.operational_budget_id,
      {
        budgeted_amount: catSum || 0,
        updated_at: new Date(),
      },
    );
  }

  async savePlanningGrid(
    budgetId: string,
    tenantId: string,
    cells: PlanningGridCell[],
    actorUserId?: string,
    actorRole?: string,
  ): Promise<{ saved: number; categoriesUpdated: string[] }> {
    const budget = await this.dataSource
      .getRepository(OperationalBudgetEntity)
      .findOne({
        where: { operational_budget_id: budgetId, tenant_id: tenantId },
      });

    if (!budget) {
      throw new NotFoundException(
        `Operational Budget "${budgetId}" not found for this tenant.`,
      );
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const categoryRepo =
        queryRunner.manager.getRepository(OperationalBudgetCategoryEntity);
      const allocationRepo = queryRunner.manager.getRepository(
        OperationalBudgetPeriodAllocationEntity,
      );
      const touchedCategories = new Set<string>();

      for (const cell of cells) {
        const categoryId =
          cell.operational_budget_category_id || cell.categoryId;
        const periodDate = cell.period_date || cell.periodDate;
        const amount = Number(cell.amount ?? cell.planned_amount ?? 0);
        const periodType =
          cell.period_type || cell.periodType || PeriodType.MONTHLY;

        if (!categoryId || !periodDate) {
          throw new BadRequestException(
            "[OPEX] PLANNING GRID cell missing category or period date.",
          );
        }

        const category = await categoryRepo.findOne({
          where: {
            operational_budget_category_id: categoryId,
            operational_budget_id: budgetId,
            tenant_id: tenantId,
          },
        });

        if (!category) {
          throw new NotFoundException(
            `Budget Category "${categoryId}" not found in budget "${budgetId}".`,
          );
        }

        const date = new Date(periodDate);

        let allocation = await allocationRepo.findOne({
          where: {
            operational_budget_category_id: categoryId,
            period_date: date,
            tenant_id: tenantId,
          },
        });

        if (allocation) {
          allocation.planned_amount = amount;
          allocation.period_type = periodType;
        } else {
          allocation = allocationRepo.create({
            operational_budget_category_id: categoryId,
            period_date: date,
            planned_amount: amount,
            period_type: periodType,
            tenant_id: tenantId,
          });
        }

        await allocationRepo.save(allocation);
        touchedCategories.add(categoryId);
      }

      // Recalculate category totals for every touched category
      for (const categoryId of touchedCategories) {
        const { sum } = await allocationRepo
          .createQueryBuilder("allocation")
          .select("SUM(allocation.planned_amount)", "sum")
          .where("allocation.operational_budget_category_id = :categoryId", {
            categoryId,
          })
          .getRawOne();

        await categoryRepo.update(categoryId, { budgeted_amount: sum || 0 });
      }

      // Roll up category totals into the parent budget
      const categories = await categoryRepo.find({
        where: { operational_budget_id: budgetId, tenant_id: tenantId },
      });
      budget.budgeted_amount = categories.reduce(
        (sum, c) => sum + Number(c.budgeted_amount || 0),
        0,
      );
      await queryRunner.manager.save(OperationalBudgetEntity, budget);

      await queryRunner.commitTransaction();

      this.logger.warn(
        `[OPEX] PLANNING GRID SAVED | Budget: ${budget.name} | ${cells.length} cell(s) | By: ${actorRole} (${actorUserId})`,
      );

      return { saved: cells.length, categoriesUpdated: [...touchedCategories] };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async submitToGovernance(
    budgetId: string,
    tenantId: string,
    userId: string,
    actorRole?: string,
  ): Promise<{
    budgetId: string;
    name: string;
    submittedAt: Date;
    pendingCount: number;
    totalPendingAmount: number;
    pendingExpenses: Array<{
      operational_expense_id: string;
      item_description: string;
      amount: number;
      expense_date: Date;
      variance_flag: VarianceFlag;
    }>;
  }> {
    const budget = await this.operationalBudgetRepository.findOne({
      where: { operational_budget_id: budgetId, tenant_id: tenantId },
    });

    if (!budget) {
      throw new NotFoundException(
        `Operational Budget "${budgetId}" not found for this tenant.`,
      );
    }

    const pendingExpenses = (
      await this.findAllExpenses(tenantId, {
        budget_id: budgetId,
        status: OperationalExpenseStatus.PENDING,
        limit: 1000,
      })
    ).data;

    const summary = {
      budgetId,
      name: budget.name,
      submittedAt: new Date(),
      pendingCount: pendingExpenses.length,
      totalPendingAmount: pendingExpenses.reduce(
        (sum, e) => sum + Number(e.amount || 0),
        0,
      ),
      pendingExpenses: pendingExpenses.map((e) => ({
        operational_expense_id: e.operational_expense_id,
        item_description: e.item_description,
        amount: Number(e.amount),
        expense_date: e.expense_date,
        variance_flag: e.variance_flag,
      })),
    };

    this.logger.warn(
      `[OPEX] SUBMITTED TO GOVERNANCE | Budget: ${budget.name} | ${pendingExpenses.length} pending expense(s) totaling ${summary.totalPendingAmount} | By: ${actorRole} (${userId})`,
    );

    if (pendingExpenses.length > 0) {
      this.notificationsService.sendVarianceAlert(
        "OPEX Governance Submission",
        `${budget.name}: ${pendingExpenses.length} expense(s) totaling ${summary.totalPendingAmount} submitted for governance review.`,
        "warning",
      );
    }

    return summary;
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
    } = {},
  ): Promise<OpexRollupResult> {
    const { startDate, endDate, budget_id, type } = filters;

    // Step 1: Fetch all active budgets for tenant
    const budgetQb = this.operationalBudgetRepository
      .createQueryBuilder("b")
      .leftJoinAndSelect("b.categories", "cat")
      .where("b.tenant_id = :tenantId", { tenantId });

    if (budget_id)
      budgetQb.andWhere("b.operational_budget_id = :budget_id", { budget_id });
    if (type) budgetQb.andWhere("b.type = :type", { type });

    const budgets = await budgetQb.getMany();

    if (!budgets.length) {
      return {
        budgets: [],
        summary: {
          totalBudgeted: 0,
          totalActual: 0,
          totalVariance: 0,
          efficiencyScore: 100,
          topBurningCategories: [],
        },
      };
    }

    const categoryIds = budgets.flatMap(
      (b) => b.categories?.map((c) => c.operational_budget_category_id) ?? [],
    );

    // Step 2: Aggregate actual expenses per category with temporal filter
    const expenseQb = this.operationalExpenseRepository
      .createQueryBuilder("e")
      .select("e.operational_budget_category_id", "category_id")
      .addSelect("SUM(e.amount)", "actual_in_period")
      .where("e.tenant_id = :tenantId", { tenantId });

    if (categoryIds.length > 0) {
      expenseQb.andWhere(
        "e.operational_budget_category_id IN (:...categoryIds)",
        { categoryIds },
      );
    }
    if (startDate)
      expenseQb.andWhere("e.expense_date >= :startDate", { startDate });
    if (endDate) expenseQb.andWhere("e.expense_date <= :endDate", { endDate });

    expenseQb
      .andWhere("e.status NOT IN ('REJECTED', 'REVERSED')")
      .groupBy("e.operational_budget_category_id");

    const actualByCategory: {
      category_id: string;
      actual_in_period: string;
    }[] = await expenseQb.getRawMany();
    const actualMap = new Map(
      actualByCategory.map((r) => [
        r.category_id,
        parseFloat(r.actual_in_period) || 0,
      ]),
    );

    // Step 3: Build structured rollup per budget
    let totalBudgeted = 0;
    let totalActual = 0;

    const rolledUpBudgets: OpexBudgetRollup[] = budgets.map((budget) => {
      const categories: OpexCategoryRollup[] = (budget.categories || []).map(
        (cat) => {
          const budgeted = parseFloat(String(cat.budgeted_amount)) || 0;
          const actual =
            actualMap.get(cat.operational_budget_category_id) ??
            (parseFloat(String(cat.actual_spent)) || 0);
          const variance = budgeted - actual;
          const burnRate = budgeted > 0 ? (actual / budgeted) * 100 : 0;

          return {
            id: cat.operational_budget_category_id,
            name: cat.name,
            budgeted,
            actual,
            variance,
            burnRate: parseFloat(burnRate.toFixed(2)),
            status:
              burnRate > 100
                ? "OVERRUN"
                : burnRate > 85
                  ? "AT_RISK"
                  : "HEALTHY",
          };
        },
      );

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
        burnRate:
          budgetBudgeted > 0
            ? parseFloat(((budgetActual / budgetBudgeted) * 100).toFixed(2))
            : 0,
        categories,
      };
    });

    // Sort budgets by burn rate descending (most critical first)
    rolledUpBudgets.sort((a, b) => b.burnRate - a.burnRate);

    const totalVariance = totalBudgeted - totalActual;
    const efficiencyScore =
      totalBudgeted > 0
        ? parseFloat(((1 - totalActual / totalBudgeted) * 100).toFixed(2))
        : 100;

    // Top 5 burning categories across all budgets
    const allCategories = rolledUpBudgets.flatMap((b) => b.categories);
    allCategories.sort((a, b) => b.actual - a.actual);
    const topBurningCategories = allCategories
      .slice(0, 5)
      .map((c) => ({ name: c.name, actual: c.actual, burnRate: c.burnRate }));

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
   * CANONICAL UNIFIED OPEX ANALYTICS — single typed envelope consumed by the
   * analytics page. Reuses getOpexRollup for the budget→category aggregation
   * and augments it with payroll, committed (PENDING) amounts, period
   * allocations, recent expenses and a monthly trend.
   */
  async getOpexAnalytics(
    tenantId: string,
    from?: string,
    to?: string,
  ): Promise<OpexAnalytics> {
    const rollup = await this.getOpexRollup(tenantId, {
      startDate: from,
      endDate: to,
    });

    // Committed (encumbered) expense amounts per category.
    const pendingExpenseQb = this.operationalExpenseRepository
      .createQueryBuilder("e")
      .select("e.operational_budget_category_id", "category_id")
      .addSelect("SUM(e.amount)", "committed")
      .where("e.tenant_id = :tenantId", { tenantId })
      .andWhere("e.status = :status", {
        status: OperationalExpenseStatus.PENDING,
      });
    if (from) pendingExpenseQb.andWhere("e.expense_date >= :from", { from });
    if (to) pendingExpenseQb.andWhere("e.expense_date <= :to", { to });
    pendingExpenseQb.groupBy("e.operational_budget_category_id");

    const committedByCategory = new Map<string, number>(
      (await pendingExpenseQb.getRawMany()).map((r) => [
        r.category_id,
        parseFloat(r.committed) || 0,
      ]),
    );

    // Settled (PAID) vs encumbered (PENDING) payroll per budget.
    const payrollQb = this.payrollEntryRepository
      .createQueryBuilder("p")
      .select("p.operational_budget_id", "budget_id")
      .addSelect(
        `SUM(CASE WHEN p.status = '${PayrollEntryStatus.PAID}' THEN p.net_pay ELSE 0 END)`,
        "paid",
      )
      .addSelect(
        `SUM(CASE WHEN p.status = '${PayrollEntryStatus.PENDING}' THEN p.net_pay ELSE 0 END)`,
        "pending",
      )
      .where("p.tenant_id = :tenantId", { tenantId });
    if (from) payrollQb.andWhere("p.payment_date >= :from", { from });
    if (to) payrollQb.andWhere("p.payment_date <= :to", { to });
    payrollQb.groupBy("p.operational_budget_id");

    const payrollByBudget = new Map<
      string,
      { paid: number; pending: number }
    >(
      (await payrollQb.getRawMany()).map((r) => [
        r.budget_id,
        { paid: parseFloat(r.paid) || 0, pending: parseFloat(r.pending) || 0 },
      ]),
    );

    // Department ownership per budget (for byDepartment rollup keys).
    const budgetMeta = await this.operationalBudgetRepository
      .createQueryBuilder("b")
      .select(["b.operational_budget_id", "b.department_id"])
      .where("b.tenant_id = :tenantId", { tenantId })
      .getRawMany();
    const deptByBudget = new Map<string, string | null>(
      budgetMeta.map((r) => [r.operational_budget_id, r.department_id ?? null]),
    );

    const byCategory: OpexAnalyticsSeries[] = [];
    const byDepartmentMap = new Map<string, OpexAnalyticsSeriesDepartment>();
    let totalCommitted = 0;

    for (const budget of rollup.budgets) {
      const payroll = payrollByBudget.get(budget.budget_id) ?? {
        paid: 0,
        pending: 0,
      };
      let categoryCommitted = 0;

      for (const cat of budget.categories) {
        const committed = committedByCategory.get(cat.id) ?? 0;
        categoryCommitted += committed;
        byCategory.push({
          categoryId: cat.id,
          name: cat.name,
          budgeted: cat.budgeted,
          actual: cat.actual,
          committed,
          variance: cat.budgeted - cat.actual,
        });
      }

      const deptKey = deptByBudget.get(budget.budget_id) ?? budget.budget_id;
      const row: OpexAnalyticsSeriesDepartment = byDepartmentMap.get(deptKey) ?? {
        departmentId: deptKey,
        name: budget.name,
        budgeted: 0,
        actual: 0,
        committed: 0,
        variance: 0,
      };
      row.budgeted += budget.budgeted;
      row.actual += budget.actual + payroll.paid;
      row.committed += categoryCommitted + payroll.pending;
      row.variance = row.budgeted - row.actual;
      byDepartmentMap.set(deptKey, row);

      totalCommitted += categoryCommitted + payroll.pending;
    }

    const byDepartment = [...byDepartmentMap.values()];

    // Period allocations (planned vs written-back actual) grouped by month.
    const allocationQb = this.allocationRepository
      .createQueryBuilder("a")
      .select("TO_CHAR(a.period_date, 'YYYY-MM')", "period")
      .addSelect("SUM(a.planned_amount)", "budgeted")
      .addSelect("SUM(a.actual_amount)", "actual")
      .where("a.tenant_id = :tenantId", { tenantId });
    if (from) allocationQb.andWhere("a.period_date >= :from", { from });
    if (to) allocationQb.andWhere("a.period_date <= :to", { to });
    allocationQb.groupBy("TO_CHAR(a.period_date, 'YYYY-MM')");

    const allocationByPeriod = await allocationQb.getRawMany();
    const allocationMap = new Map(allocationByPeriod.map((r) => [r.period, r]));

    const committedMonthlyQb = this.operationalExpenseRepository
      .createQueryBuilder("e")
      .select("TO_CHAR(e.expense_date, 'YYYY-MM')", "period")
      .addSelect("SUM(e.amount)", "committed")
      .where("e.tenant_id = :tenantId", { tenantId })
      .andWhere("e.status = :status", {
        status: OperationalExpenseStatus.PENDING,
      });
    if (from) committedMonthlyQb.andWhere("e.expense_date >= :from", { from });
    if (to) committedMonthlyQb.andWhere("e.expense_date <= :to", { to });
    committedMonthlyQb.groupBy("TO_CHAR(e.expense_date, 'YYYY-MM')");

    const committedByPeriod = new Map<string, number>(
      (await committedMonthlyQb.getRawMany()).map((r) => [
        r.period,
        parseFloat(r.committed) || 0,
      ]),
    );

    const periodKeys = Array.from(
      new Set([...allocationMap.keys(), ...committedByPeriod.keys()]),
    ).sort();

    const byPeriod: OpexAnalyticsPeriodRow[] = periodKeys.map((key) => {
      const alloc = allocationMap.get(key);
      return {
        period: key,
        budgeted: alloc ? parseFloat(alloc.budgeted) || 0 : 0,
        actual: alloc ? parseFloat(alloc.actual) || 0 : 0,
        committed: committedByPeriod.get(key) ?? 0,
      };
    });

    // Monthly trend: budgeted from allocations, actual from the ledger.
    const trendActualQb = this.operationalExpenseRepository
      .createQueryBuilder("e")
      .select("TO_CHAR(e.expense_date, 'YYYY-MM')", "month")
      .addSelect("SUM(e.amount)", "actual")
      .where("e.tenant_id = :tenantId", { tenantId })
      .andWhere("e.status NOT IN ('REJECTED', 'REVERSED')");
    if (from) trendActualQb.andWhere("e.expense_date >= :from", { from });
    if (to) trendActualQb.andWhere("e.expense_date <= :to", { to });
    trendActualQb.groupBy("TO_CHAR(e.expense_date, 'YYYY-MM')");

    const trendActualByMonth = new Map<string, number>(
      (await trendActualQb.getRawMany()).map((r) => [
        r.month,
        parseFloat(r.actual) || 0,
      ]),
    );

    const monthlyTrend: OpexAnalyticsMonthlyTrend[] = periodKeys.map((key) => {
      const alloc = allocationMap.get(key);
      return {
        month: key,
        budgeted: alloc ? parseFloat(alloc.budgeted) || 0 : 0,
        actual: trendActualByMonth.get(key) ?? 0,
      };
    });

    const recentQb = this.operationalExpenseRepository
      .createQueryBuilder("e")
      .leftJoinAndSelect("e.category", "category")
      .where("e.tenant_id = :tenantId", { tenantId });
    if (from) recentQb.andWhere("e.expense_date >= :from", { from });
    if (to) recentQb.andWhere("e.expense_date <= :to", { to });
    recentQb.orderBy("e.expense_date", "DESC").take(10);
    const recentExpenses: OpexAnalyticsRecentExpense[] = (
      await recentQb.getMany()
    ).map((e) => ({
      id: e.operational_expense_id,
      date: e.expense_date.toISOString(),
      description: e.item_description,
      amount: Number(e.amount),
      category: e.category?.name ?? null,
      status: e.status,
    }));

    const totalPaidPayroll = [...payrollByBudget.values()].reduce(
      (sum, r) => sum + r.paid,
      0,
    );
    const totalBudgeted = rollup.summary.totalBudgeted;
    const totalActual = rollup.summary.totalActual + totalPaidPayroll;
    const variance = totalBudgeted - totalActual;

    return {
      totals: {
        budgeted: totalBudgeted,
        actual: totalActual,
        committed: totalCommitted,
        variance,
        variancePct:
          totalBudgeted !== 0 ? (variance / totalBudgeted) * 100 : 0,
      },
      byCategory,
      byDepartment,
      byPeriod,
      recentExpenses,
      monthlyTrend,
    };
  }

  /**
   * ADVANCED: Operational Payroll Bot
   * Batch generates payroll entries based on a provided template mapping.
   */
  async runPayrollBot(
    payrollTemplate: {
      employee_name: string;
      base_salary: number;
      operational_budget_id: string;
      employee_id?: string;
      bonus?: number;
      overtime?: number;
      other_allowances?: number;
      pension_deduction?: number;
      tax_deduction?: number;
    }[],
    userId: string,
    tenantId: string,
    actorRole?: string,
  ): Promise<PayrollEntryEntity[]> {
    const results: PayrollEntryEntity[] = [];
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    this.logger.log(
      `Running Payroll Bot for ${payrollTemplate.length} employees on tenant ${tenantId} by ${actorRole || "unknown"}`,
    );

    for (const item of payrollTemplate) {
      const {
        base_salary,
        bonus = 0,
        overtime = 0,
        other_allowances = 0,
        pension_deduction = 0,
        tax_deduction = 0,
        ...rest
      } = item;

      const netPay = Number(
        (
          base_salary +
          bonus +
          overtime +
          other_allowances -
          pension_deduction -
          tax_deduction
        ).toFixed(2),
      );

      // SoD: the bot never self-approves payroll — entries that clear the
      // budget constraint are logged as PAID by the run initiator, and the
      // initiator is the submitter (approval remains a separate workflow).
      const entry = await this.logPayrollEntry(
        {
          ...rest,
          base_salary,
          bonus,
          overtime,
          other_allowances,
          pension_deduction,
          tax_deduction,
          pay_period_start: startOfMonth,
          pay_period_end: endOfMonth,
          payment_date: now,
          net_pay: netPay,
          status: PayrollEntryStatus.PAID,
        },
        userId,
        tenantId,
        actorRole,
      );
      results.push(entry);
    }
    return results;
  }
}
