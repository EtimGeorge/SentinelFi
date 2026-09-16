import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import { AuthenticatedRequest } from "../interfaces/authenticated-request.interface";

/**
 * Extracts the authenticated user's tenant_id from the request.
 * Returns null for platform SuperAdmins, who legitimately have no tenant scope.
 * Throws nothing: guard chain (TenancyGuard/TenantAccessGuard) already guarantees
 * req.user exists for protected routes.
 */
export const TenantId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string | null => {
    const request = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
    return request.user?.tenant_id ?? null;
  },
);