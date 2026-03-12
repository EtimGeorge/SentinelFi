import { Injectable, Logger } from "@nestjs/common";
import { WbsBudgetEntity } from "../wbs/wbs-budget.entity";
import { WbsBudgetStatus, VarianceFlag } from "@shared/types";
import { OperationalBudgetEntity } from "../operational-budgets/operational-budget.entity";
import { NotificationsService } from "../notifications/notifications.service";

/**
 * TIERED VARIANCE RESULT:
 * - BLOCK: Hard stop — caller MUST reject the request without an authorizer override.
 * - REQUIRE_OVERRIDE: Caller must verify the actor has the required role & override_reason is present.
 * - WARN: Log the flag but allow continuation.
 * - ALLOW: No issue.
 */
export interface VarianceCheckResult {
  flag: VarianceFlag;
  action: 'ALLOW' | 'WARN' | 'REQUIRE_OVERRIDE' | 'BLOCK';
  variancePercentage: number;
  overrunAmount: number;
  message: string;
  requiredRoles?: string[]; // Roles that can provide an override
}

@Injectable()
export class BudgetControlService {
  private readonly logger = new Logger(BudgetControlService.name);

  constructor(private readonly notificationsService: NotificationsService) {}

  /**
   * TIERED VARIANCE CHECK for WBS/Project Expenses.
   * Returns a structured result for the calling service to enforce governance.
   *
   * Thresholds (Best Practice - PMBOK / IFRS Aligned):
   *   - >= 10% overrun OR absolute > budget: CRITICAL — BLOCK (CFO/CEO override required)
   *   - >= 5% overrun: MAJOR — REQUIRE_OVERRIDE (Finance Manager or above)
   *   - > 0% overrun: MINOR — WARN (notify Finance Manager)
   *   - UNAPPROVED WBS node: Always BLOCK
   */
  async validateWbsExpense(
    wbsItem: WbsBudgetEntity,
    amount: number,
    tenant_id: string,
    committedAmount: number = 0,
  ): Promise<VarianceCheckResult> {
    // --- Guard 1: Budget State (Non-negotiable) ---
    if (wbsItem.status !== WbsBudgetStatus.APPROVED && wbsItem.status !== 'RECALLED' as any) {
      this.notificationsService.sendVarianceAlert(
        'Unapproved Budget Usage',
        `Expense logged against WBS ${wbsItem.wbs_code} which is in '${wbsItem.status}' state.`,
        'warning',
      );
      return {
        flag: VarianceFlag.UNAPPROVED_BUDGET_USAGE,
        action: 'BLOCK',
        variancePercentage: 0,
        overrunAmount: 0,
        message: `Cannot log expense: WBS Budget line "${wbsItem.wbs_code}" is not APPROVED. Current status: ${wbsItem.status}.`,
        requiredRoles: ['CFO', 'CEO', 'Admin Director'],
      };
    }

    // --- Guard 2: Budget Overrun (Tiered) ---
    const totalActual = Number(wbsItem.total_cost_actual || 0);
    const budgetLimit = Number(wbsItem.total_cost_budgeted || 0);
    const projectedTotal = totalActual + committedAmount + amount;

    if (budgetLimit <= 0) {
      // No budget defined — allow with minor flag to avoid false blocks
      return {
        flag: VarianceFlag.MINOR_VARIANCE,
        action: 'WARN',
        variancePercentage: 0,
        overrunAmount: 0,
        message: `WBS "${wbsItem.wbs_code}" has no defined budget limit. Proceeding with log.`,
      };
    }

    if (projectedTotal > budgetLimit) {
      const overrunAmount = projectedTotal - budgetLimit;
      const variancePercentage = (overrunAmount / budgetLimit) * 100;

      // --- Tier 3: CRITICAL (>= 10%) — Hard Block, CFO/CEO Override Required ---
      if (variancePercentage >= 10) {
        const msg = `CRITICAL OVERRUN on WBS ${wbsItem.wbs_code}: ${variancePercentage.toFixed(1)}% over budget (${overrunAmount.toFixed(2)} excess).`;
        this.notificationsService.sendVarianceAlert('Critical Budget Overrun', msg, 'error');
        this.logger.error(`[BudgetControl] CRITICAL BLOCK | Tenant: ${tenant_id} | WBS: ${wbsItem.wbs_code} | Overrun: ${variancePercentage.toFixed(1)}%`);
        return {
          flag: VarianceFlag.CRITICAL_VARIANCE,
          action: 'BLOCK',
          variancePercentage,
          overrunAmount,
          message: `Hard block: A ${variancePercentage.toFixed(1)}% overrun on WBS "${wbsItem.wbs_code}" requires CFO or CEO override with documented justification.`,
          requiredRoles: ['CFO', 'CEO', 'Admin Director'],
        };
      }

      // --- Tier 2: MAJOR (5% to <10%) — Requires Override from Finance Manager+ ---
      if (variancePercentage >= 5) {
        const msg = `Major variance on WBS ${wbsItem.wbs_code}: ${variancePercentage.toFixed(1)}% over budget.`;
        this.notificationsService.sendVarianceAlert('Major Budget Variance', msg, 'error');
        this.logger.warn(`[BudgetControl] MAJOR | Tenant: ${tenant_id} | WBS: ${wbsItem.wbs_code} | Overrun: ${variancePercentage.toFixed(1)}%`);
        return {
          flag: VarianceFlag.MAJOR_VARIANCE,
          action: 'REQUIRE_OVERRIDE',
          variancePercentage,
          overrunAmount,
          message: `A ${variancePercentage.toFixed(1)}% budget overrun on WBS "${wbsItem.wbs_code}" requires Finance Manager approval with an override reason.`,
          requiredRoles: ['Finance Manager', 'CFO', 'CEO', 'Admin Director'],
        };
      }

      // --- Tier 1: MINOR (>0% to <5%) — Warn & Log ---
      const msg = `Minor variance on WBS ${wbsItem.wbs_code}: ${variancePercentage.toFixed(1)}% over budget.`;
      this.notificationsService.sendVarianceAlert('Minor Budget Variance', msg, 'warning');
      this.logger.log(`[BudgetControl] MINOR | Tenant: ${tenant_id} | WBS: ${wbsItem.wbs_code} | Overrun: ${variancePercentage.toFixed(1)}%`);
      return {
        flag: VarianceFlag.MINOR_VARIANCE,
        action: 'WARN',
        variancePercentage,
        overrunAmount,
        message: `Minor overrun (${variancePercentage.toFixed(1)}%) on WBS "${wbsItem.wbs_code}". Logged with MINOR_VARIANCE flag.`,
      };
    }

    return {
      flag: VarianceFlag.NO_VARIANCE,
      action: 'ALLOW',
      variancePercentage: 0,
      overrunAmount: 0,
      message: 'Expense is within budget limits.',
    };
  }

  /** @deprecated Use validateWbsExpense() instead */
  async validateAndAlertWbsExpense(
    wbsItem: WbsBudgetEntity,
    amount: number,
    tenant_id: string,
    committedAmount: number = 0,
  ): Promise<'MAJOR_VARIANCE' | 'MINOR_VARIANCE' | 'UNAPPROVED_BUDGET_USAGE' | 'NO_VARIANCE' | 'CRITICAL_VARIANCE'> {
    const result = await this.validateWbsExpense(wbsItem, amount, tenant_id, committedAmount);
    return result.flag as any;
  }

  async validateAndAlertOperationalExpense(
    budget: OperationalBudgetEntity,
    amount: number,
  ): Promise<'OVER_BUDGET' | 'NO_VARIANCE'> {
    const totalSpent = Number(budget.actual_spent || 0);
    const budgetLimit = Number(budget.budgeted_amount || 0);

    if (totalSpent + amount > budgetLimit) {
      this.notificationsService.sendVarianceAlert(
        'Operational Budget Overrun',
        `Budget "${budget.name}" has exceeded its limit by ${(totalSpent + amount - budgetLimit).toFixed(2)}.`,
        'error',
      );
      return 'OVER_BUDGET';
    }

    return 'NO_VARIANCE';
  }
}

