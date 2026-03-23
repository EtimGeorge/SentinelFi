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
    (allocation) => allocation.category
  )
  allocations!: OperationalBudgetPeriodAllocationEntity[];

  @CreateDateColumn({ type: "timestamp" })
  created_at!: Date;

  @UpdateDateColumn({ type: "timestamp" })
  updated_at!: Date;

  @DeleteDateColumn({ type: "timestamp", nullable: true })
  deleted_at?: Date;
}
