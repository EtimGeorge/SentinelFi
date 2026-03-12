export interface SettingsEntity {
  id: number;
  maintenanceMode: boolean;
  allowNewRegistrations: boolean;
  defaultUserQuota: number;
  defaultStorageQuotaGB: number;
  smtpServer: string | null;
  smtpPort: number | null;
  smtpUser: string | null;
  smtpPass: string | null;
  supportEmail: string | null;
  auditRetentionDays: number;
  sessionTimeoutMinutes: number;
  enableGlobalMfa: boolean;
  // Phase 6 Integrations
  sendgridApiKey?: string | null;
  erpProvider?: string | null;
  erpApiKey?: string | null;
  erpBaseUrl?: string | null;
}

export interface UpdateSettingsDto {
  maintenanceMode?: boolean;
  allowNewRegistrations?: boolean;
  defaultUserQuota?: number;
  defaultStorageQuotaGB?: number;
  smtpServer?: string;
  smtpPort?: number;
  smtpUser?: string;
  smtpPass?: string;
  supportEmail?: string;
  auditRetentionDays?: number;
  sessionTimeoutMinutes?: number;
  enableGlobalMfa?: boolean;
  // Phase 6 Integrations
  sendgridApiKey?: string;
  erpProvider?: string;
  erpApiKey?: string;
  erpBaseUrl?: string;
}

export interface SendTestEmailDto {
  to: string;
}
