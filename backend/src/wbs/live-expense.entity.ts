import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { WbsBudgetEntity } from "./wbs-budget.entity";
import { WbsCategoryEntity } from "./wbs-category.entity"; // NEW: Import WbsCategoryEntity

@Entity({ name: "live_expense", schema: "client_template" })
export class LiveExpenseEntity {
  // ADDED ! NON-NULL ASSERTION OPERATOR
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "uuid", nullable: false })
  tenant_id!: string;

  @Column({ type: "uuid", nullable: true })
  project_id!: string | null;

  @Column({ type: "uuid" })
  wbs_id!: string;

  @ManyToOne(() => WbsBudgetEntity)
  @JoinColumn({ name: "wbs_id" })
  wbsBudget!: WbsBudgetEntity;

  @Column({ type: "uuid", nullable: true })
  category_id!: string | null; // NEW: Category ID

  @ManyToOne(() => WbsCategoryEntity, (category) => category.liveExpenses)
  @JoinColumn({ name: "category_id" })
  category!: WbsCategoryEntity;

  @Column({ type: "timestamptz", nullable: true })
  updated_at!: Date | null;

  // User and Transaction Details (ADDED ! to all)
  @Column({ type: "uuid" })
  user_id!: string;

  @Column({ type: "date", default: () => "CURRENT_DATE" })
  expense_date!: Date;

  @Column({ type: "text" })
  description!: string;

  // Financial Fields (ADDED ! to all)
  @Column({ type: "numeric", precision: 19, scale: 4 })
  unit_cost!: number;

  @Column({ type: "numeric", precision: 19, scale: 4 })
  quantity!: number;

  @Column({ type: "numeric", precision: 19, scale: 4, default: 0.0 })
  commitment_lpo_amount!: number;

  @Column({ type: "numeric", precision: 19, scale: 4 })
  amount!: number;

  @Column({ type: "varchar", length: 255, nullable: true })
  document_reference!: string | null;

  @Column({ type: "text", nullable: true })
  notes_justification!: string | null;

  // Real-time Variance Flag
  @Column({ type: "varchar", length: 50, default: "NO_VARIANCE" })
  variance_flag!: string;

  @Column({ type: "timestamptz", default: () => "CURRENT_TIMESTAMP" })
  created_at!: Date;
}
