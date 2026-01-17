import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from "typeorm";
import { ProjectEntity } from "./project.entity";
import { UserEntity } from "../auth/user.entity";

@Entity({ name: "project_inflow", schema: "client_template" })
export class ProjectInflowEntity {
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
  milestone_name!: string;

  @Column({ type: "text", nullable: true })
  description!: string | null;

  @Column({ type: "numeric", precision: 19, scale: 4 })
  amount_received!: number;

  @Column({ type: "date" })
  receipt_date!: Date;

  @Column({ type: "varchar", length: 255, nullable: true })
  bank_reference!: string | null;

  @Column({ type: "uuid" })
  received_by_user_id!: string;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: "received_by_user_id" })
  receivedBy!: UserEntity;

  @CreateDateColumn({ type: "timestamptz" })
  created_at!: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  updated_at!: Date;
}
