import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  OneToMany, // Import OneToMany
  Index,
} from "typeorm";
import { UserEntity } from "../auth/user.entity"; // Assuming UserEntity exists for creator
import { OperationalBudgetType, OperationalBudgetStatus } from "./enums/operational-budget.enum";
import { OperationalBudgetCategoryEntity } from "./operational-budget-category.entity"; // Import new entity

@Entity({ name: "operational_budget", schema: "client_template" }) // Multi-tenancy
export class OperationalBudgetEntity {
  @PrimaryGeneratedColumn("uuid")
  operational_budget_id!: string;

  @Index() // Index for faster queries
  @Column({ type: "uuid" })
  tenant_id!: string;

  @Column({ type: "varchar", length: 255 })
  name!: string; // e.g., "Q1 2026 Marketing Budget", "Yearly HR Expenses"

  @Column({ type: "text", nullable: true })
  description!: string | null;

  @Column({
    type: "enum",
    enum: OperationalBudgetType,
    default: OperationalBudgetType.COMPANY_WIDE,
  })
  type!: OperationalBudgetType;

  @Column({ type: "numeric", precision: 19, scale: 4 })
  budgeted_amount!: number;

  @Column({ type: "numeric", precision: 19, scale: 4, default: 0 })
  actual_spent!: number; // Track actual spend against this budget

  @Column({ type: "date" })
  start_date!: Date;

  @Column({ type: "date" })
  end_date!: Date;

  @Column({
    type: "enum",
    enum: OperationalBudgetStatus,
    default: OperationalBudgetStatus.ACTIVE,
  })
  status!: OperationalBudgetStatus;

  @Column({ type: "timestamptz", default: () => "CURRENT_TIMESTAMP" })
  created_at!: Date;

  @Column({ type: "timestamptz", nullable: true })
  updated_at!: Date | null;

  // Foreign Key to User who created/manages this budget
  @Column({ type: "uuid" })
  created_by_user_id!: string;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: "created_by_user_id" })
  createdBy!: UserEntity;

  @OneToMany(() => OperationalBudgetCategoryEntity, (category) => category.operationalBudget)
  categories!: OperationalBudgetCategoryEntity[];

  // Future integration: Link to specific department or cost center if needed
  @Column({ type: "uuid", nullable: true })
  department_id!: string | null;
}