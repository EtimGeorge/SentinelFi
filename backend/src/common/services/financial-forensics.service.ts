import { Injectable, Logger } from "@nestjs/common";

export interface ForensicInsight {
  totalBudgeted: number;
  totalActualPaid: number;
  totalCommittedLPO: number;
  variancePercentage: number;
  burnRatePercentage: number;
  avgDailySpend: number;
  estimatedExhaustionDate: string | null;
  daysRemaining: number | null;
  riskLevel: "HEALTHY" | "WARNING" | "CRITICAL";
}

@Injectable()
export class FinancialForensicsService {
  private readonly logger = new Logger(FinancialForensicsService.name);

  /**
   * Calculates forensic insights based on project or organizational financial state.
   * @param totalBudgeted Sum of all top-level budget items
   * @param totalActualPaid Sum of all live expenses
   * @param totalCommittedLPO Sum of all open/unpaid LPOs
   * @param history Expense history (last 30 days) for burn rate calculation
   */
  calculateForensics(
    totalBudgeted: number,
    totalActualPaid: number,
    totalCommittedLPO: number,
    history: { date: string; amount: number }[],
  ): ForensicInsight {
    // 1. Basic Metrics
    const variance =
      totalBudgeted > 0
        ? ((totalActualPaid - totalBudgeted) / totalBudgeted) * 100
        : 0;
    const burnRate =
      totalBudgeted > 0 ? (totalActualPaid / totalBudgeted) * 100 : 0;

    // 2. Daily Burn Velocity (30-day average)
    const totalSpentLast30Days = history.reduce((sum, h) => sum + h.amount, 0);
    const avgDailySpend = totalSpentLast30Days / 30;

    // 3. Forced Exhaustion Projection
    const remainingBudget = Math.max(0, totalBudgeted - totalActualPaid);

    let estimatedExhaustionDate: string | null = null;
    let daysRemaining: number | null = null;

    if (avgDailySpend > 0) {
      daysRemaining = Math.floor(remainingBudget / avgDailySpend);
      const exhaustionDate = new Date();
      exhaustionDate.setDate(exhaustionDate.getDate() + daysRemaining);
      estimatedExhaustionDate = exhaustionDate.toISOString();
    }

    // 4. Strategic Risk Assessment
    let riskLevel: "HEALTHY" | "WARNING" | "CRITICAL" = "HEALTHY";

    if (burnRate > 100 || (daysRemaining !== null && daysRemaining < 7)) {
      riskLevel = "CRITICAL";
    } else if (
      burnRate > 85 ||
      (daysRemaining !== null && daysRemaining < 30)
    ) {
      riskLevel = "WARNING";
    }

    return {
      totalBudgeted,
      totalActualPaid,
      totalCommittedLPO,
      variancePercentage: variance,
      burnRatePercentage: burnRate,
      avgDailySpend,
      estimatedExhaustionDate,
      daysRemaining,
      riskLevel,
    };
  }
}
