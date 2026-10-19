import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from "typeorm";

export enum VirementStatus {
  DRAFT = "DRAFT",
  PENDING = "PENDING",
  APPROVED = "APPROVED",
  REJECTED = "REJECTED",
  APPLIED = "APPLIED",
  CANCELLED = "CANCELLED",
}

@Entity("budget_virement")
export class BudgetVirementEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Index()
  @Column({ type: "uuid" })
  tenant_id!: string;

  @Column({ type: "uuid" })
  operational_budget_id!: string;

  @Column({ type: "uuid" })
  source_category_id!: string;

  @Column({ type: "uuid" })
  destination_category_id!: string;

  @Column({ type: "numeric", precision: 19, scale: 4 })
  amount!: number;

  @Column({ type: "varchar", length: 20, default: "DRAFT" })
  status!: VirementStatus;

  @Column({ type: "text", nullable: true })
  reason!: string | null;

  @Column({ type: "uuid", nullable: true })
  approved_by_user_id!: string | null;

  @Column({ type: "timestamptz", nullable: true })
  approved_at!: Date | null;

  @Column({ type: "uuid" })
  created_by_user_id!: string;

  @CreateDateColumn({ type: "timestamptz" })
  created_at!: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  updated_at!: Date;
}
