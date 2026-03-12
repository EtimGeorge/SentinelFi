import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  Min,
  ValidateNested,
  IsObject,
} from 'class-validator';
import { Type } from 'class-transformer';

export class SmtpConfigDto {
  @IsString()
  server!: string;

  @IsInt()
  @Min(1)
  @Max(65535)
  port!: number;

  @IsString()
  user!: string;

  @IsString()
  pass!: string;

  @IsString()
  from!: string;

  @IsBoolean()
  useTls!: boolean;
}

export class ErpConfigDto {
  @IsString()
  provider!: string;

  @IsUrl()
  baseUrl!: string;

  @IsString()
  apiKey!: string;
}

export class UpdateTenantSettingsDto {
  // ─── Feature Flags ───────────────────────────────────────────────
  @IsOptional()
  @IsBoolean()
  isDcsEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  isApiEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  isMfaRequired?: boolean;

  @IsOptional()
  @IsBoolean()
  isAuditLogPublic?: boolean;

  // ─── Email / SMTP ─────────────────────────────────────────────────
  @IsOptional()
  @IsBoolean()
  useCustomSmtp?: boolean;

  @IsOptional()
  @ValidateNested()
  @Type(() => SmtpConfigDto)
  smtpConfig?: SmtpConfigDto;

  @IsOptional()
  @IsString()
  sendgridApiKey?: string;

  @IsOptional()
  @IsBoolean()
  notifyOnApproval?: boolean;

  @IsOptional()
  @IsBoolean()
  notifyOnBudgetBreach?: boolean;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  budgetBreachThresholdPct?: number;

  // ─── ERP Integration ─────────────────────────────────────────────
  @IsOptional()
  @ValidateNested()
  @Type(() => ErpConfigDto)
  erpConfig?: ErpConfigDto;

  // ─── Audit & Session ─────────────────────────────────────────────
  @IsOptional()
  @IsInt()
  @Min(7)
  @Max(3650)
  auditRetentionDays?: number;

  @IsOptional()
  @IsInt()
  @Min(5)
  @Max(1440)
  sessionTimeoutMinutes?: number;

  // ─── Locale & Branding ───────────────────────────────────────────
  @IsOptional()
  @IsString()
  companyLogoUrl?: string;

  @IsOptional()
  @IsString()
  timezone?: string;
}

export class TestSmtpDto {
  @IsString()
  to!: string;
}

export class TestErpDto {
  @IsUrl()
  baseUrl!: string;

  @IsString()
  apiKey!: string;
}
