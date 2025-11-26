import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, OneToMany } from 'typeorm';

@Entity({ name: 'wbs_budget', schema: 'client_template' })
export class WbsBudgetEntity {
  
  // ADDED ! NON-NULL ASSERTION OPERATOR
  @PrimaryGeneratedColumn('uuid')
  wbs_id!: string;

  // ADDED ! NON-NULL ASSERTION OPERATOR
  @Column({ type: 'uuid', nullable: true })
  parent_wbs_id!: string | null;

  // ADDED ! NON-NULL ASSERTION OPERATOR
  @ManyToOne(() => WbsBudgetEntity, (wbs) => wbs.children)
  @JoinColumn({ name: 'parent_wbs_id' })
  parent!: WbsBudgetEntity;

  // ADDED ! NON-NULL ASSERTION OPERATOR
  @OneToMany(() => WbsBudgetEntity, (wbs) => wbs.parent)
  children!: WbsBudgetEntity[];

  // WBS Identifiers (ADDED ! NON-NULL ASSERTION OPERATOR to all)
  @Column({ unique: true, length: 50 })
  wbs_code!: string;

  @Column({ type: 'text' })
  description!: string;

  // Financial Fields
  @Column({ type: 'numeric', precision: 19, scale: 4 })
  unit_cost_budgeted!: number;

  @Column({ type: 'numeric', precision: 19, scale: 4 })
  quantity_budgeted!: number;

  @Column({ type: 'int', nullable: true })
  duration_days_budgeted!: number | null;
  
  @Column({ type: 'numeric', precision: 19, scale: 4 })
  total_cost_budgeted!: number;

  // Status/Audit Fields
  @Column({ type: 'boolean', default: false })
  is_approved!: boolean;

  @Column({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  created_at!: Date;
}