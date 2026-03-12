import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Index,
} from "typeorm";
import { ProjectEntity } from "./project.entity";
import { UserEntity } from "../auth/user.entity";

@Entity({ name: "project_audit" })
export class ProjectAuditEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Index()
  @Column({ type: "uuid" })
  tenant_id!: string;

  @Column({ type: "uuid" })
  project_id!: string;

  @ManyToOne(() => ProjectEntity)
  @JoinColumn({ name: "project_id" })
  project!: ProjectEntity;

  @Column({ type: "varchar", length: 100 })
  change_type!: string; // e.g., 'BUDGET_ADJUSTMENT', 'CONTRACT_VALUE_CHANGE', 'SCOPE_CHANGE'

  @Column({ type: "numeric", precision: 19, scale: 4, nullable: true })
  old_value!: number | null;

  @Column({ type: "numeric", precision: 19, scale: 4, nullable: true })
  new_value!: number | null;

  @Column({ type: "text" })
  description!: string;

  @Column({ type: "uuid" })
  performed_by_user_id!: string;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: "performed_by_user_id" })
  performedBy!: UserEntity;

  @CreateDateColumn({ type: "timestamptz" })
  created_at!: Date;
}
