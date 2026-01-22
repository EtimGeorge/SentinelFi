import { Injectable, Logger, Inject } from "@nestjs/common";
import { Repository } from "typeorm";
import { WbsBudgetEntity } from "../wbs/wbs-budget.entity";
import { WbsBudgetStatus } from "shared/types/wbs-budget-status.enum";
import { OperationalBudgetEntity } from "../operational-budgets/operational-budget.entity";
import { NotificationsService } from "../notifications/notifications.service";

@Injectable()
export class BudgetControlService {
  private readonly logger = new Logger(BudgetControlService.name);

  constructor(
    private readonly notificationsService: NotificationsService,
  ) {}

  async validateAndAlertWbsExpense(
    wbsItem: WbsBudgetEntity,
    amount: number,
    tenant_id: string,
    committedAmount: number = 0, // Should be passed from service or fetched here
  ): Promise<'MAJOR_VARIANCE' | 'MINOR_VARIANCE' | 'UNAPPROVED_BUDGET_USAGE' | 'NO_VARIANCE'> {
    // 1. Check Approval
    if (wbsItem.status !== WbsBudgetStatus.APPROVED) {
       this.notificationsService.sendVarianceAlert(
           'Unapproved Budget Usage',
           `Expense logged against WBS ${wbsItem.wbs_code} which is in ${wbsItem.status} state.`,
           'warning'
       );
       return 'UNAPPROVED_BUDGET_USAGE';
    }

    // 2. Check Overrun with Weighted Thresholds
    const totalActual = Number(wbsItem.total_cost_actual || 0);
    const budgetLimit = Number(wbsItem.total_cost_budgeted || 0);
    const projectedTotal = totalActual + committedAmount + amount;

    if (projectedTotal > budgetLimit) {
        const overrun = projectedTotal - budgetLimit;
        const variancePercentage = (overrun / budgetLimit) * 100;

        // Weighted thresholds: Large budgets have tighter variance controls
        let isMajor = false;
        if (budgetLimit > 100000) {
            isMajor = variancePercentage > 2; // > 2% for large budgets
        } else if (budgetLimit > 10000) {
            isMajor = variancePercentage > 5; // > 5% for medium budgets
        } else {
            isMajor = variancePercentage > 10; // > 10% for small budgets
        }

        const severity = isMajor ? 'error' : 'warning';
        const action = isMajor ? 'Major Variance Detected' : 'Minor Variance Detected';

        this.notificationsService.sendVarianceAlert(
            action,
            `Expense for ${wbsItem.wbs_code} exceeds budget by ${overrun.toFixed(2)} (${variancePercentage.toFixed(1)}%).`,
            severity
        );

        return isMajor ? 'MAJOR_VARIANCE' : 'MINOR_VARIANCE';
    }

    return 'NO_VARIANCE';
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
            'error'
        );
        return 'OVER_BUDGET';
    }

    return 'NO_VARIANCE';
  }
}
