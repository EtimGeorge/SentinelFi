import { Entity, PrimaryColumn, Column } from "typeorm";
import { SettingsEntity as ISettingsEntity } from "shared/types/settings";

@Entity({ name: "settings" })
export class SettingsEntity implements ISettingsEntity {
  @PrimaryColumn({ type: "int", default: 1 })
  id!: number;

  @Column({ type: "boolean", default: false })
  maintenanceMode!: boolean;

  @Column({ type: "boolean", default: true })
  allowNewRegistrations!: boolean;

  @Column({ type: "int", default: 50 })
  defaultUserQuota!: number;

  @Column({ type: "int", default: 10 })
  defaultStorageQuotaGB!: number;

  @Column({ type: "varchar", nullable: true })
  smtpServer!: string | null;

  @Column({ type: "int", nullable: true })
  smtpPort!: number | null;

  @Column({ type: "varchar", nullable: true })
  smtpUser!: string | null;

  @Column({ type: "varchar", nullable: true })
  smtpPass!: string | null;

  @Column({ type: "varchar", nullable: true })
  supportEmail!: string | null;

  @Column({ type: "integer", default: 90 })
  auditRetentionDays!: number;

  @Column({ type: "integer", default: 60 })
  sessionTimeoutMinutes!: number;

  @Column({ type: "boolean", default: false })
  enableGlobalMfa!: boolean;

  @Column({ type: "varchar", nullable: true, select: false })
  sendgridApiKey!: string | null;

  @Column({ type: "varchar", nullable: true })
  erpProvider!: string | null;

  @Column({ type: "varchar", nullable: true, select: false })
  erpApiKey!: string | null;

  @Column({ type: "varchar", nullable: true })
  erpBaseUrl!: string | null;
}
