// ─── Academy progress ledger — server API client ─────────────────────────────
// The backend persists one ledger row per identity (user + visitor cookie) on
// the PUBLIC schema. This client is a thin, resilient wrapper: every call is
// fire-and-forget safe and degrades to local-only storage when the API is
// unreachable (e.g. migration not yet applied during a staged deploy).

import { apiClient } from '../lib/api';
import type { ProgressLedger } from '../lib/curriculum/types';

const PROGRESS_ROUTE = '/marketing/academy/progress';

export interface AcademyProgressResponse {
  visitorId?: string;
  ledger: ProgressLedger;
}

/** Pull the durable ledger for the current identity (best-effort). */
export async function fetchAcademyProgress(visitorId?: string): Promise<AcademyProgressResponse | null> {
  try {
    return await apiClient.get<AcademyProgressResponse>(PROGRESS_ROUTE, {
      params: visitorId ? { visitorId } : undefined,
      timeout: 5000,
    });
  } catch {
    return null;
  }
}

/** Push the local ledger to the durable store (best-effort, never awaited). */
export function pushAcademyProgress(ledger: ProgressLedger, visitorId?: string): void {
  void apiClient
    .post<{ status: 'ok' | 'ignored' }>(
      PROGRESS_ROUTE,
      { ...(visitorId ? { visitorId } : {}), ledger },
      { timeout: 5000 },
    )
    .catch(() => {
      // Local ledger remains the source of truth until the API is reachable.
    });
}