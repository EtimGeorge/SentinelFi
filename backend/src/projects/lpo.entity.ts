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
import { WbsBudgetEntity } from "../wbs/wbs-budget.entity";
import { UserEntity } from "../auth/user.entity";

export enum LpoStatus {
  OPEN = "OPEN",
  PARTIALLY_PAID = "PARTIALLY_PAID",
  CLOSED = "CLOSED",
  CANCELLED = "CANCELLED",
}

@Entity({ name: "lpo" })
export class LpoEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Index()
  @Column({ type: "uuid" })
  tenant_id!: string;

  @Column({ type: "varchar", length: 100, unique: true })
  lpo_number!: string;

  @Column({ type: "uuid" })
  project_id!: string;

  @ManyToOne(() => ProjectEntity)
  @JoinColumn({ name: "project_id" })
  project!: ProjectEntity;

  @Column({ type: "uuid" })
  wbs_id!: string;

  @ManyToOne(() => WbsBudgetEntity)
  @JoinColumn({ name: "wbs_id" })
  wbsItem!: WbsBudgetEntity;

  @Column({ type: "varchar", length: 255 })
  vendor_name!: string;

  @Column({ type: "text" })
  description!: string;

  @Column({ type: "numeric", precision: 19, scale: 4 })
  amount_committed!: number;

  @Column({ type: "numeric", precision: 19, scale: 4, default: 0 })
  amount_paid!: number;

  @Column({
    type: "enum",
    enum: LpoStatus,
    default: LpoStatus.OPEN,
  })
  status!: LpoStatus;

  @Column({ type: "date", nullable: true })
  expected_delivery_date!: Date | null;

  @Column({ type: "uuid" })
  created_by_user_id!: string;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: "created_by_user_id" })
  createdBy!: UserEntity;

  @CreateDateColumn({ type: "timestamptz" })
  created_at!: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  updated_at!: Date;
}
