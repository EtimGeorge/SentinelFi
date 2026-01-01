import { Request } from 'express';
import { QueryRunner } from 'typeorm';

export interface JwtPayloadWithTenant {
  email: string;
  sub: string; // User ID
  role: string; // User Role
  tenantId: string; // Tenant ID
}

export interface AuthenticatedRequest extends Request {
  user?: JwtPayloadWithTenant;
  tenantId?: string; // Extracted from JWT
  tenantQueryRunner?: QueryRunner; // Attached by TenantInterceptor
}
