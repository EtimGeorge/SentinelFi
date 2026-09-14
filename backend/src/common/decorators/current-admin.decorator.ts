import { createParamDecorator, ExecutionContext } from "@nestjs/common";

/**
 * Extracts the authenticated SuperAdmin's identity for audit purposes.
 * Returns { id, email } so callers can build an AuditActor without
 * trusting raw request data.
 */
export interface CurrentAdmin {
  id: string;
  email: string;
}

export const CurrentAdmin = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): CurrentAdmin => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as
      | { id?: string; email?: string }
      | undefined;
    return {
      id: user?.id ?? "SYSTEM",
      email: user?.email ?? "SYSTEM",
    };
  },
);