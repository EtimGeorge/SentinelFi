import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { UserEntity } from "../auth/user.entity";

export enum ReportFrequency {
  DAILY = "DAILY",
  WEEKLY = "WEEKLY",
  MONTHLY = "MONTHLY",
}

export enum ReportStatus {
  ACTIVE = "ACTIVE",
  PAUSED = "PAUSED",
  COMPLETED = "COMPLETED",
}

@Entity({ name: "ai_report_schedule" })
export class ReportScheduleEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "uuid" })
  tenant_id!: string;

  @Column({ type: "uuid" })
  created_by_id!: string;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: "created_by_id", referencedColumnName: "id" })
  createdBy!: UserEntity;

  @Column({ type: "varchar", length: 50 })
  report_type!: string; // variance | capex | opex | executive

  @Column({
    type: "enum",
    enum: ReportFrequency,
    default: ReportFrequency.WEEKLY,
  })
  frequency!: ReportFrequency;

  @Column({ type: "enum", enum: ReportStatus, default: ReportStatus.ACTIVE })
  status!: ReportStatus;

  @Column({ type: "simple-array", nullable: true })
  recipients!: string[]; // email addresses

  @Column({ type: "uuid", nullable: true })
  project_id!: string | null;

  @Column({ type: "boolean", default: false })
  deliver_by_email!: boolean;

  @Column({ type: "varchar", length: 100, nullable: true })
  last_ai_narrative_preview!: string | null; // First 100 chars of last generated narrative

  @Column({ type: "timestamptz", nullable: true })
  next_run_at!: Date | null;

  @Column({ type: "timestamptz", nullable: true })
  last_run_at!: Date | null;

  @Column({ type: "int", default: 0 })
  run_count!: number;

  @CreateDateColumn({ type: "timestamptz" })
  created_at!: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  updated_at!: Date;
}
