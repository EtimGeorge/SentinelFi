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
}

export interface SendTestEmailDto {
  to: string;
}
