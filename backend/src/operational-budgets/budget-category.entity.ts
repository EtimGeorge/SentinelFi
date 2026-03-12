import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from "typeorm";

export enum BudgetCategoryType {
  CAPEX = "CAPEX",
  OPEX = "OPEX",
}

@Entity("budget_category")
@Index(["tenant_id", "name"], { unique: false }) // Allow same name across tenants, but maybe unique per tenant
export class BudgetCategoryEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  // Null for System Default categories accessible to ALL tenants
  @Column({ type: "uuid", nullable: true })
  tenant_id!: string | null;

  @Column({ type: "varchar", length: 255 })
  name!: string;

  @Column({ type: "text", nullable: true })
  description!: string | null;

  @Column({
    type: "enum",
    enum: BudgetCategoryType,
    default: BudgetCategoryType.OPEX,
  })
  type!: BudgetCategoryType;

  @Column({ type: "boolean", default: false })
  is_system_default!: boolean;

  @Column({ type: "boolean", default: true })
  is_active!: boolean;

  @CreateDateColumn({ type: "timestamptz" })
  created_at!: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  updated_at!: Date;
}
