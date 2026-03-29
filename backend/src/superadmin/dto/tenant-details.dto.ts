interface UserInfo {
  id: string;
  email: string;
  name: string;
}

interface ResourceUsage {
  wbsBudgets: number;
  liveExpenses: number;
}

interface AuditLogInfo {
  id: string;
  action: string;
  timestamp: Date;
  user: {
    id: string;
    email: string;
  } | null;
}

export class TenantDetailDto {
  id!: string;
  name!: string;
  createdAt!: Date;
  updatedAt!: Date;
  isActive!: boolean;
  plan!: string;
  userCount!: number;
  adminUsers!: UserInfo[];
  lastActivity!: Date | null;
  resourceUsage!: ResourceUsage;
  recentAuditLogs!: AuditLogInfo[];
}
