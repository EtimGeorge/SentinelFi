/**
 * Normalise axios/backend error payloads into a single human-readable string.
 *
 * NestJS controllers sometimes throw structured BadRequestExceptions whose
 * `.message` arrives as an object ({ statusCode, errorCode, message, hint, requiredRoles }).
 * This helper unwraps that safely for toast/display use.
 */
export function apiErrorMessage(e: any, fallback = 'Something went wrong.'): string {
  const msg = e?.response?.data?.message;
  if (typeof msg === 'string') return msg;
  if (msg && typeof msg === 'object') {
    if (typeof msg.hint === 'string') return msg.hint;
    if (typeof msg.message === 'string') return msg.message;
    if (typeof msg.error === 'string') return msg.error;
  }
  if (typeof e?.response?.data?.error === 'string') return e.response.data.error;
  return e?.message || fallback;
}