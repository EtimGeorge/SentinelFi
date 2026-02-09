import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  OneToMany,
  Unique,
} from 'typeorm';
import { WbsBudgetEntity } from './wbs-budget.entity';
import { LiveExpenseEntity } from './live-expense.entity';

@Entity('wbs_category')
@Unique(['name', 'tenant_id'])
export class WbsCategoryEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'uuid', nullable: false })
  tenant_id!: string;

  @OneToMany(() => WbsBudgetEntity, (wbsBudget) => wbsBudget.category)
  wbsBudgets!: WbsBudgetEntity[];

  @OneToMany(() => LiveExpenseEntity, (liveExpense) => liveExpense.category)
  liveExpenses!: LiveExpenseEntity[];

  @Column({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  created_at!: Date;
}

