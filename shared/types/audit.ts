// shared/types/audit.ts
import { AuditLogEntity as AuditLogBackendEntity } from '../../backend/src/audit/audit.entity';

// Re-exporting the backend entity as the shared type for frontend use
// This ensures type consistency between frontend and backend.
export type AuditLogEntity = AuditLogBackendEntity;
