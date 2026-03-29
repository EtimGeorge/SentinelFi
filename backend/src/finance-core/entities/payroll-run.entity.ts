import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  OneToMany,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { FiscalPeriodEntity } from "./fiscal-period.entity";
import { PayrollLineItemEntity } from "./payroll-line-item.entity";

export enum PayrollRunStatus {
  DRAFT = "DRAFT",
  REVIEW = "REVIEW",
  APPROVED = "APPROVED",
  POSTED = "POSTED", // Posted to General Ledger
}

@Entity("payroll_run")
export class PayrollRunEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Index()
  @Column({ type: "uuid" })
  tenant_id!: string;

  @Column({ type: "varchar", length: 150 })
  run_identifier!: string; // e.g., "Jan 2026 Salary Run"

  @Column({ type: "uuid" })
  fiscal_period_id!: string;

  @ManyToOne(() => FiscalPeriodEntity)
  @JoinColumn({ name: "fiscal_period_id" })
  fiscalPeriod!: FiscalPeriodEntity;

  @Column({ type: "date" })
  run_date!: Date;

  @Column({ type: "decimal", precision: 19, scale: 4, default: 0 })
  total_gross_pay!: number;

  @Column({ type: "decimal", precision: 19, scale: 4, default: 0 })
  total_taxes_employer!: number;

  @Column({ type: "decimal", precision: 19, scale: 4, default: 0 })
  total_benefits_employer!: number;

  @Column({
    type: "enum",
    enum: PayrollRunStatus,
    default: PayrollRunStatus.DRAFT,
  })
  status!: PayrollRunStatus;

  @OneToMany(() => PayrollLineItemEntity, (li) => li.payrollRun)
  lineItems!: PayrollLineItemEntity[];

  @CreateDateColumn({ type: "timestamptz" })
  created_at!: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  updated_at!: Date;
}
