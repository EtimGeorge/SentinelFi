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
import { CurrencyService, sumInBase } from "../currency/currency.service";

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);

  constructor(
    @Inject(TENANT_DATA_SOURCE)
    private dataSource: DataSource,
    private forensicsService: FinancialForensicsService,
    private currencyService: CurrencyService,
  ) {}

  /**
   * Shared normalization context: tenant base currency + rate map +
   * warning collector. All monetary aggregations in this service funnel
   * through it so mixed-currency tenants never get raw cross-currency SUMs.
   */
  private async normalizationContext(tenantId: string): Promise<{
    base: string;
    rates: Record<string, number>;
    warnings: Set<string>;
    toBase: (amount: any, from?: string | null) => number;
  }> {
    let base = "USD";
    try {
      const rows: any[] = await this.dataSource.query(
        `SELECT default_currency_code FROM public.tenants WHERE tenant_id = $1`,
        [tenantId],
      );
      if (rows?.[0]?.default_currency_code) {
        base = String(rows[0].default_currency_code).toUpperCase();
      }
    } catch {
      this.logger.warn(`[DASHBOARD] Tenant base lookup failed, using USD`);
    }
    const rates = await this.currencyService.getUsdRateMap();
    const warnings = new Set<string>();
    const toBase = (amount: any, from?: string | null): number => {
      const { total, warnings: w } = sumInBase(
        [{ amount, currency: from || "USD" }],
        base,
        rates,
      );
      w.forEach((c) => warnings.add(c));
      return total;
    };
    return { base, rates, warnings, toBase };
  }

  async getTenantSummary(tenantId: string) {
    const budgetRepo = this.dataSource.getRepository(WbsBudgetEntity);
    const expenseRepo = this.dataSource.getRepository(LiveExpenseEntity);
    const ctx = await this.normalizationContext(tenantId);

    // 1. Total Budgeted: root-level items grouped by project currency,
    // converted to base BEFORE summing (never raw cross-currency SUMs)
    const budgetRows = await this.runWithTimeout(
      budgetRepo
        .createQueryBuilder("wbs")
        .select("COALESCE(p.currency, 'USD')", "currency")
        .addSelect("SUM(wbs.total_cost_budgeted)", "total")
        .leftJoin("wbs.project", "p")
        .where("wbs.tenant_id = :tenantId", { tenantId })
        .andWhere("wbs.parent_wbs_id IS NULL")
        .groupBy("p.currency")
        .getRawMany(),
      10000,
      "getTenantSummary:budgetSum",
    );

    // 2. Total Actual Paid: expenses grouped by owning-project currency.
    // Expenses join projects directly (some lack a wbs_id — joining via
    // wbs would silently drop them).
    const expenseRows = await this.runWithTimeout(
      expenseRepo
        .createQueryBuilder("expense")
        .select("COALESCE(p.currency, 'USD')", "currency")
        .addSelect("SUM(expense.amount)", "total")
        .leftJoin(
          ProjectEntity,
          "p",
          "p.project_id = expense.project_id AND p.tenant_id = :tenantId",
          { tenantId },
        )
        .where("expense.tenant_id = :tenantId", { tenantId })
        .groupBy("p.currency")
        .getRawMany(),
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

    const totalBudgeted = (budgetRows || []).reduce(
      (s: number, r: any) => s + ctx.toBase(r.total, r.currency),
      0,
    );
    const totalActualPaid = (expenseRows || []).reduce(
      (s: number, r: any) => s + ctx.toBase(r.total, r.currency),
      0,
    );

    // Variance is (Actual - Budget) / Budget
    const variancePercentage =
      totalBudgeted > 0
        ? ((totalActualPaid - totalBudgeted) / totalBudgeted) * 100
        : 0;

    return {
      totalBudgeted: Math.round(totalBudgeted * 100) / 100,
      totalActualPaid: Math.round(totalActualPaid * 100) / 100,
      pendingApprovals: pendingCount,
      variancePercentage,
      currency: ctx.base,
      currencyWarnings: [...ctx.warnings],
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
    const ctx = await this.normalizationContext(tenantId);

    // 1. Basic Aggregates — grouped by currency, converted to base.
    // Single-project scopes are still normalized so the response currency
    // contract (`currency` = base) holds uniformly.
    const budgetQuery = budgetRepo
      .createQueryBuilder("wbs")
      .select("COALESCE(p.currency, 'USD')", "currency")
      .addSelect("SUM(wbs.total_cost_budgeted)", "total")
      .leftJoin("wbs.project", "p")
      .where("wbs.tenant_id = :tenantId", { tenantId })
      .andWhere("wbs.parent_wbs_id IS NULL")
      .groupBy("p.currency");

    const expenseQuery = expenseRepo
      .createQueryBuilder("expense")
      .select("COALESCE(p.currency, 'USD')", "currency")
      .addSelect("SUM(expense.amount)", "total")
      .leftJoin(
        ProjectEntity,
        "p",
        "p.project_id = expense.project_id AND p.tenant_id = :tenantId",
        { tenantId },
      )
      .where("expense.tenant_id = :tenantId", { tenantId })
      .groupBy("p.currency");

    const lpoQuery = lpoRepo
      .createQueryBuilder("lpo")
      .select("COALESCE(p.currency, 'USD')", "currency")
      .addSelect("SUM(lpo.amount_committed)", "total")
      .leftJoin("lpo.project", "p")
      .where("lpo.tenant_id = :tenantId", { tenantId })
      .andWhere("lpo.status IN (:...lpoStatuses)", {
        lpoStatuses: [LpoStatus.OPEN, LpoStatus.PARTIALLY_PAID],
      })
      .groupBy("p.currency");

    if (projectId) {
      budgetQuery.andWhere("wbs.project_id = :projectId", { projectId });
      expenseQuery.andWhere("expense.project_id = :projectId", { projectId });
      lpoQuery.andWhere("lpo.project_id = :projectId", { projectId });
    }

    const budgetRows = await this.runWithTimeout(
      budgetQuery.getRawMany(),
      8000,
      "getExecutiveAnalytics:budgetSum",
    );
    const expenseRows = await this.runWithTimeout(
      expenseQuery.getRawMany(),
      8000,
      "getExecutiveAnalytics:expenseSum",
    );
    const lpoRows = await this.runWithTimeout(
      lpoQuery.getRawMany(),
      8000,
      "getExecutiveAnalytics:lpoSum",
    );

    const sumRows = (rows: any[]): number =>
      (rows || []).reduce(
        (s: number, r: any) => s + ctx.toBase(r.total, r.currency),
        0,
      );

    const totalBudgeted = sumRows(budgetRows);
    const totalActualPaid = sumRows(expenseRows);
    const totalCommittedLPO = sumRows(lpoRows);
    const variance =
      totalBudgeted > 0
        ? ((totalActualPaid - totalBudgeted) / totalBudgeted) * 100
        : 0;

    // 2. Burn Rate & Historical Trend
    // Last 30 days, grouped by date+CURRENCY so mixed-currency days are
    // converted before merging into single-currency daily points.
    const historyQuery = expenseRepo
      .createQueryBuilder("expense")
      .select("DATE(expense.expense_date)", "date")
      .addSelect("COALESCE(p.currency, 'USD')", "currency")
      .addSelect("SUM(expense.amount)", "amount")
      .leftJoin(
        ProjectEntity,
        "p",
        "p.project_id = expense.project_id AND p.tenant_id = :tenantId",
        { tenantId },
      )
      .where("expense.tenant_id = :tenantId", { tenantId })
      .andWhere("expense.expense_date >= CURRENT_DATE - INTERVAL '30 days'")
      .groupBy("DATE(expense.expense_date)")
      .addGroupBy("p.currency")
      .orderBy("DATE(expense.expense_date)", "ASC");

    if (projectId) {
      historyQuery.andWhere("expense.project_id = :projectId", { projectId });
    }

    const historyRows = await this.runWithTimeout(
      historyQuery.getRawMany(),
      8000,
      "getExecutiveAnalytics:history",
    );

    const historyByDate = new Map<string, number>();
    for (const h of historyRows || []) {
      const date = String(h.date).slice(0, 10);
      historyByDate.set(
        date,
        (historyByDate.get(date) || 0) + ctx.toBase(h.amount, h.currency),
      );
    }
    const history = [...historyByDate.entries()]
      .sort((a, b) => (a[0] < b[0] ? -1 : 1))
      .map(([date, amount]) => ({
        date,
        amount: Math.round(amount * 100) / 100,
      }));

    // 3. Predictive Forecasting via Centralized Forensics
    // (operates on base-normalized totals — ratios are currency-invariant)
    const forensics = this.forensicsService.calculateForensics(
      totalBudgeted,
      totalActualPaid,
      totalCommittedLPO,
      history.map((h) => ({ date: h.date, amount: h.amount })),
    );


    return {
      overview: {
        totalBudgeted: Math.round(totalBudgeted * 100) / 100,
        totalActualPaid: Math.round(totalActualPaid * 100) / 100,
        totalCommittedLPO: Math.round(totalCommittedLPO * 100) / 100,
        variancePercentage: variance,
        burnRatePercentage: forensics.burnRatePercentage,

        avgDailySpend: forensics.avgDailySpend,
        estimatedExhaustionDate: forensics.estimatedExhaustionDate,
        riskLevel: forensics.riskLevel,
      },

      history,
      context: {
        projectId: projectId || "ALL",
        type: projectId ? "PROJECT" : "OPERATIONAL_CONSOLIDATED",
      },
      currency: ctx.base,
      currencyWarnings: [...ctx.warnings],
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
