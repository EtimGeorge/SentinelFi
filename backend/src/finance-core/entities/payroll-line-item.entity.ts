import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { PayrollRunEntity } from "./payroll-run.entity";
import { CostCenterEntity } from "./cost-center.entity";
import { GLAccountEntity } from "./gl-account.entity";
import { UserEntity } from "../../auth/user.entity"; // Tying back to the employee

export enum PayrollLineItemType {
  BASE_SALARY = "BASE_SALARY",
  BONUS = "BONUS",
  COMMISSION = "COMMISSION",
  EMPLOYER_TAX = "EMPLOYER_TAX",
  EMPLOYER_BENEFIT = "EMPLOYER_BENEFIT",
}

@Entity("payroll_line_item")
export class PayrollLineItemEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Index()
  @Column({ type: "uuid" })
  tenant_id!: string;

  @Column({ type: "uuid" })
  payroll_run_id!: string;

  @ManyToOne(() => PayrollRunEntity, (run) => run.lineItems)
  @JoinColumn({ name: "payroll_run_id" })
  payrollRun!: PayrollRunEntity;

  @Column({ type: "uuid" })
  employee_id!: string;

  @ManyToOne("UserEntity")
  @JoinColumn({ name: "employee_id" })
  employee!: UserEntity;

  @Column({ type: "uuid" })
  cost_center_id!: string;

  @ManyToOne(() => CostCenterEntity)
  @JoinColumn({ name: "cost_center_id" })
  costCenter!: CostCenterEntity;

  // The specific GL account (e.g., 5100 Base Pay, 5110 Bonuses)
  @Column({ type: "uuid" })
  gl_account_id!: string;

  @ManyToOne(() => GLAccountEntity)
  @JoinColumn({ name: "gl_account_id" })
  glAccount!: GLAccountEntity;

  @Column({ type: "enum", enum: PayrollLineItemType })
  item_type!: PayrollLineItemType;

  @Column({ type: "decimal", precision: 19, scale: 4 })
  amount!: number;

  @CreateDateColumn({ type: "timestamptz" })
  created_at!: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  updated_at!: Date;
}
