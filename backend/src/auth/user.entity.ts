import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from "typeorm";
import { Role } from "shared/types/role.enum";
import { TenantEntity } from "../../src/tenants/tenant.entity"; // Relative path to TenantEntity

@Entity({ name: "user", schema: "public" }) // NOTE: This entity lives in the MASTER DB/Schema, not a tenant schema
export class UserEntity {
  // Primary Key (Used as the user_id in LiveExpense table)
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ unique: true })
  email!: string;

  @Column({ select: false }) // CRITICAL: Never retrieve the password hash by default
  password_hash!: string;

  @Column({
    type: "enum",
    enum: Role,
    default: Role.AssignedProjectUser, // Default role for accountability (Crucial Constraint)
  })
  role!: Role;

  @Column({ default: true })
  is_active!: boolean;

  @Column({ type: "timestamptz", default: () => "CURRENT_TIMESTAMP" })
  created_at!: Date;

  // Multi-tenancy: Link user to a tenant
  @Column({ type: "uuid", nullable: true }) // nullable for system-level users or during initial setup
  tenant_id!: string | null;

  @ManyToOne(() => TenantEntity, (tenant) => tenant.users, {
    nullable: true, // System-level users might not belong to a specific tenant
    onDelete: "SET NULL", // What happens to user if tenant is deleted
  })
  @JoinColumn({ name: "tenant_id" })
  tenant!: TenantEntity;

  // Password Reset Fields
  @Column({ nullable: true, name: 'reset_password_token' })
  resetPasswordToken?: string; // Stores the hashed reset token

  @Column({ type: 'timestamptz', nullable: true, name: 'reset_password_expires' })
  resetPasswordExpires?: Date;
}
