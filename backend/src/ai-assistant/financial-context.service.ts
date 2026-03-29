import { Injectable, Logger, Inject } from "@nestjs/common";
import { DataSource } from "typeorm";
import { ClsService } from "nestjs-cls";
import { TENANT_DATA_SOURCE } from "../database/constants";
import { WbsBudgetEntity } from "../wbs/wbs-budget.entity";
import { LiveExpenseEntity } from "../wbs/live-expense.entity";
import { ProjectEntity } from "../projects/project.entity";
import { WbsBudgetStatus } from "../../../shared/types/wbs-budget-status.enum";

export interface FinancialContextSnapshot {
  // Tenant identity (safe — no credentials)
  tenantId: string;
  tenantName?: string;

  // Portfolio overview
  totalBudgeted: number;
  totalActualPaid: number;
  variancePercentage: number;
  burnRatePercentage: number;
  pendingApprovals: number;
  activeProjects: number;

  // Forecasting data
  avgDailySpend: number;
  estimatedExhaustionDate: string | null;
  remainingBudget: number;

  // Burn history (last 30 days)
  burnHistory30Days: { date: string; amount: number }[];

  // Top overruns
  topOverruns: { name: string; variance_pct: string; variance: number }[];

  // Current project (when viewing a specific project)
  currentProject?: {
    id: string;
    name: string;
    budgeted: number;
    actual: number;
    currency: string;
  };

  // Timestamp
  snapshotAt: string;
}

/**
 * Aggregates live financial data from the database into a sanitized,
 * prompt-injectable context snapshot for the AI agent.
 *
 * All data is scoped to the authenticated tenant via the ClsService.
 * Never exposes connection strings, credentials, or cross-tenant data.
 */
@Injectable()
export class FinancialContextService {
  private readonly logger = new Logger(FinancialContextService.name);

  constructor(
    @Inject(TENANT_DATA_SOURCE)
    private readonly dataSource: DataSource,
    private readonly cls: ClsService,
  ) {}

  /**
   * Builds the full financial context snapshot for the current authenticated tenant.
   */
  async buildSnapshot(options?: {
    projectId?: string;
    tenantName?: string;
    tenantId?: string;
  }): Promise<FinancialContextSnapshot> {
    const tenantId = options?.tenantId || (this.cls.get("tenantId") as string);

    if (!tenantId) {
      this.logger.error(
        "buildSnapshot called without tenantId in CLS context or options",
      );
      throw new Error("Tenant context not established");
    }

    const budgetRepo = this.dataSource.getRepository(WbsBudgetEntity);
    const expenseRepo = this.dataSource.getRepository(LiveExpenseEntity);
    const projectRepo = this.dataSource.getRepository(ProjectEntity);

    try {
      // Parallel data fetching for performance
      const [
        budgetSumResult,
        expenseSumResult,
        pendingCount,
        activeProjectsCount,
        burnHistoryRaw,
        topOverrunsRaw,
        currentProjectData,
      ] = await Promise.allSettled([
        // Total budgeted (root items only to prevent double-counting)
        budgetRepo
          .createQueryBuilder("wbs")
          .select("COALESCE(SUM(wbs.total_cost_budgeted), 0)", "total")
          .where("wbs.tenant_id = :tenantId", { tenantId })
          .andWhere("wbs.parent_wbs_id IS NULL")
          .getRawOne(),

        // Total actual paid
        expenseRepo
          .createQueryBuilder("expense")
          .select("COALESCE(SUM(expense.amount), 0)", "total")
          .where("expense.tenant_id = :tenantId", { tenantId })
          .getRawOne(),

        // Pending approvals
        budgetRepo
          .createQueryBuilder("wbs")
          .where("wbs.tenant_id = :tenantId", { tenantId })
          .andWhere("wbs.status IN (:...statuses)", {
            statuses: [WbsBudgetStatus.DRAFT, WbsBudgetStatus.PENDING],
          })
          .getCount(),

        // Active projects count
        projectRepo.count({
          where: { tenant_id: tenantId, status: "active" as any },
        }),

        // Burn history (last 30 days)
        expenseRepo
          .createQueryBuilder("expense")
          .select("DATE(expense.expense_date)", "date")
          .addSelect("SUM(expense.amount)", "amount")
          .where("expense.tenant_id = :tenantId", { tenantId })
          .andWhere("expense.expense_date >= CURRENT_DATE - INTERVAL '30 days'")
          .groupBy("DATE(expense.expense_date)")
          .orderBy("DATE(expense.expense_date)", "ASC")
          .getRawMany(),

        // Top project overruns (budget vs actual for root items per project)
        projectRepo
          .createQueryBuilder("project")
          .leftJoin("project.wbsBudgets", "wbs", "wbs.parent_wbs_id IS NULL")
          .leftJoin("wbs.children", "expense_link")
          .select("project.project_name", "name")
          .addSelect(
            "COALESCE(SUM(wbs.total_cost_budgeted), 0)",
            "total_budgeted",
          )
          .addSelect("COALESCE(SUM(wbs.total_cost_actual), 0)", "total_actual")
          .where("project.tenant_id = :tenantId", { tenantId })
          .andWhere("project.status = :status", { status: "active" })
          .groupBy("project.project_id")
          .orderBy(
            "(COALESCE(SUM(wbs.total_cost_actual), 0) - COALESCE(SUM(wbs.total_cost_budgeted), 0))",
            "DESC",
          )
          .limit(5)
          .getRawMany(),

        // Current project (if projectId provided)
        options?.projectId
          ? projectRepo
              .createQueryBuilder("project")
              .leftJoin(
                "project.wbsBudgets",
                "wbs",
                "wbs.parent_wbs_id IS NULL",
              )
              .select("project.project_name", "name")
              .addSelect("project.currency", "currency")
              .addSelect(
                "COALESCE(SUM(wbs.total_cost_budgeted), 0)",
                "total_budgeted",
              )
              .addSelect(
                "COALESCE(SUM(wbs.total_cost_actual), 0)",
                "total_actual",
              )
              .where("project.project_id = :projectId", {
                projectId: options.projectId,
              })
              .andWhere("project.tenant_id = :tenantId", { tenantId })
              .groupBy("project.project_id")
              .getRawOne()
          : Promise.resolve(null),
      ]);

      // Safe field extraction with fallbacks
      const totalBudgeted = parseFloat(
        budgetSumResult.status === "fulfilled"
          ? ((budgetSumResult.value as any)?.total ?? "0")
          : "0",
      );
      const totalActualPaid = parseFloat(
        expenseSumResult.status === "fulfilled"
          ? ((expenseSumResult.value as any)?.total ?? "0")
          : "0",
      );
      const pendingApprovals =
        pendingCount.status === "fulfilled"
          ? (pendingCount.value as number)
          : 0;
      const activeProjects =
        activeProjectsCount.status === "fulfilled"
          ? (activeProjectsCount.value as number)
          : 0;

      const burnHistory: { date: string; amount: number }[] =
        burnHistoryRaw.status === "fulfilled"
          ? (burnHistoryRaw.value as any[]).map((r) => ({
              date: r.date,
              amount: parseFloat(r.amount),
            }))
          : [];

      const totalBurnLast30 = burnHistory.reduce((s, r) => s + r.amount, 0);
      const avgDailySpend = totalBurnLast30 / 30;
      const remainingBudget = Math.max(0, totalBudgeted - totalActualPaid);
      const variancePercentage =
        totalBudgeted > 0
          ? ((totalActualPaid - totalBudgeted) / totalBudgeted) * 100
          : 0;
      const burnRatePercentage =
        totalBudgeted > 0 ? (totalActualPaid / totalBudgeted) * 100 : 0;

      let estimatedExhaustionDate: string | null = null;
      if (avgDailySpend > 0 && remainingBudget > 0) {
        const daysRemaining = Math.floor(remainingBudget / avgDailySpend);
        const exhaustionDate = new Date();
        exhaustionDate.setDate(exhaustionDate.getDate() + daysRemaining);
        estimatedExhaustionDate = exhaustionDate.toISOString().split("T")[0];
      }

      const rawOverruns =
        topOverrunsRaw.status === "fulfilled"
          ? (topOverrunsRaw.value as any[])
          : [];
      const topOverruns = rawOverruns
        .filter(
          (r) => parseFloat(r.total_actual) > parseFloat(r.total_budgeted),
        )
        .map((r) => {
          const budgeted = parseFloat(r.total_budgeted);
          const actual = parseFloat(r.total_actual);
          const variancePct =
            budgeted > 0
              ? (((actual - budgeted) / budgeted) * 100).toFixed(1)
              : "0.0";
          return {
            name: r.name,
            variance_pct: variancePct,
            variance: actual - budgeted,
          };
        });

      let currentProject: FinancialContextSnapshot["currentProject"];
      if (
        currentProjectData.status === "fulfilled" &&
        currentProjectData.value
      ) {
        const p = currentProjectData.value as any;
        currentProject = {
          id: options!.projectId!,
          name: p.name,
          budgeted: parseFloat(p.total_budgeted),
          actual: parseFloat(p.total_actual),
          currency: p.currency ?? "NGN",
        };
      }

      return {
        tenantId,
        tenantName: options?.tenantName,
        totalBudgeted,
        totalActualPaid,
        variancePercentage: parseFloat(variancePercentage.toFixed(2)),
        burnRatePercentage: parseFloat(burnRatePercentage.toFixed(2)),
        pendingApprovals,
        activeProjects,
        avgDailySpend: parseFloat(avgDailySpend.toFixed(2)),
        estimatedExhaustionDate,
        remainingBudget: parseFloat(remainingBudget.toFixed(2)),
        burnHistory30Days: burnHistory,
        topOverruns,
        currentProject,
        snapshotAt: new Date().toISOString(),
      };
    } catch (error: any) {
      this.logger.error("Failed to build financial context snapshot", {
        error: error.message,
        tenantId,
      });
      // Return a minimal safe snapshot rather than throwing
      return {
        tenantId,
        tenantName: options?.tenantName,
        totalBudgeted: 0,
        totalActualPaid: 0,
        variancePercentage: 0,
        burnRatePercentage: 0,
        pendingApprovals: 0,
        activeProjects: 0,
        avgDailySpend: 0,
        estimatedExhaustionDate: null,
        remainingBudget: 0,
        burnHistory30Days: [],
        topOverruns: [],
        snapshotAt: new Date().toISOString(),
      };
    }
  }
}
