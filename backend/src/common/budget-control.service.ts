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
  action: "ALLOW" | "WARN" | "REQUIRE_OVERRIDE" | "BLOCK";
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
    if (
      wbsItem.status !== WbsBudgetStatus.APPROVED &&
      wbsItem.status !== ("RECALLED" as any)
    ) {
      this.notificationsService.sendVarianceAlert(
        "Unapproved Budget Usage",
        `Expense logged against WBS ${wbsItem.wbs_code} which is in '${wbsItem.status}' state.`,
        "warning",
      );
      return {
        flag: VarianceFlag.UNAPPROVED_BUDGET_USAGE,
        action: "BLOCK",
        variancePercentage: 0,
        overrunAmount: 0,
        message: `Cannot log expense: WBS Budget line "${wbsItem.wbs_code}" is not APPROVED. Current status: ${wbsItem.status}.`,
        requiredRoles: ["CFO", "CEO", "Admin Director"],
      };
    }

    // --- Guard 2: Budget Overrun (Tiered) ---
    const totalActual = Number(wbsItem.total_cost_actual || 0);
    const budgetLimit = Number(wbsItem.total_cost_budgeted || 0);
    const projectedTotal = totalActual + committedAmount + amount;

    if (budgetLimit <= 0) {
      // Enterprise rule: If a WBS has precisely zero budget, any spend is a CRITICAL BLOCK requiring CFO override.
      const msg = `CRITICAL OVERRUN on WBS ${wbsItem.wbs_code}: WBS has $0 budget, but an expense of ${amount} is being logged.`;
      this.notificationsService.sendVarianceAlert(
        "Critical Budget Overrun",
        msg,
        "error",
      );
      this.logger.error(
        `[BudgetControl] ZERO-BUDGET BLOCK | Tenant: ${tenant_id} | WBS: ${wbsItem.wbs_code}`,
      );

      return {
        flag: VarianceFlag.CRITICAL_VARIANCE,
        action: "BLOCK",
        variancePercentage: 100, // Represented as 100% since any spend is an overrun
        overrunAmount: projectedTotal,
        message: `Hard block: WBS "${wbsItem.wbs_code}" has $0 budget defined. A CFO or CEO override is required to log expenses against unfunded nodes.`,
        requiredRoles: ["CFO", "CEO", "Admin Director"],
      };
    }

    if (projectedTotal > budgetLimit) {
      const overrunAmount = projectedTotal - budgetLimit;
      const variancePercentage = (overrunAmount / budgetLimit) * 100;

      // --- Tier 3: CRITICAL (>= 10%) — Hard Block, CFO/CEO Override Required ---
      if (variancePercentage >= 10) {
        const msg = `CRITICAL OVERRUN on WBS ${wbsItem.wbs_code}: ${variancePercentage.toFixed(1)}% over budget (${overrunAmount.toFixed(2)} excess).`;
        this.notificationsService.sendVarianceAlert(
          "Critical Budget Overrun",
          msg,
          "error",
        );
        this.logger.error(
          `[BudgetControl] CRITICAL BLOCK | Tenant: ${tenant_id} | WBS: ${wbsItem.wbs_code} | Overrun: ${variancePercentage.toFixed(1)}%`,
        );
        return {
          flag: VarianceFlag.CRITICAL_VARIANCE,
          action: "BLOCK",
          variancePercentage,
          overrunAmount,
          message: `Hard block: A ${variancePercentage.toFixed(1)}% overrun on WBS "${wbsItem.wbs_code}" requires CFO or CEO override with documented justification.`,
          requiredRoles: ["CFO", "CEO", "Admin Director"],
        };
      }

      // --- Tier 2: MAJOR (5% to <10%) — Requires Override from Finance Manager+ ---
      if (variancePercentage >= 5) {
        const msg = `Major variance on WBS ${wbsItem.wbs_code}: ${variancePercentage.toFixed(1)}% over budget.`;
        this.notificationsService.sendVarianceAlert(
          "Major Budget Variance",
          msg,
          "error",
        );
        this.logger.warn(
          `[BudgetControl] MAJOR | Tenant: ${tenant_id} | WBS: ${wbsItem.wbs_code} | Overrun: ${variancePercentage.toFixed(1)}%`,
        );
        return {
          flag: VarianceFlag.MAJOR_VARIANCE,
          action: "REQUIRE_OVERRIDE",
          variancePercentage,
          overrunAmount,
          message: `A ${variancePercentage.toFixed(1)}% budget overrun on WBS "${wbsItem.wbs_code}" requires Finance Manager approval with an override reason.`,
          requiredRoles: ["Finance Manager", "CFO", "CEO", "Admin Director"],
        };
      }

      // --- Tier 1: MINOR (>0% to <5%) — Warn & Log ---
      const msg = `Minor variance on WBS ${wbsItem.wbs_code}: ${variancePercentage.toFixed(1)}% over budget.`;
      this.notificationsService.sendVarianceAlert(
        "Minor Budget Variance",
        msg,
        "warning",
      );
      this.logger.log(
        `[BudgetControl] MINOR | Tenant: ${tenant_id} | WBS: ${wbsItem.wbs_code} | Overrun: ${variancePercentage.toFixed(1)}%`,
      );
      return {
        flag: VarianceFlag.MINOR_VARIANCE,
        action: "WARN",
        variancePercentage,
        overrunAmount,
        message: `Minor overrun (${variancePercentage.toFixed(1)}%) on WBS "${wbsItem.wbs_code}". Logged with MINOR_VARIANCE flag.`,
      };
    }

    return {
      flag: VarianceFlag.NO_VARIANCE,
      action: "ALLOW",
      variancePercentage: 0,
      overrunAmount: 0,
      message: "Expense is within budget limits.",
    };
  }

  /** @deprecated Use validateWbsExpense() instead */
  async validateAndAlertWbsExpense(
    wbsItem: WbsBudgetEntity,
    amount: number,
    tenant_id: string,
    committedAmount: number = 0,
  ): Promise<
    | "MAJOR_VARIANCE"
    | "MINOR_VARIANCE"
    | "UNAPPROVED_BUDGET_USAGE"
    | "NO_VARIANCE"
    | "CRITICAL_VARIANCE"
  > {
    const result = await this.validateWbsExpense(
      wbsItem,
      amount,
      tenant_id,
      committedAmount,
    );
    return result.flag as any;
  }

  async validateAndAlertOperationalExpense(
    budget: OperationalBudgetEntity,
    amount: number,
  ): Promise<"OVER_BUDGET" | "NO_VARIANCE"> {
    const totalSpent = Number(budget.actual_spent || 0);
    const budgetLimit = Number(budget.budgeted_amount || 0);

    if (totalSpent + amount > budgetLimit) {
      this.notificationsService.sendVarianceAlert(
        "Operational Budget Overrun",
        `Budget "${budget.name}" has exceeded its limit by ${(totalSpent + amount - budgetLimit).toFixed(2)}.`,
        "error",
      );
      return "OVER_BUDGET";
    }

    return "NO_VARIANCE";
  }

  /**
   * Phase 4 (4.3 / 4.4) — Dual AND-threshold variance check for OPEX.
   *
   * A tier only escalates when BOTH dimensions breach their bounds:
   *   - percentage overrun  >= tier threshold (10% CRITICAL, 5% MAJOR)
   *   - absolute overrun    >= category variance_min_amount (AND-threshold)
   *
   * If only the percentage breaches (a sub-threshold $ overrun — e.g. a $5
   * overshoot on a heavily-timed category) the tier is downgraded so small
   * amounts never trip a CRITICAL hard block. Category variance_tolerance_pct
   * additionally suppresses escalation while the overrun stays inside the
   * configured percentage headroom.
   *
   * Zero-budget behaviour matches validateWbsExpense: any spend is CRITICAL.
   */
  async validateOperationalExpenseVariance(params: {
    budgetName: string;
    budgeted: number;
    actualSpent: number;
    committedAmount: number;
    amount: number;
    categoryTolerancePct?: number | null;
    categoryMinAmount?: number | null;
  }): Promise<VarianceCheckResult> {
    const {
      budgetName,
      budgeted,
      actualSpent,
      committedAmount,
      amount,
      categoryTolerancePct = null,
      categoryMinAmount = null,
    } = params;

    const budgetLimit = Number(budgeted || 0);
    const projectedTotal =
      Number(actualSpent || 0) + Number(committedAmount || 0) + Number(amount || 0);

    if (budgetLimit <= 0) {
      const msg = `CRITICAL OVERRUN on budget "${budgetName}": budget has $0 defined, but $${projectedTotal.toFixed(2)} of spend is being committed.`;
      this.notificationsService.sendVarianceAlert(
        "Critical Budget Overrun",
        msg,
        "error",
      );
      return {
        flag: VarianceFlag.CRITICAL_VARIANCE,
        action: "BLOCK",
        variancePercentage: 100,
        overrunAmount: projectedTotal,
        message: `Hard block: budget "${budgetName}" has $0 budget defined. CFO/CEO override required.`,
        requiredRoles: ["CFO", "CEO", "Admin Director", "SuperAdmin"],
      };
    }

    if (projectedTotal <= budgetLimit) {
      return {
        flag: VarianceFlag.NO_VARIANCE,
        action: "ALLOW",
        variancePercentage: 0,
        overrunAmount: 0,
        message: "Expense is within budget limits.",
      };
    }

    const overrunAmount = projectedTotal - budgetLimit;
    const variancePercentage = (overrunAmount / budgetLimit) * 100;

    // Category percentage tolerance (4.4): while the overrun sits inside the
    // configured headroom, it stays a MINOR WARN regardless of raw % tier.
    const tolerancePct =
      categoryTolerancePct !== null && categoryTolerancePct !== undefined
        ? Number(categoryTolerancePct)
        : 0;
    if (tolerancePct > 0 && variancePercentage <= tolerancePct) {
      this.notificationsService.sendVarianceAlert(
        "Minor Budget Variance",
        `Minor variance on budget "${budgetName}": ${variancePercentage.toFixed(1)}% over budget (within ${tolerancePct}% category tolerance).`,
        "warning",
      );
      return {
        flag: VarianceFlag.MINOR_VARIANCE,
        action: "WARN",
        variancePercentage,
        overrunAmount,
        message: `Overrun of ${variancePercentage.toFixed(1)}% on "${budgetName}" is within the ${tolerancePct}% category tolerance.`,
      };
    }

    // AND-threshold (4.3): escalate only when the absolute overrun also
    // exceeds the category minimum spend bound.
    const minAmount =
      categoryMinAmount !== null && categoryMinAmount !== undefined
        ? Number(categoryMinAmount)
        : 0;
    const pctBreachOnAmount =
      minAmount > 0 && overrunAmount < minAmount;

    let flag: VarianceFlag;
    if (variancePercentage >= 10 && !pctBreachOnAmount) {
      flag = VarianceFlag.CRITICAL_VARIANCE;
    } else if (variancePercentage >= 5 && !pctBreachOnAmount) {
      flag = VarianceFlag.MAJOR_VARIANCE;
    } else {
      flag = VarianceFlag.MINOR_VARIANCE;
    }

    if (flag === VarianceFlag.MINOR_VARIANCE && pctBreachOnAmount) {
      this.notificationsService.sendVarianceAlert(
        "Minor Budget Variance",
        `Minor variance on budget "${budgetName}": overrun of $${overrunAmount.toFixed(2)} is below the $${minAmount.toFixed(2)} escalation threshold.`,
        "warning",
      );
      return {
        flag: VarianceFlag.MINOR_VARIANCE,
        action: "WARN",
        variancePercentage,
        overrunAmount,
        message: `Overrun on "${budgetName}" is below the $${minAmount.toFixed(2)} escalation threshold (${variancePercentage.toFixed(1)}% / $${overrunAmount.toFixed(2)}).`,
      };
    }

    if (flag === VarianceFlag.CRITICAL_VARIANCE) {
      const msg = `CRITICAL OVERRUN on budget "${budgetName}": ${variancePercentage.toFixed(1)}% over budget ($${overrunAmount.toFixed(2)} excess).`;
      this.notificationsService.sendVarianceAlert(
        "Critical Budget Overrun",
        msg,
        "error",
      );
      return {
        flag: VarianceFlag.CRITICAL_VARIANCE,
        action: "BLOCK",
        variancePercentage,
        overrunAmount,
        message: `Hard block: a ${variancePercentage.toFixed(1)}% overrun on "${budgetName}" requires CFO or CEO override with documented justification.`,
        requiredRoles: ["CFO", "CEO", "Admin Director", "SuperAdmin"],
      };
    }

    const msg = `Major variance on budget "${budgetName}": ${variancePercentage.toFixed(1)}% over budget ($${overrunAmount.toFixed(2)} excess).`;
    this.notificationsService.sendVarianceAlert("Major Budget Variance", msg, "error");
    return {
      flag: VarianceFlag.MAJOR_VARIANCE,
      action: "REQUIRE_OVERRIDE",
      variancePercentage,
      overrunAmount,
      message: `A ${variancePercentage.toFixed(1)}% overrun on "${budgetName}" requires Finance Manager approval with an override reason.`,
      requiredRoles: [
        "Finance Manager",
        "CFO",
        "CEO",
        "Admin Director",
        "SuperAdmin",
        "Finance Officer",
      ],
    };
  }
}
