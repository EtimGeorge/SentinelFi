import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  OneToMany,
  Unique,
  Index,
  DeleteDateColumn,
} from "typeorm";
import { UserEntity } from "../auth/user.entity";
import { ProjectEntity } from "../projects/project.entity";
import { WbsCategoryEntity } from "./wbs-category.entity";
import { WbsBudgetStatus } from "../../../shared/types/wbs-budget-status.enum";

@Entity({ name: "wbs_budget" })
@Unique(['wbs_code', 'project_id']) // Composite unique: same code allowed in different projects
@Index(["tenant_id", "project_id"])
export class WbsBudgetEntity {
  @PrimaryGeneratedColumn("uuid")
  wbs_id!: string;

  @Column({ type: "uuid", nullable: false })
  project_id!: string;

  @ManyToOne(() => ProjectEntity, (project) => project.wbsBudgets, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "project_id" })
  project!: ProjectEntity;

  @Column({ type: "uuid", nullable: true })
  parent_wbs_id!: string | null;

  @ManyToOne(() => WbsBudgetEntity, (wbs) => wbs.children)
  @JoinColumn({ name: "parent_wbs_id" })
  parent!: WbsBudgetEntity;

  @OneToMany(() => WbsBudgetEntity, (wbs) => wbs.parent)
  children!: WbsBudgetEntity[];

  @Column({ type: "uuid", nullable: true })
  category_id!: string | null;

  @ManyToOne(() => WbsCategoryEntity, (category) => category.wbsBudgets)
  @JoinColumn({ name: "category_id" })
  category!: WbsCategoryEntity;

  @Column({ length: 50 })
  wbs_code!: string;

  @Column({ type: "text" })
  description!: string;

  // Financial Fields
  @Column({ type: "numeric", precision: 19, scale: 4, default: 0 })
  unit_cost_budgeted!: number;

  @Column({ type: "numeric", precision: 19, scale: 4, default: 0 })
  quantity_budgeted!: number;

  @Column({ type: "int", nullable: true })
  days_budgeted!: number | null;

  @Column({ type: "varchar", length: 50, nullable: true })
  uom!: string | null;

  @Column({ type: "jsonb", nullable: true })
  custom_metadata!: Record<string, any> | null;

  @Column({ type: "numeric", precision: 19, scale: 4 })
  total_cost_budgeted!: number;

  @Column({ type: "numeric", precision: 19, scale: 4, default: 0 })
  total_cost_actual!: number;

  @Column({ type: "numeric", precision: 19, scale: 4, default: 0 })
  total_committed_lpo!: number;

  @Column({ type: "numeric", precision: 19, scale: 4, default: 0 })
  quantity_actual!: number;

  @Column({ type: "numeric", precision: 19, scale: 4, default: 0 })
  days_actual!: number;

  // Status/Audit Fields
  @Column({
    type: "enum",
    enum: WbsBudgetStatus,
    default: WbsBudgetStatus.DRAFT,
  })
  status!: WbsBudgetStatus;
  
  @Column({ type: "int", default: 0 })
  sort_order!: number;

  @Column({ type: "timestamptz", default: () => "CURRENT_TIMESTAMP" })
  created_at!: Date;

  @Column({ type: "timestamptz", nullable: true })
  updated_at!: Date | null;

  @Column({ type: "uuid", nullable: false })
  tenant_id!: string;

  @DeleteDateColumn({ type: "timestamptz", nullable: true })
  deleted_at?: Date;

  @ManyToOne('UserEntity')
  @JoinColumn({ name: "user_id", referencedColumnName: "id" })
  user!: UserEntity;
}
