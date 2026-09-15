/**
 * SuperAdmin-facing email delivery analytics — derived from the email_log table.
 */
export interface EmailStatsResponse {
  days: number;
  totals: { total: number; sent: number; failed: number; preview: number };
  /** Sent / (sent + failed), or null when there is nothing to measure. */
  deliveryRate: number | null;
  uniqueRecipients: number;
  lastSentAt: Date | null;
  byTemplate: {
    template: string;
    total: number;
    sent: number;
    failed: number;
    preview: number;
  }[];
  daily: { day: string; total: number; sent: number; failed: number }[];
}