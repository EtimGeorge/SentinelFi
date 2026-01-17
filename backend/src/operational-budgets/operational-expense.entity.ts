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
import { OperationalBudgetCategoryEntity } from "./operational-budget-category.entity";

export enum OperationalExpenseStatus {
  PENDING = "PENDING",
  APPROVED = "APPROVED",
  REJECTED = "REJECTED",
}

@Entity("operational_expense")
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

  @CreateDateColumn({ type: "timestamp" })
  created_at!: Date;

  @UpdateDateColumn({ type: "timestamp" })
  updated_at!: Date;
}
