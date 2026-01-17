import { Entity, PrimaryGeneratedColumn, Column, Index, ManyToOne, JoinColumn } from "typeorm";
import { UserEntity } from "../auth/user.entity";

@Entity({ name: "audit_log", schema: "public" }) // Audit log lives in the public schema
export class AuditLogEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "timestamptz", default: () => "CURRENT_TIMESTAMP" })
  timestamp!: Date;

  @Column({ type: "uuid", nullable: true }) // Can be null for system events or unauthenticated attempts
  userId!: string | null;

  @ManyToOne(() => UserEntity, { nullable: true })
  @JoinColumn({ name: "userId" })
  user!: UserEntity | null;

  @Column({ type: "varchar", length: 255, nullable: true }) // Email of the user who performed the action
  userEmail!: string | null;

  @Column({ type: "varchar", length: 50 }) // e.g., "LOGIN_SUCCESS", "LOGIN_FAILURE", "UPDATE_USER"
  action!: string;

  @Column({ type: "varchar", length: 50, nullable: true }) // e.g., "USER", "TENANT", "WBS_BUDGET"
  targetType!: string | null;

  @Column({ type: "uuid", nullable: true }) // ID of the target resource
  targetId!: string | null;

  @Column({ type: "jsonb", nullable: true }) // Store additional payload/context (e.g., old/new values)
  details!: object | null;

  @Column({ type: "varchar", length: 45, nullable: true }) // IP address of the client
  ipAddress!: string | null;

  // Indexes for performance
  @Index()
  @Column({ type: "uuid", nullable: true })
  tenantId!: string | null; // Tenant context of the action, even if user is public

  @Index()
  @Column({ type: "varchar", length: 50 })
  actionType!: string; // Using "actionType" as a more generic term for indexing
}