// shared/types/audit.ts

export interface AuditLogEntity {
  id: string;
  timestamp: Date | string;
  userId: string | null;
  userEmail: string | null;
  action: string;
  targetType: string | null;
  targetId: string | null;
  details: any | null;
  ipAddress: string | null;
  tenantId: string | null;
  actionType: string;
}

export interface GetAuditLogsDto {
  page?: number;
  limit?: number;
  userId?: string | null;
  action?: string;
  targetType?: string;
  tenantId?: string | null;
  userEmail?: string;
  ipAddress?: string;
  startDate?: string;
  endDate?: string;
}

export interface AuditLogResponse {
  logs: AuditLogEntity[];
  total: number;
}