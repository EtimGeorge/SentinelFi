export enum InvoiceStatus {
  Paid = 'paid',
  Pending = 'pending',
  Overdue = 'overdue',
}

export type SubscriptionStatusValue =
  | 'pending'
  | 'trialing'
  | 'active'
  | 'expired'
  | 'cancelled'
  | 'paused';

export type BillingCycleValue = 'monthly' | 'annual' | 'trial' | 'free';

/**
 * Aggregated platform revenue summary.
 * mrR = monthly-equivalent recurring revenue (annual / 12).
 * mrr/arr are the single source of truth derived from ACTIVE subscriptions.
 */
export interface SubscriptionSummaryDto {
  total: number;
  active: number;
  trialing: number;
  expired: number;
  cancelled: number;
  paused: number;
  mrr_usd: number;
  arr_usd: number;
}

/**
 * SuperAdmin-facing subscription view.
 * Sensitive fields (gateway_reference, payment_proof_*, offline_bank_reference,
 * admin_email) are intentionally excluded.
 */
export interface SafeSubscriptionDto {
  id: string;
  tenant_id: string | null;
  plan: string;
  status: SubscriptionStatusValue;
  billing_cycle: BillingCycleValue;
  amount_usd: number;
  company_name: string | null;
  admin_first_name: string | null;
  admin_last_name: string | null;
  base_currency: string;
  gateway: string | null;
  current_period_start: Date | null;
  current_period_end: Date | null;
  trial_ends_at: Date | null;
  cancelled_at: Date | null;
  created_at: Date;
  max_tasks_per_day: number | null;
  has_ads: boolean;
  ad_unlock_credits: number;
}

export interface InvoiceDto {
  id: string;
  tenantName: string;
  amount: number;
  date: Date;
  status: InvoiceStatus;
}

/** Monthly-equivalent recurring revenue grouped by plan (active subscriptions only). */
export interface PlanMrrBreakdown {
  plan: string;
  mrrUsd: number;
}

/** Receivables snapshot derived from billing_invoices. */
export interface CollectionSnapshotDto {
  pendingAmount: number;
  overdueAmount: number;
  overdueInvoices: number;
  paidAmount30d: number;
}

export interface BillingOverviewDto {
  /** MRR in USD — active subscriptions only. */
  totalMrr: number;
  /** Annual recurring revenue (annual plans at face value, monthly * 12). */
  arr: number;
  activeSubscriptions: number;
  /** Number of invoices still pending payment (not trialing count). */
  pendingInvoices: number;
  mrrGrowthPercentage: number;
  subscriptionGrowthPercentage: number;
  trialSubscriptions: number;
  cancelledSubscriptions: number;
  expiredSubscriptions: number;
  pausedSubscriptions: number;
  freeSubscriptions: number;
  /** Active/pending/trialing subscriptions whose period ends within 7 days. */
  expiringSoon7d: number;
  /** % of active subscribers that cancelled or lapsed within the last 30 days. */
  churnRate30d: number;
  mrrByPlan: PlanMrrBreakdown[];
  collection: CollectionSnapshotDto;
}
