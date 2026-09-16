import "reflect-metadata";
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Unique,
  OneToMany,
  DeleteDateColumn,
} from "typeorm";
import type { UserEntity } from "../../src/auth/user.entity";
import { TenantProvisioningStatus } from "@shared/types/tenant-provisioning-status.enum";

@Entity({ name: "tenants", schema: "public" }) // Master data, resides in public schema
@Unique(["name"])
@Unique(["schema_name"])
export class TenantEntity {
  @PrimaryGeneratedColumn("uuid")
  tenant_id!: string; // Renamed from 'id' to 'tenant_id' for clarity and consistency

  @Column({ length: 255, unique: true })
  name!: string; // Unique identifier for the tenant/client (e.g., Company Name)

  @Column({ length: 63, unique: true }) // Max 63 chars for PostgreSQL schema name
  schema_name!: string;

  @Column({ type: "boolean", default: true }) // NEW: Added for tenant lifecycle management
  is_active!: boolean;

  @Column({ type: "varchar", length: 50, default: "basic" })
  plan!: string;

  /**
   * Provisioning lifecycle of this tenant's PHYSICAL schema.
   *
   * Provisioning is reservation-first: this row is written BEFORE the schema is
   * created, so a row can exist with no usable schema behind it. PENDING/FAILED
   * therefore mean "not safe to serve" — the auth guard refuses logins (fail
   * closed) and a re-run RESUMES the attempt instead of re-creating it.
   */
  @Column({
    type: "varchar",
    length: 20,
    default: TenantProvisioningStatus.PENDING,
  })
  provisioning_status!: TenantProvisioningStatus;

  /** Cause of the last failed provisioning attempt (null when ACTIVE). */
  @Column({ type: "text", nullable: true })
  provisioning_error!: string | null;

  /**
   * When the current attempt started. An attempt older than
   * PROVISIONING_STALE_MS is treated as dead (the process was killed mid-flight)
   * so a retry may take over; a fresh PENDING row means another worker is
   * actively provisioning and the request must be rejected as a conflict.
   */
  @Column({ type: "timestamptz", nullable: true })
  provisioning_started_at!: Date | null;

  @Column({ type: "integer", default: 10 })
  max_users!: number;

  @Column({ type: "integer", default: 50 })
  max_storage_gb!: number;

  @Column({ type: "varchar", length: 3, default: "USD" }) // Default currency for this tenant
  default_currency_code!: string;

  @Column({ type: "timestamptz", nullable: true })
  expires_at!: Date | null;

  @Column({ type: "timestamptz", nullable: true })
  grace_period_until?: Date | null;

  @Column({ type: "numeric", precision: 10, scale: 2, default: 0 })
  price!: number;

  @Column({ type: "text", nullable: true })
  brandLogoBase64!: string | null;

  @Column({ type: "varchar", length: 7, nullable: true })
  brandPrimaryColorHex!: string | null;

  @Column({ type: "text", nullable: true })
  companyAddress!: string | null;

  @Column({ type: "timestamptz", default: () => "CURRENT_TIMESTAMP" })
  created_at!: Date;

  @Column({
    type: "timestamptz",
    default: () => "CURRENT_TIMESTAMP",
    onUpdate: "CURRENT_TIMESTAMP",
  })
  updated_at!: Date;

  @DeleteDateColumn({ type: "timestamptz", nullable: true })
  deleted_at!: Date | null;

  @OneToMany("UserEntity", "tenant")
  users!: UserEntity[];
}
