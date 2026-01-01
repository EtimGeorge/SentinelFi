import { Request } from 'express';
import { QueryRunner } from 'typeorm';
import { Role } from 'shared/types/role.enum';

/**
 * Defines the shape of the raw JWT payload right after it is decoded.
 */
export interface JwtPayload {
  email: string;
  sub: string; // User ID (subject)
  role: Role;
  tenant_id: string | null; // Corrected to allow null
}

/**
 * Defines the user object that is attached to the Express request object
 * by the JwtStrategy's `validate` method.
 */
export interface UserPayload {
    id: string;
    email: string;
    role: Role;
    tenant_id: string | null; // Corrected to allow null
}

export interface AuthenticatedRequest extends Request {
  user?: UserPayload;
  tenant_id?: string | null; // Corrected to allow null
  queryRunner?: QueryRunner; // Attached by TenancyMiddleware for the duration of the request
}