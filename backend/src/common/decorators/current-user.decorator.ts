import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import { AuthenticatedRequest } from "../interfaces/authenticated-request.interface";

/**
 * Extracts the authenticated user payload from the request.
 * Typed via AuthenticatedRequest so controllers skip manual @Req + cast.
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
    return request.user;
  },
);