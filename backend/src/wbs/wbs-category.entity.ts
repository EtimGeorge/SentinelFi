import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  OneToMany,
  Unique,
} from "typeorm";
import { WbsBudgetEntity } from "./wbs-budget.entity"; // NEW: Import WbsBudgetEntity
import { LiveExpenseEntity } from "./live-expense.entity"; // NEW: Import LiveExpenseEntity

@Entity({ name: "wbs_category", schema: "client_template" })
@Unique(["name", "tenant_id"]) // Categories should be unique per tenant
export class WbsCategoryEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "varchar", length: 255 })
  name!: string; // Renamed from description

  @Column({ type: "uuid", nullable: false })
  tenant_id!: string;

  @OneToMany(() => WbsBudgetEntity, (wbsBudget) => wbsBudget.category)
  wbsBudgets!: WbsBudgetEntity[];

  @OneToMany(() => LiveExpenseEntity, (liveExpense) => liveExpense.category)
  liveExpenses!: LiveExpenseEntity[];

  @Column({ type: "timestamptz", default: () => "CURRENT_TIMESTAMP" })
  created_at!: Date;
}
