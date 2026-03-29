import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { UserEntity } from "../../auth/user.entity";

export enum ApprovalDocumentType {
  WBS_BUDGET = "WBS_BUDGET",
  REQUISITION = "REQUISITION",
  PAYROLL_RUN = "PAYROLL_RUN",
}

export enum ApprovalStatus {
  SUBMITTED = "SUBMITTED",
  APPROVED = "APPROVED",
  REJECTED = "REJECTED",
  CANCELLED = "CANCELLED",
}

@Entity("approval_log")
export class ApprovalLogEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Index()
  @Column({ type: "uuid" })
  tenant_id!: string;

  @Column({ type: "enum", enum: ApprovalDocumentType })
  document_type!: ApprovalDocumentType;

  @Index()
  @Column({ type: "uuid" })
  document_id!: string;

  @Column({ type: "enum", enum: ApprovalStatus })
  status!: ApprovalStatus;

  @Column({ type: "uuid" })
  actor_id!: string;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: "actor_id" })
  actor!: UserEntity;

  @Column({ type: "text", nullable: true })
  comments?: string;

  @Column({ type: "numeric", precision: 19, scale: 4, nullable: true })
  amount?: number;

  @CreateDateColumn({ type: "timestamptz" })
  created_at!: Date;
}
