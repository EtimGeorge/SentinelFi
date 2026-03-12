import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index, ManyToOne, JoinColumn } from "typeorm";
import { FiscalYearEntity } from "./fiscal-year.entity";

export enum FiscalPeriodType {
  MONTH = "MONTH",
  QUARTER = "QUARTER"
}

@Entity("fiscal_period")
@Index(["tenant_id", "fiscal_year_id", "period_name"], { unique: true })
export class FiscalPeriodEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Index()
  @Column({ type: "uuid" })
  tenant_id!: string;

  @Column({ type: "uuid" })
  fiscal_year_id!: string;

  @ManyToOne(() => FiscalYearEntity, year => year.periods, { onDelete: "CASCADE" })
  @JoinColumn({ name: "fiscal_year_id" })
  fiscalYear!: FiscalYearEntity;

  @Column({ type: "varchar", length: 50 })
  period_name!: string; // e.g., "Jan", "Q1"

  @Column({ type: "enum", enum: FiscalPeriodType, default: FiscalPeriodType.MONTH })
  period_type!: FiscalPeriodType;

  @Column({ type: "date" })
  start_date!: Date;

  @Column({ type: "date" })
  end_date!: Date;

  @Column({ type: "boolean", default: false })
  is_closed!: boolean;

  @CreateDateColumn({ type: "timestamptz" })
  created_at!: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  updated_at!: Date;
}
