import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index, ManyToOne, JoinColumn } from "typeorm";
import { FiscalPeriodEntity } from "./fiscal-period.entity";
import { CostCenterEntity } from "./cost-center.entity";
import { GLAccountEntity } from "./gl-account.entity";

export enum BudgetLedgerType {
  PRIMARY_ALLOCATION = "PRIMARY_ALLOCATION",
  SUPPLEMENT = "SUPPLEMENT",
  TRANSFER_IN = "TRANSFER_IN",
  TRANSFER_OUT = "TRANSFER_OUT"
}

@Entity("budget_ledger")
export class BudgetLedgerEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Index()
  @Column({ type: "uuid" })
  tenant_id!: string;

  @Column({ type: "uuid" })
  fiscal_period_id!: string;

  @ManyToOne(() => FiscalPeriodEntity)
  @JoinColumn({ name: "fiscal_period_id" })
  fiscalPeriod!: FiscalPeriodEntity;

  @Column({ type: "uuid" })
  cost_center_id!: string;

  @ManyToOne(() => CostCenterEntity)
  @JoinColumn({ name: "cost_center_id" })
  costCenter!: CostCenterEntity;

  @Column({ type: "uuid" })
  gl_account_id!: string;

  @ManyToOne(() => GLAccountEntity)
  @JoinColumn({ name: "gl_account_id" })
  glAccount!: GLAccountEntity;

  @Column({ type: "enum", enum: BudgetLedgerType })
  budget_type!: BudgetLedgerType;

  // Amount can be positive or negative (for transfer out)
  @Column({ type: "decimal", precision: 19, scale: 4 })
  amount!: number;

  @Column({ type: "varchar", length: 255, nullable: true })
  reference_note!: string | null;

  @Column({ type: "uuid", nullable: true })
  created_by_user_id!: string | null;

  @CreateDateColumn({ type: "timestamptz" })
  created_at!: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  updated_at!: Date;
}
