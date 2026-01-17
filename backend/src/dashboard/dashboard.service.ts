
import { Injectable, Inject, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { TENANT_DATA_SOURCE } from '../database/constants';
import { WbsBudgetEntity } from '../wbs/wbs-budget.entity';
import { LiveExpenseEntity } from '../wbs/live-expense.entity';
import { WbsBudgetStatus } from '@shared/types/wbs-budget-status.enum';

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);

  constructor(
    @Inject(TENANT_DATA_SOURCE)
    private dataSource: DataSource,
  ) {}

  async getTenantSummary(tenantId: string) {
    const budgetRepo = this.dataSource.getRepository(WbsBudgetEntity);
    const expenseRepo = this.dataSource.getRepository(LiveExpenseEntity);

    // 1. Total Budgeted: Sum of root-level items (to avoid double counting children)
    const budgetSumResult = await budgetRepo
      .createQueryBuilder('wbs')
      .select('SUM(wbs.total_cost_budgeted)', 'total')
      .where('wbs.tenant_id = :tenantId', { tenantId })
      .andWhere('wbs.parent_wbs_id IS NULL')
      .getRawOne();

    // 2. Total Actual Paid: Sum of all live expenses
    const expenseSumResult = await expenseRepo
      .createQueryBuilder('expense')
      .select('SUM(expense.amount)', 'total')
      .where('expense.tenant_id = :tenantId', { tenantId })
      .getRawOne();

    // 3. Pending Approvals: Count of items in DRAFT or PENDING state
    // In this system, DRAFT items are usually what needs approval to become APPROVED
    const pendingCount = await budgetRepo
      .createQueryBuilder('wbs')
      .where('wbs.tenant_id = :tenantId', { tenantId })
      .andWhere('wbs.status IN (:...statuses)', { statuses: [WbsBudgetStatus.DRAFT, WbsBudgetStatus.PENDING] })
      .getCount();

    const totalBudgeted = parseFloat(budgetSumResult?.total || '0');
    const totalActualPaid = parseFloat(expenseSumResult?.total || '0');
    
    // Variance is (Actual - Budget) / Budget
    const variancePercentage = totalBudgeted > 0 
      ? ((totalActualPaid - totalBudgeted) / totalBudgeted) * 100 
      : 0;

    return {
      totalBudgeted,
      totalActualPaid,
      pendingApprovals: pendingCount,
      variancePercentage,
    };
  }

  async getRecentActivity(tenantId: string, limit: number = 5) {
    // This could query the AuditLogEntity filtered by tenantId
    // Since AuditLog is in the public schema (usually), we query it via the main dataSource
    return this.dataSource.getRepository('AuditLogEntity')
      .createQueryBuilder('log')
      .where('log.tenantId = :tenantId', { tenantId })
      .orderBy('log.timestamp', 'DESC')
      .limit(limit)
      .getMany();
  }
}
