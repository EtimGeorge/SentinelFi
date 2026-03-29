import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
} from "typeorm";
import { TenantEntity } from "./tenant.entity";

export interface SmtpConfig {
  server: string;
  port: number;
  user: string;
  pass: string; // Stored, ideally encrypted at the app-layer or via vault
  from: string;
  useTls: boolean;
}

export interface ErpConfig {
  provider: string; // e.g. 'SAP', 'Oracle', 'Odoo'
  baseUrl: string;
  apiKey: string; // Secret, masked in responses
}

/**
 * Tenant-scoped settings entity. Each row is owned by a single tenant.
 * Stores integration credentials and feature flags local to that company.
 *
 * Security note: Sensitive fields (smtpPass, erpApiKey, sendgridApiKey) are
 * excluded from default selects and must be explicitly selected when needed.
 */
@Entity({ name: "tenant_settings", schema: "public" })
export class TenantSettingsEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ name: "tenant_id", type: "uuid", unique: true })
  tenantId!: string;

  @OneToOne(() => TenantEntity, { onDelete: "CASCADE" })
  @JoinColumn({ name: "tenant_id", referencedColumnName: "tenant_id" })
  tenant!: TenantEntity;

  // ─── Feature Flags ───────────────────────────────────────────────
  @Column({ name: "is_dcs_enabled", type: "boolean", default: true })
  isDcsEnabled!: boolean; // Document Control System

  @Column({ name: "is_api_enabled", type: "boolean", default: false })
  isApiEnabled!: boolean; // ERP / external API integration

  @Column({ name: "is_mfa_required", type: "boolean", default: false })
  isMfaRequired!: boolean;

  @Column({ name: "is_audit_log_public", type: "boolean", default: false })
  isAuditLogPublic!: boolean; // Allow non-admin users to view audit log

  // ─── Email / SMTP ─────────────────────────────────────────────────
  @Column({ name: "use_custom_smtp", type: "boolean", default: false })
  useCustomSmtp!: boolean;

  @Column({ name: "smtp_config", type: "jsonb", nullable: true })
  smtpConfig!: SmtpConfig | null;

  @Column({
    name: "sendgrid_api_key",
    type: "varchar",
    nullable: true,
    select: false,
  })
  sendgridApiKey!: string | null; // Excluded from default selects

  @Column({ name: "notify_on_approval", type: "boolean", default: true })
  notifyOnApproval!: boolean;

  @Column({ name: "notify_on_budget_breach", type: "boolean", default: true })
  notifyOnBudgetBreach!: boolean;

  @Column({ name: "budget_breach_threshold_pct", type: "int", default: 90 })
  budgetBreachThresholdPct!: number; // Alert when budget is X% consumed

  // ─── ERP Integration ─────────────────────────────────────────────
  @Column({ name: "erp_config", type: "jsonb", nullable: true, select: false })
  erpConfig!: ErpConfig | null; // Excluded because it contains API key

  // ─── Audit & Retention ───────────────────────────────────────────
  @Column({ name: "audit_retention_days", type: "int", default: 90 })
  auditRetentionDays!: number;

  @Column({ name: "session_timeout_minutes", type: "int", default: 60 })
  sessionTimeoutMinutes!: number;

  // ─── Locale & Branding ───────────────────────────────────────────
  @Column({ name: "company_logo_url", type: "varchar", nullable: true })
  companyLogoUrl!: string | null;

  @Column({ name: "timezone", type: "varchar", length: 64, default: "UTC" })
  timezone!: string;

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt!: Date;
}
