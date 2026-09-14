/** Duration an impersonation token remains valid (seconds). */
export const IMPERSONATION_TOKEN_TTL_SECONDS = 1800;

/** Same value in milliseconds — used for the httpOnly impersonation cookie. */
export const IMPERSONATION_COOKIE_MAX_AGE_MS =
  IMPERSONATION_TOKEN_TTL_SECONDS * 1000;