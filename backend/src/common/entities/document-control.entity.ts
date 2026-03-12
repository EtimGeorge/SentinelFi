import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index, ManyToOne, JoinColumn } from "typeorm";
import { UserEntity } from "../../auth/user.entity";

export enum ReportType {
  CAPEX_SUMMARY = "CAPEX_SUMMARY",
  OPEX_EFFICIENCY = "OPEX_EFFICIENCY",
  VARIANCE_ANALYSIS = "VARIANCE_ANALYSIS",
  PAYROLL_SUMMARY = "PAYROLL_SUMMARY",
  PROCUREMENT_FUNNEL = "PROCUREMENT_FUNNEL",
  ANOMALY_DETECTION = "ANOMALY_DETECTION",
}

@Entity("document_control")
export class DocumentControlEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Index()
  @Column({ type: "uuid" })
  tenant_id!: string;

  @Column({ type: "enum", enum: ReportType })
  report_type!: ReportType;

  @Column({ type: "varchar", length: 255 })
  file_name!: string;

  @Column({ type: "varchar", length: 500 })
  file_path!: string;

  @Column({ type: "varchar", length: 100 })
  mime_type!: string;

  @Column({ type: "jsonb", nullable: true })
  metadata?: {
    filters?: any;
    ai_generated?: boolean;
    ai_summary?: string;
    generating_agent_id?: string;
    total_records?: number;
    financial_period?: string;
    context?: any;
  };

  @Column({ type: "uuid" })
  created_by_id!: string;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: "created_by_id" })
  creator!: UserEntity;

  @CreateDateColumn({ type: "timestamptz" })
  created_at!: Date;

  @Column({ type: "timestamptz", nullable: true })
  last_accessed_at?: Date;

  @Column({ type: "boolean", default: false })
  is_pushed_to_external_dcs!: boolean;

  @Column({ type: "timestamptz", nullable: true })
  pushed_at?: Date;
}
