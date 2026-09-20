import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
  DeleteDateColumn,
} from "typeorm";
import { OperationalBudgetEntity } from "./operational-budget.entity";
import { OperationalExpenseEntity } from "./operational-expense.entity"; // Will be created next
import { OperationalBudgetPeriodAllocationEntity } from "./operational-budget-period-allocation.entity";

@Entity("operational_budget_category")
export class OperationalBudgetCategoryEntity {
  @PrimaryGeneratedColumn("uuid")
  operational_budget_category_id!: string;

  @Index() // Index for faster queries
  @Column({ type: "uuid" })
  tenant_id!: string;

  @Column({ type: "uuid", nullable: false })
  operational_budget_id!: string;

  @Column({ type: "varchar", length: 255, nullable: false })
  name!: string; // e.g., 'Salaries', 'Marketing', 'Utilities'

  @Column({ type: "decimal", precision: 10, scale: 2, default: 0 })
  budgeted_amount!: number;

  @Column({ type: "decimal", precision: 10, scale: 2, default: 0 })
  actual_spent!: number; // Sum of related OperationalExpenseEntity amounts

  // ─── Phase 4 — Category-Specific Variance Tolerance (4.4) ──────────────
  // Percentage headroom (e.g. 15 = tolerate up to 15% overrun before flagging).
  // Lower values are stricter, so Payroll can be governed more tightly than
  // discretionary categories.
  @Column({ type: "decimal", precision: 5, scale: 2, nullable: true })
  variance_tolerance_pct!: number | null;

  // AND-threshold (4.3): minimum absolute overrun amount required before the
  // % tier escalates. Prevents $5 overruns on a small category from tripping
  // a CRITICAL flag when both dimensions must exceed their bounds.
  @Column({ type: "decimal", precision: 19, scale: 4, nullable: true })
  variance_min_amount!: number | null;

  @ManyToOne(
    () => OperationalBudgetEntity,
    (operationalBudget) => operationalBudget.categories,
  )
  @JoinColumn({ name: "operational_budget_id" })
  operationalBudget!: OperationalBudgetEntity;

  @OneToMany(() => OperationalExpenseEntity, (expense) => expense.category)
  expenses!: OperationalExpenseEntity[];

  @OneToMany(
    () => OperationalBudgetPeriodAllocationEntity,
    (allocation) => allocation.category,
  )
  allocations!: OperationalBudgetPeriodAllocationEntity[];

  @CreateDateColumn({ type: "timestamp" })
  created_at!: Date;

  @UpdateDateColumn({ type: "timestamp" })
  updated_at!: Date;

  @DeleteDateColumn({ type: "timestamp", nullable: true })
  deleted_at?: Date;
}
