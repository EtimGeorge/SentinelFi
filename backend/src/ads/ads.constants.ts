/**
 * Ads module constants — single source of truth for the rewarded-ad loop.
 *
 * WHO SETS THE SECONDS?
 * - The ad NETWORK sets the creative length (typically 15–30s rewarded,
 *   5s-skippable for display video). We cannot shorten their creative.
 * - WE set the minimum-watch threshold below. The server refuses to grant
 *   a reward unless at least REWARD_REQUIRED_SECONDS elapsed between
 *   session start and completion (server clock = source of truth).
 * - The frontend countdown mirrors this value for UX, but the server
 *   decision is what counts — clients can always be tampered with.
 */
export const REWARD_REQUIRED_SECONDS = 15;

/** Max rewarded unlocks per tenant per day (fraud + cost control). */
export const MAX_REWARDS_PER_DAY = 5;

/** Rewarded session TTL — complete must arrive within 5 minutes of start. */
export const REWARD_SESSION_TTL_SECONDS = 300;

/** Throttle: max session starts per tenant per minute. */
export const REWARD_STARTS_PER_MINUTE = 10;

export enum AdPlacement {
  /** Passive banner inside the authenticated app (free tier only). */
  APP_BANNER = "app_banner",
  /** Passive banner on the marketing/pricing pages. */
  MARKETING_BANNER = "marketing_banner",
  /** Rewarded video → +1 task credit (free tier only). */
  REWARDED_TASK_UNLOCK = "rewarded_task_unlock",
}

export interface RewardSession {
  id: string;
  tenantId: string;
  placement: AdPlacement;
  requiredSeconds: number;
  startedAt: number;
  expiresAt: number;
  consumed: boolean;
}
