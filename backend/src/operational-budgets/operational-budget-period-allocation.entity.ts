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

export enum PeriodType {
  MONTHLY = "MONTHLY",
  WEEKLY = "WEEKLY",
  DAILY = "DAILY",
  CUSTOM = "CUSTOM",
}

@Entity("operational_budget_period_allocation")
@Index(["operational_budget_category_id", "period_date"], { unique: true }) // One allocation per period per category
export class OperationalBudgetPeriodAllocationEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "uuid" })
  operational_budget_category_id!: string;

  @ManyToOne(
    () => OperationalBudgetCategoryEntity,
    (category) => category.allocations,
    { onDelete: "CASCADE" },
  )
  @JoinColumn({ name: "operational_budget_category_id" })
  category!: OperationalBudgetCategoryEntity;

  // Start date of the period (e.g., 2026-01-01 for Jan 2026)
  @Column({ type: "date" })
  period_date!: Date;

  @Column({
    type: "enum",
    enum: PeriodType,
    default: PeriodType.MONTHLY,
  })
  period_type!: PeriodType;

  @Column({ type: "decimal", precision: 19, scale: 4, default: 0 })
  planned_amount!: number;

  @Column({ type: "decimal", precision: 19, scale: 4, default: 0 })
  actual_amount!: number; // Optional: Store actuals rolled up for this period?

  @CreateDateColumn({ type: "timestamptz" })
  created_at!: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  updated_at!: Date;
}
