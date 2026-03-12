import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index, OneToMany } from "typeorm";
import { FiscalPeriodEntity } from "./fiscal-period.entity";

@Entity("fiscal_year")
@Index(["tenant_id", "year_label"], { unique: true })
export class FiscalYearEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Index()
  @Column({ type: "uuid" })
  tenant_id!: string;

  @Column({ type: "varchar", length: 50 })
  year_label!: string; // e.g. "FY2026"

  @Column({ type: "date" })
  start_date!: Date;

  @Column({ type: "date" })
  end_date!: Date;

  @Column({ type: "boolean", default: false })
  is_closed!: boolean;

  @OneToMany(() => FiscalPeriodEntity, period => period.fiscalYear)
  periods!: FiscalPeriodEntity[];

  @CreateDateColumn({ type: "timestamptz" })
  created_at!: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  updated_at!: Date;
}
