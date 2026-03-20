import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  DeleteDateColumn,
} from "typeorm";
import { OperationalBudgetCategoryEntity } from "./operational-budget-category.entity";
import { VarianceFlag } from "@shared/types";

export enum OperationalExpenseStatus {
  PENDING = "PENDING",
  APPROVED = "APPROVED",
  REJECTED = "REJECTED",
}

@Entity("operational_expense")
@Index(["tenant_id", "expense_date"])
@Index(["tenant_id", "operational_budget_category_id"])
export class OperationalExpenseEntity {
  @PrimaryGeneratedColumn("uuid")
  operational_expense_id!: string;

  @Index() // Index for faster queries
  @Column({ type: "uuid" })
  tenant_id!: string;

  @Column({ type: "uuid", nullable: false })
  operational_budget_category_id!: string;

  @Column({ type: "varchar", length: 255, nullable: false })
  item_description!: string;

  @Column({ type: "decimal", precision: 10, scale: 2, nullable: false })
  amount!: number;

  @Column({ type: "timestamp", nullable: false })
  expense_date!: Date;

  @Column({ type: "varchar", length: 255, nullable: true })
  vendor!: string | null;

  @Column({ type: "varchar", length: 255, nullable: true })
  receipt_url!: string | null; // Optional URL to a receipt image

  @Column({
    type: "enum",
    enum: OperationalExpenseStatus,
    default: OperationalExpenseStatus.PENDING,
  })
  status!: OperationalExpenseStatus;

  @Column({ type: "uuid", nullable: false })
  logged_by_user_id!: string;

  @ManyToOne(
    () => OperationalBudgetCategoryEntity,
    (category) => category.expenses,
  )
  @JoinColumn({ name: "operational_budget_category_id" })
  category!: OperationalBudgetCategoryEntity;

  @Column({
    type: "enum",
    enum: VarianceFlag,
    default: VarianceFlag.NO_VARIANCE,
  })
  variance_flag!: VarianceFlag;

  @Column({ type: "text", nullable: true })
  override_reason?: string;

  @CreateDateColumn({ type: "timestamp" })
  created_at!: Date;

  @UpdateDateColumn({ type: "timestamp" })
  updated_at!: Date;

  @DeleteDateColumn({ type: "timestamp", nullable: true })
  deleted_at?: Date;
}
