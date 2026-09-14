import { RoleEntity } from "./role.entity";
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  ManyToMany,
  JoinTable,
  Index,
  DeleteDateColumn,
} from "typeorm";
import { Role } from "@shared/types/role.enum";
import type { TenantEntity } from "../../src/tenants/tenant.entity";

@Entity({ name: "user", schema: "public" }) // NOTE: This entity lives in the MASTER DB/Schema, not a tenant schema
@Index("IDX_user_identity", ["email", "username", "is_active"])
export class UserEntity {
  // Primary Key (Used as the user_id in LiveExpense table)
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ unique: true })
  email!: string;

  @Column({ unique: true, nullable: true })
  username?: string;

  @Column({ select: false, type: "varchar", length: 255, nullable: false })
  password_hash!: string; // Type changed to non-nullable string

  @Column({ type: "varchar", length: 255, nullable: true }) // NEW: First name
  first_name?: string;

  @Column({ type: "varchar", length: 255, nullable: true }) // NEW: Last name
  last_name?: string;

  @ManyToMany(() => RoleEntity, { eager: true })
  @JoinTable({
    name: "user_roles",
    joinColumn: { name: "user_id", referencedColumnName: "id" },
    inverseJoinColumn: { name: "role_id", referencedColumnName: "id" },
  })
  roles!: RoleEntity[];

  @Column({ default: true })
  is_active!: boolean;

  @Column({ type: "timestamptz", default: () => "CURRENT_TIMESTAMP" })
  created_at!: Date;

  @Column({
    type: "timestamptz",
    default: () => "CURRENT_TIMESTAMP",
    onUpdate: "CURRENT_TIMESTAMP",
  })
  updated_at!: Date;

  @DeleteDateColumn({ type: "timestamptz", nullable: true })
  deleted_at?: Date;

  // Multi-tenancy: Link user to a tenant
  @Column({ type: "uuid", nullable: true }) // nullable for system-level users or during initial setup
  tenant_id!: string | null;

  @ManyToOne("TenantEntity", "users", {
    nullable: true, // System-level users might not belong to a specific tenant
    onDelete: "SET NULL", // What happens to user if tenant is deleted
  })
  @JoinColumn({ name: "tenant_id" })
  tenant!: TenantEntity;

  @Column({ type: "varchar", length: 3, default: "USD" }) // User's preferred display currency
  display_currency_code!: string;

  // Password Reset Fields
  @Column({ nullable: true, name: "reset_password_token" })
  resetPasswordToken?: string; // Stores the hashed reset token

  @Column({
    type: "timestamptz",
    nullable: true,
    name: "reset_password_expires",
  })
  resetPasswordExpires?: Date;

  // Session Revocation: bumped on password change / forced reset / admin action
  @Column({ type: "int", default: 0 })
  token_version!: number;

  @Column({ type: "timestamptz", nullable: true })
  password_changed_at?: Date | null;

  // TOTP MFA
  @Column({ type: "boolean", default: false })
  mfa_enabled!: boolean;

  @Column({ type: "varchar", nullable: true, select: false })
  totp_secret?: string | null;

  /** 5 bcrypt-hashed one-time recovery codes. Never stored in plain text. */
  @Column({
    type: "text",
    array: true,
    nullable: true,
    name: "mfa_recovery_code_hashes",
  })
  mfa_recovery_code_hashes?: string[] | null;

  /** Secret staged during enrollment; promoted to totp_secret on confirm. */
  @Column({ type: "varchar", nullable: true, name: "totp_pending_secret" })
  totp_pending_secret?: string | null;
}
