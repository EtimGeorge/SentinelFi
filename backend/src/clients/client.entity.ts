import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany, JoinColumn, Index, Unique } from 'typeorm';
import { TenantEntity } from '../tenants/tenant.entity';
import { ProjectEntity } from '../projects/project.entity';

@Entity('clients')
@Index(['tenant_id']) // Performance optimization for tenant-scoped queries
@Unique('unique_client_name_per_tenant', ['tenant_id', 'name']) // Prevent duplicate client names within same tenant
export class ClientEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tenant_id' })
  tenant_id!: string;

  @ManyToOne(() => TenantEntity)
  @JoinColumn({ name: 'tenant_id' })
  tenant!: TenantEntity;

  @Column()
  name!: string;

  @Column({ nullable: true })
  email!: string;

  @Column({ nullable: true })
  phone!: string;

  @Column({ type: 'text', nullable: true })
  address!: string;

  @Column({ nullable: true })
  industry!: string;

  @Column({ default: true })
  is_active!: boolean;

  @OneToMany(() => ProjectEntity, (project) => project.client)
  projects!: ProjectEntity[];

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;

  @Column({ type: 'timestamp', nullable: true, comment: 'Soft delete timestamp for audit trail' })
  deleted_at?: Date;
}
