import { Injectable, Inject, Logger } from "@nestjs/common";
import { DataSource } from "typeorm";
import { TENANT_DATA_SOURCE } from "../database/constants";
import { WbsBudgetEntity } from "../wbs/wbs-budget.entity";
import { LiveExpenseEntity } from "../wbs/live-expense.entity";
import { WbsBudgetStatus } from "@shared/types/wbs-budget-status.enum";
import { CEOAnnotationEntity, AnnotationTargetType } from "./annotation.entity";
import { CreateAnnotationDto } from "./dto/create-annotation.dto";
import { ProjectEntity } from "../projects/project.entity";
import { LpoEntity, LpoStatus } from "../projects/lpo.entity";
import { FinancialForensicsService } from "../common/services/financial-forensics.service";

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);

  constructor(
    @Inject(TENANT_DATA_SOURCE)
    private dataSource: DataSource,
    private forensicsService: FinancialForensicsService,
  ) {}

  async getTenantSummary(tenantId: string) {
    const budgetRepo = this.dataSource.getRepository(WbsBudgetEntity);
    const expenseRepo = this.dataSource.getRepository(LiveExpenseEntity);

    // 1. Total Budgeted: Sum of root-level items (to avoid double counting children)
    const budgetSumResult = await this.runWithTimeout(
      budgetRepo
        .createQueryBuilder("wbs")
        .select("SUM(wbs.total_cost_budgeted)", "total")
        .where("wbs.tenant_id = :tenantId", { tenantId })
        .andWhere("wbs.parent_wbs_id IS NULL")
        .getRawOne(),
      10000,
      "getTenantSummary:budgetSum",
    );

    // 2. Total Actual Paid: Sum of all live expenses
    const expenseSumResult = await this.runWithTimeout(
      expenseRepo
        .createQueryBuilder("expense")
        .select("SUM(expense.amount)", "total")
        .where("expense.tenant_id = :tenantId", { tenantId })
        .getRawOne(),
      8000, // Slightly shorter to fail fast
      "getTenantSummary:expenseSum",
    );

    // 3. Pending Approvals: Count of items in DRAFT or PENDING state
    // In this system, DRAFT items are usually what needs approval to become APPROVED
    const pendingCount = await this.runWithTimeout(
      budgetRepo
        .createQueryBuilder("wbs")
        .where("wbs.tenant_id = :tenantId", { tenantId })
        .andWhere("wbs.status IN (:...statuses)", {
          statuses: [WbsBudgetStatus.DRAFT, WbsBudgetStatus.PENDING],
        })
        .getCount(),
      8000,
      "getTenantSummary:pendingCount",
    );

    const totalBudgeted = parseFloat(budgetSumResult?.total || "0");
    const totalActualPaid = parseFloat(expenseSumResult?.total || "0");

    // Variance is (Actual - Budget) / Budget
    const variancePercentage =
      totalBudgeted > 0
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
    operationName: string,
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
    const auditRepo = this.dataSource.getRepository("AuditLogEntity");

    return this.runWithTimeout(
      auditRepo
        .createQueryBuilder("log")
        .where("log.tenantId = :tenantId", { tenantId })
        .orderBy("log.timestamp", "DESC")
        .limit(limit)
        .getMany(),
      5000,
      "getRecentActivity",
    );
  }

  /**
   * ADVANCED: CEO Executive Analytics with Project-Aware contexts.
   * Calculates rollups, burn rates, and variances filtered by project if requested.
   */
  async getExecutiveAnalytics(tenantId: string, projectId?: string) {
    const budgetRepo = this.dataSource.getRepository(WbsBudgetEntity);
    const expenseRepo = this.dataSource.getRepository(LiveExpenseEntity);
    const lpoRepo = this.dataSource.getRepository(LpoEntity);

    // 1. Basic Aggregates
    const budgetQuery = budgetRepo
      .createQueryBuilder("wbs")
      .select("SUM(wbs.total_cost_budgeted)", "total")
      .where("wbs.tenant_id = :tenantId", { tenantId })
      .andWhere("wbs.parent_wbs_id IS NULL");

    const expenseQuery = expenseRepo
      .createQueryBuilder("expense")
      .select("SUM(expense.amount)", "total")
      .where("expense.tenant_id = :tenantId", { tenantId });

    const lpoQuery = lpoRepo
      .createQueryBuilder("lpo")
      .select("SUM(lpo.amount_committed)", "total")
      .where("lpo.tenant_id = :tenantId", { tenantId })
      .andWhere("lpo.status IN (:...lpoStatuses)", {
        lpoStatuses: [LpoStatus.OPEN, LpoStatus.PARTIALLY_PAID],
      });

    if (projectId) {
      budgetQuery.andWhere("wbs.project_id = :projectId", { projectId });
      expenseQuery.andWhere("expense.project_id = :projectId", { projectId });
      lpoQuery.andWhere("lpo.project_id = :projectId", { projectId });
    }

    const budgetSum = await this.runWithTimeout(
      budgetQuery.getRawOne(),
      8000,
      "getExecutiveAnalytics:budgetSum",
    );
    const expenseSum = await this.runWithTimeout(
      expenseQuery.getRawOne(),
      8000,
      "getExecutiveAnalytics:expenseSum",
    );
    const lpoSum = await this.runWithTimeout(
      lpoQuery.getRawOne(),
      8000,
      "getExecutiveAnalytics:lpoSum",
    );

    const totalBudgeted = parseFloat(budgetSum?.total || "0");
    const totalActualPaid = parseFloat(expenseSum?.total || "0");
    const totalCommittedLPO = parseFloat(lpoSum?.total || "0");
    const variance =
      totalBudgeted > 0
        ? ((totalActualPaid - totalBudgeted) / totalBudgeted) * 100
        : 0;

    // 2. Burn Rate & Historical Trend
    // Fetch last 30 days of spending history
    const historyQuery = expenseRepo
      .createQueryBuilder("expense")
      .select("DATE(expense.expense_date)", "date")
      .addSelect("SUM(expense.amount)", "amount")
      .where("expense.tenant_id = :tenantId", { tenantId })
      .andWhere("expense.expense_date >= CURRENT_DATE - INTERVAL '30 days'")
      .groupBy("DATE(expense.expense_date)")
      .orderBy("DATE(expense.expense_date)", "ASC");

    if (projectId) {
      historyQuery.andWhere("expense.project_id = :projectId", { projectId });
    }

    const history = await this.runWithTimeout(
      historyQuery.getRawMany(),
      8000,
      "getExecutiveAnalytics:history",
    );

    // 3. Predictive Forecasting via Centralized Forensics
    const forensics = this.forensicsService.calculateForensics(
      totalBudgeted,
      totalActualPaid,
      totalCommittedLPO,
      history.map((h) => ({ date: h.date, amount: parseFloat(h.amount) })),
    );


    return {
      overview: {
        totalBudgeted,
        totalActualPaid,
        totalCommittedLPO,
        variancePercentage: variance,
        burnRatePercentage: forensics.burnRatePercentage,

        avgDailySpend: forensics.avgDailySpend,
        estimatedExhaustionDate: forensics.estimatedExhaustionDate,
        riskLevel: forensics.riskLevel,
      },

      history: history.map((h) => ({
        date: h.date,
        amount: parseFloat(h.amount),
      })),
      context: {
        projectId: projectId || "ALL",
        type: projectId ? "PROJECT" : "OPERATIONAL_CONSOLIDATED",
      },
    };
  }

  /**
   * ANNOTATION ENGINE: CEO Feedback loop.
   */
  async addAnnotation(
    tenantId: string,
    authorId: string,
    dto: CreateAnnotationDto,
  ) {
    const annotationRepo = this.dataSource.getRepository(CEOAnnotationEntity);
    const annotation = annotationRepo.create({
      ...dto,
      tenant_id: tenantId,
      author_id: authorId,
    });
    return annotationRepo.save(annotation);
  }

  async getAnnotations(
    tenantId: string,
    targetType: AnnotationTargetType,
    targetId: string,
  ) {
    return this.dataSource.getRepository(CEOAnnotationEntity).find({
      where: {
        tenant_id: tenantId,
        target_type: targetType,
        target_id: targetId,
      },
      order: { created_at: "DESC" },
      relations: ["author"],
    });
  }
}
