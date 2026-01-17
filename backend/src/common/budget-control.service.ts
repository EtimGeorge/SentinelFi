import { Injectable, Logger, Inject } from "@nestjs/common";
import { Repository } from "typeorm";
import { WbsBudgetEntity } from "../wbs/wbs-budget.entity";
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
  ): Promise<'MAJOR_VARIANCE' | 'UNAPPROVED_BUDGET_USAGE' | 'NO_VARIANCE'> {
    // 1. Check Approval
    if (wbsItem.status !== 'approved') {
       this.notificationsService.sendVarianceAlert(
           'Unapproved Budget Usage',
           `Expense logged against WBS ${wbsItem.wbs_code} which is not yet approved.`,
           'warning'
       );
       return 'UNAPPROVED_BUDGET_USAGE';
    }

    // 2. Check Overrun
    const totalActual = Number(wbsItem.total_cost_actual || 0);
    const budgetLimit = Number(wbsItem.total_cost_budgeted || 0);

    if (totalActual + amount > budgetLimit) {
        const overAmount = (totalActual + amount - budgetLimit).toFixed(2);
        this.notificationsService.sendVarianceAlert(
            'Major Variance Detected',
            `Expense for ${wbsItem.wbs_code} exceeds budget by ${overAmount}`,
            'error'
        );
        return 'MAJOR_VARIANCE';
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
            `Budget "${budget.name}" has exceeded its limit.`,
            'error'
        );
        return 'OVER_BUDGET';
    }

    return 'NO_VARIANCE';
  }
}
