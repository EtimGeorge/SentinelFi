/**
 * Extracts a human-readable { code, message } from API failures.
 *
 * NestJS exception filters serialize thrown objects inconsistently:
 * - string arg   -> body { message: string, error, statusCode }
 * - object arg   -> body { ...object, statusCode, error } OR
 *                   body { message: object, statusCode, error }
 * Network failures have no response at all.
 * This normalizes every shape so UI can render the SERVER's message
 * (e.g. TENANT_DEACTIVATED) instead of a generic fallback.
 */
export interface ParsedApiError {
  code?: string;
  message: string;
  status?: number;
}

export function parseApiError(error: any, fallback: string): ParsedApiError {
  const data = error?.response?.data;
  const status = error?.response?.status;

  if (data !== null && typeof data === "object") {
    // Case A: { code, message } spread at top level.
    if (typeof data.message === "string" && data.message.trim()) {
      return {
        code: typeof data.code === "string" ? data.code : undefined,
        message: data.message,
        status,
      };
    }
    // Case B: { message: { code, message } } nested object.
    const nested = (data as any).message;
    if (nested !== null && typeof nested === "object" && !Array.isArray(nested)) {
      const msg =
        typeof nested.message === "string" && nested.message.trim()
          ? nested.message
          : fallback;
      return {
        code: typeof nested.code === "string" ? nested.code : undefined,
        message: msg,
        status,
      };
    }
    // Case C: { message: string[] } (class-validator).
    if (Array.isArray((data as any).message)) {
      const parts = (data as any).message.filter(
        (m: any) => typeof m === "string" && m.trim(),
      );
      if (parts.length > 0) {
        return { message: parts.join(" "), status };
      }
    }
  }
  if (typeof data === "string" && data.trim()) {
    return { message: data, status };
  }
  // Network failure / timeout / unknown shape.
  if (error?.code === "ECONNABORTED") {
    return { message: "Request timed out. Please try again.", status };
  }
  if (!error?.response) {
    return {
      message: "Cannot reach the server. Check your connection and try again.",
      status,
    };
  }
  return { message: fallback, status };
}

/** True when the failure means "this workspace is closed, switch workspaces". */
export function isWorkspaceDeactivated(parsed: ParsedApiError): boolean {
  return parsed.code === "TENANT_DEACTIVATED" || parsed.status === 403;
}
