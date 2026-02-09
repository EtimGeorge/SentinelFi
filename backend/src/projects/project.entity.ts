import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  OneToMany,
  UpdateDateColumn,
  Index,
} from "typeorm";
import { ProjectStatus } from "./enums/project.enum";
import { ClientEntity } from "../clients/client.entity";
import { UserEntity } from "../auth/user.entity";
import { WbsBudgetEntity } from "../wbs/wbs-budget.entity";

@Entity({ name: "project" }) // Multi-tenancy
@Index(["project_name", "tenant_id"], { unique: true })
export class ProjectEntity {
  @PrimaryGeneratedColumn("uuid")
  project_id!: string;

  @Column({ type: "varchar", length: 255 })
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

  // Advanced Financial Controls
  @Column({ type: "varchar", length: 10, default: "NGN" })
  currency!: string;

  @Column({ type: "numeric", precision: 19, scale: 4, default: 0 })
  contract_value!: number;

  @Column({ type: "numeric", precision: 5, scale: 2, default: 0 })
  contingency_percent!: number;

  @Column({ type: "numeric", precision: 5, scale: 2, default: 7.5 })
  vat_rate!: number; // e.g., 7.5 for Nigeria

  @Column({ type: "numeric", precision: 5, scale: 2, default: 5.0 })
  wht_rate!: number; // e.g., 5.0 for Withholding Tax

  @Column({ type: "timestamptz", default: () => "CURRENT_TIMESTAMP" })
  created_at!: Date;

  @Column({ type: "timestamptz", nullable: true })
  updated_at!: Date | null;

  @Column({ type: "uuid", nullable: false })
  tenant_id!: string;

  @Column({ type: "uuid", nullable: true })
  client_id!: string | null;

  @ManyToOne(() => ClientEntity, (client) => client.projects)
  @JoinColumn({ name: "client_id" })
  client!: ClientEntity | null;

  // Foreign Key to User who created the project
  @Column({ type: "uuid" })
  created_by_user_id!: string;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: "created_by_user_id", referencedColumnName: "id" })
  createdBy!: UserEntity;

  // One-to-Many relation with WbsBudgetEntity
  @OneToMany(() => WbsBudgetEntity, (wbsBudget) => wbsBudget.project)
  wbsBudgets!: WbsBudgetEntity[];
}
