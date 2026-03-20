import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

export enum AiInteractionType {
  CHAT = 'chat',
  ANALYSIS = 'analysis',
  FORECAST = 'forecast',
  REPORT = 'report',
  FORM_FILL = 'form_fill',
}

@Entity({ name: 'ai_audit_logs', schema: 'public' })
export class AiAuditLogEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ type: 'uuid' })
  tenant_id!: string;

  @Index()
  @Column({ type: 'uuid', nullable: true })
  user_id!: string;

  @Column({
    type: 'enum',
    enum: AiInteractionType,
  })
  interaction_type!: AiInteractionType;

  @Column({ type: 'text' })
  user_message_sanitized!: string;

  @Column({ type: 'text', nullable: true })
  ai_response_sanitized!: string;

  @Column({ type: 'boolean', default: false })
  was_blocked!: boolean;

  @Column({ type: 'varchar', nullable: true })
  block_reason!: string;

  @Column({ type: 'boolean', default: false })
  circuit_tripped!: boolean;

  @Column({ type: 'int', nullable: true })
  latency_ms!: number;

  @CreateDateColumn()
  created_at!: Date;
}
