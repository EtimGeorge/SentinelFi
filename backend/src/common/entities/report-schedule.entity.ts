import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index, UpdateDateColumn } from "typeorm";
import { ReportType } from "./document-control.entity";

export enum ScheduleFrequency {
  DAILY = "DAILY",
  WEEKLY = "WEEKLY",
  MONTHLY = "MONTHLY",
}

@Entity("report_schedule")
export class ReportScheduleEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Index()
  @Column({ type: "uuid" })
  tenant_id!: string;

  @Column({ type: "varchar", length: 255 })
  name!: string;

  @Column({ type: "enum", enum: ReportType })
  report_type!: ReportType;

  @Column({ type: "enum", enum: ScheduleFrequency })
  frequency!: ScheduleFrequency;

  @Column({ type: "text", array: true })
  recipients!: string[];

  @Column({ type: "jsonb", nullable: true })
  filters?: any;

  @Column({ type: "boolean", default: true })
  is_active!: boolean;

  @Column({ type: "timestamptz", nullable: true })
  last_run_at?: Date;

  @Column({ type: "timestamptz", nullable: true })
  next_run_at?: Date;

  @CreateDateColumn({ type: "timestamptz" })
  created_at!: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  updated_at!: Date;
}
