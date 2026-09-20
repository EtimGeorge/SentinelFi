// shared/types/operational-budget.ts

import { EncumbranceStatus, EncumbranceSourceType } from "./encumbrance-status.enum";
import { VarianceClassification } from "./variance-classification.enum";
import { VarianceFlag } from "./variance-flag.enum";

export enum OperationalBudgetType {
  COMPANY_WIDE = "company_wide",
  DEPARTMENTAL = "departmental",
  PROJECT_SPECIFIC = "project_specific",
  RECURRING = "recurring",
}

export enum OperationalBudgetStatus {
  ACTIVE = "active",
  INACTIVE = "inactive",
  ARCHIVED = "archived",
}

export interface OperationalBudget {
  operational_budget_id: string;
  tenant_id: string;
  name: string;
  description: string | null;
  type: OperationalBudgetType;
  budgeted_amount: number;
  actual_spent: number;
  start_date: Date | string;
  end_date: Date | string;
  status: OperationalBudgetStatus;
  created_at: Date | string;
  updated_at: Date | string | null;
  created_by_user_id: string;
  department_id: string | null;
}

// Canonical unified OPEX analytics envelope — returned by
// GET /api/v1/operational-budgets/analytics (single source of truth for the
// analytics page; legacy three-shape endpoints remain untouched).
export interface OpexAnalyticsTotals {
  budgeted: number;
  actual: number;
  committed: number;
  variance: number;
  variancePct: number;
  /** Phase 4 (4.2): pipeline-adjusted headroom = budgeted - actual - committed. */
  remaining: number;
  /** Phase 4 (4.6): rolling forecast = actual + committed (encumbered pipeline). */
  forecast: number;
}

export interface OpexAnalyticsSeries {
  categoryId: string;
  name: string;
  budgeted: number;
  actual: number;
  committed: number;
  variance: number;
  /** Phase 4 (4.3): variance % vs budgeted (present when budgeted > 0). */
  variancePct: number;
  /** Phase 4 (4.5): TIMING_VARIANCE vs PERMANENT_VARIANCE classification. */
  classification?: VarianceClassification | null;
}

export interface OpexAnalyticsSeriesDepartment {
  departmentId: string;
  name: string;
  budgeted: number;
  actual: number;
  committed: number;
  variance: number;
  variancePct: number;
}

export interface OpexAnalyticsPeriodRow {
  period: string;
  budgeted: number;
  actual: number;
  committed: number;
}

export interface OpexAnalyticsRecentExpense {
  id: string;
  date: string;
  description: string;
  amount: number;
  category: string | null;
  status: string;
  /** Phase 4 (4.1): encumbrance state of the expense pipeline. */
  encumbranceStatus?: EncumbranceStatus | null;
  /** Phase 4 (4.5): timing vs permanent variance classification. */
  classification?: VarianceClassification | null;
}

export interface OpexAnalyticsMonthlyTrend {
  month: string;
  budgeted: number;
  actual: number;
}

export interface OpexAnalytics {
  totals: OpexAnalyticsTotals;
  byCategory: OpexAnalyticsSeries[];
  byDepartment: OpexAnalyticsSeriesDepartment[];
  byPeriod: OpexAnalyticsPeriodRow[];
  recentExpenses: OpexAnalyticsRecentExpense[];
  monthlyTrend: OpexAnalyticsMonthlyTrend[];
}

// ─── Phase 4 — Encumbrance & Needs-Attention ──────────────────────────────

export interface OpexEncumbranceRecord {
  id: string;
  tenant_id: string;
  source_type: EncumbranceSourceType;
  source_id: string;
  status: EncumbranceStatus;
  amount: number;
  operational_budget_id: string | null;
  operational_budget_category_id: string | null;
  created_at: string;
  updated_at: string | null;
}

export interface OpexNeedsAttentionItem {
  id: string;
  kind: "PENDING_OPEX_APPROVAL" | "OPEX_OVERRUN" | "VARIANCE_FLAGGED_EXPENSE";
  description: string;
  amount: number;
  severity: VarianceFlag;
  classification?: VarianceClassification | null;
  documentRef?: string | null;
  occurredAt: string;
  category?: string | null;
  budget?: string | null;
}

export interface OpexNeedsAttentionResult {
  items: OpexNeedsAttentionItem[];
  totalPendingAmount: number;
  totalOverrunAmount: number;
}

// ─── Phase 4 — 3-Way Match (PO + Receipt + Invoice) ────────────────────────

export interface ThreeWayMatchResult {
  poId: string;
  poNumber: string;
  poAmount: number;
  receivedAmount: number;
  invoicedAmount: number;
  variance: number;
  status: "MATCHED" | "PARTIAL_MATCH" | "MISMATCH";
  overCommitment?: {
    budgeted: number;
    actual: number;
    committed: number;
    overrunAmount: number;
    variancePct: number;
  } | null;
}
