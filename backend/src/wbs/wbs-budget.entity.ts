import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from "typeorm";
import { UserEntity } from "../auth/user.entity";
import { ProjectEntity } from "../projects/project.entity"; // NEW: Import ProjectEntity
import { WbsCategoryEntity } from "./wbs-category.entity"; // NEW: Import WbsCategoryEntity
import { WbsBudgetStatus } from "../../../shared/types/wbs-budget-status.enum"; // NEW: Import WbsBudgetStatus

@Entity({ name: "wbs_budget", schema: "client_template" })
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
  category_id!: string | null; // NEW: Category ID

  @ManyToOne(() => WbsCategoryEntity, (category) => category.wbsBudgets)
  @JoinColumn({ name: "category_id" })
  category!: WbsCategoryEntity;

  @Column({ unique: true, length: 50 })
  wbs_code!: string;

  @Column({ type: "text" })
  description!: string;

  // Financial Fields
  @Column({ type: "numeric", precision: 19, scale: 4 })
  unit_cost_budgeted!: number;

  @Column({ type: "numeric", precision: 19, scale: 4 })
  quantity_budgeted!: number;

  @Column({ type: "int", nullable: true })
  days_budgeted!: number | null;

  @Column({ type: "numeric", precision: 19, scale: 4 })
  total_cost_budgeted!: number;

  @Column({ type: "numeric", precision: 19, scale: 4, default: 0 })
  total_cost_actual!: number; // NEW: To track actual spend

  // Status/Audit Fields
  @Column({
    type: "enum",
    enum: WbsBudgetStatus,
    default: WbsBudgetStatus.PENDING,
  })
  status!: WbsBudgetStatus;

  @Column({ type: "timestamptz", default: () => "CURRENT_TIMESTAMP" })
  created_at!: Date;

  @Column({ type: "timestamptz", nullable: true })
  updated_at!: Date | null;

  @Column({ type: "uuid", nullable: false })
  tenant_id!: string;

  @ManyToOne('UserEntity') // Reference UserEntity by string name
  @JoinColumn({ name: "user_id", referencedColumnName: "id" }) // Explicitly define referencedColumnName
  user!: UserEntity;
}
