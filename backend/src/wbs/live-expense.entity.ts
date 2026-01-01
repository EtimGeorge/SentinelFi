import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { WbsBudgetEntity } from "./wbs-budget.entity";

@Entity({ name: "live_expense", schema: "client_template" })
export class LiveExpenseEntity {
  // ADDED ! NON-NULL ASSERTION OPERATOR
  @PrimaryGeneratedColumn("increment")
  expense_id!: number; // BIGSERIAL primary key

  // Foreign Key linking to the WBS item (ADDED !)
  @Column({ type: "uuid" })
  wbs_id!: string;

  // ADDED ! NON-NULL ASSERTION OPERATOR
  @ManyToOne(() => WbsBudgetEntity)
  @JoinColumn({ name: "wbs_id" })
  wbsBudget!: WbsBudgetEntity;

  // User and Transaction Details (ADDED ! to all)
  @Column({ type: "uuid" })
  user_id!: string;

  @Column({ type: "date", default: () => "CURRENT_DATE" })
  expense_date!: Date;

  @Column({ type: "text" })
  item_description!: string;

  // Financial Fields (ADDED ! to all)
  @Column({ type: "numeric", precision: 19, scale: 4 })
  actual_unit_cost!: number;

  @Column({ type: "numeric", precision: 19, scale: 4 })
  actual_quantity!: number;

  @Column({ type: "numeric", precision: 19, scale: 4, default: 0.0 })
  commitment_lpo_amount!: number;

  @Column({ type: "numeric", precision: 19, scale: 4 })
  actual_paid_amount!: number;

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
