import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from "typeorm";
import { ProjectEntity } from "./project.entity";
import { WbsBudgetEntity } from "../wbs/wbs-budget.entity";
import { UserEntity } from "../auth/user.entity";
import { ApprovalStatus } from "../../../shared/types/approval-status.enum";
import { VarianceFlag } from "../../../shared/types/variance-flag.enum";

export enum LpoStatus {
  OPEN = "OPEN",
  PARTIALLY_PAID = "PARTIALLY_PAID",
  CLOSED = "CLOSED",
  CANCELLED = "CANCELLED",
}

@Entity({ name: "lpo" })
export class LpoEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Index()
  @Column({ type: "uuid" })
  tenant_id!: string;

  @Column({ type: "varchar", length: 100, unique: true })
  lpo_number!: string;

  @Column({ type: "uuid" })
  project_id!: string;

  @ManyToOne(() => ProjectEntity)
  @JoinColumn({ name: "project_id" })
  project!: ProjectEntity;

  @Column({ type: "uuid" })
  wbs_id!: string;

  @ManyToOne(() => WbsBudgetEntity)
  @JoinColumn({ name: "wbs_id" })
  wbsItem!: WbsBudgetEntity;

  @Column({ type: "varchar", length: 255 })
  vendor_name!: string;

  @Column({ type: "text" })
  description!: string;

  @Column({ type: "numeric", precision: 19, scale: 4 })
  amount_committed!: number;

  @Column({ type: "numeric", precision: 19, scale: 4, default: 0 })
  amount_paid!: number;

  @Column({
    type: "enum",
    enum: LpoStatus,
    default: LpoStatus.OPEN,
  })
  status!: LpoStatus;

  // --- Approval Governance (mirrors the LiveExpense governance engine) ---
  // An LPO is a financial commitment. When it would push a WBS line over budget,
  // it is routed to a PENDING_APPROVAL queue for CFO/Finance authorisation before
  // the commitment is booked against the budget.
  @Column({ type: "varchar", length: 50, default: ApprovalStatus.APPROVED })
  approval_status!: string;

  @Column({ type: "varchar", length: 50, default: VarianceFlag.NO_VARIANCE })
  variance_flag!: string;

  @Column({ type: "text", nullable: true })
  override_reason!: string | null;

  @Column({ type: "date", nullable: true })
  expected_delivery_date!: Date | null;

  @Column({ type: "uuid" })
  created_by_user_id!: string;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: "created_by_user_id" })
  createdBy!: UserEntity;

  @CreateDateColumn({ type: "timestamptz" })
  created_at!: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  updated_at!: Date;
}
