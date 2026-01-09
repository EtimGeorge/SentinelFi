import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from "typeorm";
import { UserEntity } from "../auth/user.entity"; // Assuming UserEntity exists for creator
import { WbsBudgetEntity } from "../wbs/wbs-budget.entity"; // Link to WBS Budgets
import { ProjectStatus } from "./enums/project.enum";

@Entity({ name: "project", schema: "client_template" }) // Multi-tenancy
export class ProjectEntity {
  @PrimaryGeneratedColumn("uuid")
  project_id!: string;

  @Column({ type: "varchar", length: 255, unique: true })
  project_name!: string;

  @Column({ type: "text", nullable: true })
  rfq_number!: string | null; // Request for Quotation

  @Column({ type: "text", nullable: true })
  sow_details!: string | null; // Statement of Work details

  @Column({ type: "text", nullable: true })
  notes!: string | null;

  @Column({
    type: "enum",
    enum: ProjectStatus,
    default: ProjectStatus.ACTIVE,
  })
  status!: ProjectStatus;

  @Column({ type: "timestamptz", default: () => "CURRENT_TIMESTAMP" })
  created_at!: Date;

  @Column({ type: "timestamptz", nullable: true })
  updated_at!: Date | null;

  @Column({ type: "uuid", nullable: false })
  tenant_id!: string;

  // Foreign Key to User who created the project
  @Column({ type: "uuid" })
  created_by_user_id!: string;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: "created_by_user_id" })
  createdBy!: UserEntity;

  // One-to-Many relation with WbsBudgetEntity
  @OneToMany(() => WbsBudgetEntity, (wbsBudget) => wbsBudget.project)
  wbsBudgets!: WbsBudgetEntity[];
}