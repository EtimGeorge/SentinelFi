import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  Unique,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { WbsBudgetEntity } from './wbs-budget.entity';
import { LiveExpenseEntity } from './live-expense.entity';

/**
 * WBS Category — a tenant-scoped cost-type label.
 * Categories classify the TYPE of cost (Labor, Materials, Equipment, etc.).
 * They have NO amounts. Amounts live on the WBS budget items.
 * Categories are reusable across all projects within a tenant.
 * Default categories are seeded on tenant creation.
 */
@Entity('wbs_category')
@Unique(['name', 'tenant_id'])
export class WbsCategoryEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  code!: string | null;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ type: 'varchar', length: 7, nullable: true })
  color!: string | null;

  @Column({ type: 'int', default: 0 })
  sort_order!: number;

  @Column({ type: 'uuid', nullable: false })
  tenant_id!: string;

  @Column({ type: 'boolean', default: true })
  is_active!: boolean;

  @Column({ type: 'uuid', nullable: true })
  parent_id!: string | null;

  @ManyToOne(() => WbsCategoryEntity, (category) => category.children, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'parent_id' })
  parent!: WbsCategoryEntity | null;

  @OneToMany(() => WbsCategoryEntity, (category) => category.parent)
  children!: WbsCategoryEntity[];

  @OneToMany(() => WbsBudgetEntity, (wbsBudget) => wbsBudget.category)
  wbsBudgets!: WbsBudgetEntity[];

  @OneToMany(() => LiveExpenseEntity, (liveExpense) => liveExpense.category)
  liveExpenses!: LiveExpenseEntity[];

  @Column({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  created_at!: Date;
}
