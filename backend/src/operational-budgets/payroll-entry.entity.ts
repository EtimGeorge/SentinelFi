import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";
import { OperationalBudgetEntity } from "./operational-budget.entity";
import { UserEntity } from "../auth/user.entity";

@Entity({ name: "payroll_entry" })
export class PayrollEntryEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "uuid" })
  tenant_id!: string;

  @Column({ type: "uuid" })
  operational_budget_id!: string;

  @ManyToOne(() => OperationalBudgetEntity)
  @JoinColumn({ name: "operational_budget_id" })
  operationalBudget!: OperationalBudgetEntity;

  @Column({ type: "varchar", length: 255 })
  employee_name!: string;

  @Column({ type: "varchar", length: 100, nullable: true })
  employee_id!: string | null;

  @Column({ type: "numeric", precision: 19, scale: 4 })
  base_salary!: number;

  @Column({ type: "numeric", precision: 19, scale: 4, default: 0 })
  bonus!: number;

  @Column({ type: "numeric", precision: 19, scale: 4, default: 0 })
  overtime!: number;

  @Column({ type: "numeric", precision: 19, scale: 4, default: 0 })
  other_allowances!: number;

  @Column({ type: "numeric", precision: 19, scale: 4, default: 0 })
  pension_deduction!: number;

  @Column({ type: "numeric", precision: 19, scale: 4, default: 0 })
  tax_deduction!: number;

  @Column({ type: "numeric", precision: 19, scale: 4 })
  net_pay!: number;

  @Column({ type: "date" })
  pay_period_start!: Date;

  @Column({ type: "date" })
  pay_period_end!: Date;

  @Column({ type: "date" })
  payment_date!: Date;

  @Column({ type: "varchar", length: 50, default: "PAID" })
  status!: string; // PAID, PENDING, FAILED

  @CreateDateColumn({ type: "timestamptz" })
  created_at!: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  updated_at!: Date;

  @Column({ type: "uuid" })
  processed_by_user_id!: string;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: "processed_by_user_id" })
  processedBy!: UserEntity;
}
