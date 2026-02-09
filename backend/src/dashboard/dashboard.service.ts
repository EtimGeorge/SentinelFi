
import { Injectable, Inject, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { TENANT_DATA_SOURCE } from '../database/constants';
import { WbsBudgetEntity } from '../wbs/wbs-budget.entity';
import { LiveExpenseEntity } from '../wbs/live-expense.entity';
import { WbsBudgetStatus } from '@shared/types/wbs-budget-status.enum';
import { CEOAnnotationEntity, AnnotationTargetType } from './annotation.entity';
import { CreateAnnotationDto } from './dto/create-annotation.dto';
import { ProjectEntity } from '../projects/project.entity';

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
    const budgetSumResult = await this.runWithTimeout(
      budgetRepo
        .createQueryBuilder('wbs')
        .select('SUM(wbs.total_cost_budgeted)', 'total')
        .where('wbs.tenant_id = :tenantId', { tenantId })
        .andWhere('wbs.parent_wbs_id IS NULL')
        .getRawOne(),
      10000,
      'getTenantSummary:budgetSum'
    );

    // 2. Total Actual Paid: Sum of all live expenses
    const expenseSumResult = await this.runWithTimeout(
      expenseRepo
        .createQueryBuilder('expense')
        .select('SUM(expense.amount)', 'total')
        .where('expense.tenant_id = :tenantId', { tenantId })
        .getRawOne(),
      8000, // Slightly shorter to fail fast
      'getTenantSummary:expenseSum'
    );

    // 3. Pending Approvals: Count of items in DRAFT or PENDING state
    // In this system, DRAFT items are usually what needs approval to become APPROVED
    const pendingCount = await this.runWithTimeout(
      budgetRepo
        .createQueryBuilder('wbs')
        .where('wbs.tenant_id = :tenantId', { tenantId })
        .andWhere('wbs.status IN (:...statuses)', { statuses: [WbsBudgetStatus.DRAFT, WbsBudgetStatus.PENDING] })
        .getCount(),
      8000,
      'getTenantSummary:pendingCount'
    );

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

  // Helper to prevent indefinite hangs on DB queries
  private async runWithTimeout<T>(
    promise: Promise<T>, 
    timeoutMs: number, 
    operationName: string
  ): Promise<T> {
    let timer: NodeJS.Timeout;
    const timeoutPromise = new Promise<T>((_, reject) => {
      timer = setTimeout(() => {
        const msg = `Operation '${operationName}' timed out after ${timeoutMs}ms`;
        this.logger.error(msg);
        reject(new Error(msg)); // This will be caught by the controller
      }, timeoutMs);
    });

    try {
      return await Promise.race([promise, timeoutPromise]);
    } finally {
      clearTimeout(timer!); // ! is safe because timer is assigned synchronously
    }
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

  /**
   * ADVANCED: CEO Executive Analytics with Project-Aware contexts.
   * Calculates rollups, burn rates, and variances filtered by project if requested.
   */
  async getExecutiveAnalytics(tenantId: string, projectId?: string) {
    const budgetRepo = this.dataSource.getRepository(WbsBudgetEntity);
    const expenseRepo = this.dataSource.getRepository(LiveExpenseEntity);

    // 1. Basic Aggregates
    const budgetQuery = budgetRepo
      .createQueryBuilder('wbs')
      .select('SUM(wbs.total_cost_budgeted)', 'total')
      .where('wbs.tenant_id = :tenantId', { tenantId })
      .andWhere('wbs.parent_wbs_id IS NULL');

    const expenseQuery = expenseRepo
      .createQueryBuilder('expense')
      .select('SUM(expense.amount)', 'total')
      .where('expense.tenant_id = :tenantId', { tenantId });

    if (projectId) {
      budgetQuery.andWhere('wbs.project_id = :projectId', { projectId });
      expenseQuery.andWhere('expense.project_id = :projectId', { projectId });
    }

    const budgetSum = await budgetQuery.getRawOne();
    const expenseSum = await expenseQuery.getRawOne();

    const totalBudgeted = parseFloat(budgetSum?.total || '0');
    const totalActualPaid = parseFloat(expenseSum?.total || '0');
    const variance = totalBudgeted > 0 ? ((totalActualPaid - totalBudgeted) / totalBudgeted) * 100 : 0;

    // 2. Burn Rate (Mocked for now based on budget usage, but could be time-decay based)
    // In a real system, you'd calculate % time elapsed vs % budget spent.
    const burnRate = totalBudgeted > 0 ? (totalActualPaid / totalBudgeted) * 100 : 0;

    return {
      overview: {
        totalBudgeted,
        totalActualPaid,
        variancePercentage: variance,
        burnRatePercentage: burnRate,
      },
      context: {
        projectId: projectId || 'ALL',
        type: projectId ? 'PROJECT' : 'OPERATIONAL_CONSOLIDATED'
      }
    };
  }

  /**
   * ANNOTATION ENGINE: CEO Feedback loop.
   */
  async addAnnotation(tenantId: string, authorId: string, dto: CreateAnnotationDto) {
    const annotationRepo = this.dataSource.getRepository(CEOAnnotationEntity);
    const annotation = annotationRepo.create({
      ...dto,
      tenant_id: tenantId,
      author_id: authorId,
    });
    return annotationRepo.save(annotation);
  }

  async getAnnotations(tenantId: string, targetType: AnnotationTargetType, targetId: string) {
    return this.dataSource.getRepository(CEOAnnotationEntity).find({
      where: {
        tenant_id: tenantId,
        target_type: targetType,
        target_id: targetId,
      },
      order: { created_at: 'DESC' },
      relations: ['author']
    });
  }
}
