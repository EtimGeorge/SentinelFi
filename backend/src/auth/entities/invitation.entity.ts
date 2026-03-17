import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { TenantEntity } from '../../tenants/tenant.entity';
import { Role } from '@shared/types/role.enum';

@Entity('invitations')
export class InvitationEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true })
  token!: string;

  @Column()
  email!: string;

  @Column({ nullable: true })
  first_name!: string;

  @Column({ nullable: true })
  last_name!: string;

  @Column({
    type: 'enum',
    enum: Role,
    default: Role.AssignedProjectUser,
  })
  role!: Role;

  @Column({ nullable: true })
  tenant_id!: string;

  @ManyToOne(() => TenantEntity)
  @JoinColumn({ name: 'tenant_id' })
  tenant!: TenantEntity;

  @Column({ default: false })
  is_consumed!: boolean;

  @Column()
  expires_at!: Date;

  @CreateDateColumn()
  created_at!: Date;
}
