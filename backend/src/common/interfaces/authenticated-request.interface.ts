// backend/src/common/interfaces/authenticated-request.interface.ts
import { Request } from 'express';
// Correctly import the types from the single source of truth
import { UserPayload, JwtPayload as SharedJwtPayload } from '@shared/types/user';

// Re-export the types for any other files that might be using this as a central point for request-related types.
export type { UserPayload };
export type { JwtPayload } from '@shared/types/user';

// This interface defines the `user` object that is attached to the Request
// object after successful authentication by the JwtStrategy.
// It will always be a hydrated UserPayload, not the raw token payload.
export interface AuthenticatedRequest extends Request {
  user: UserPayload;
}
