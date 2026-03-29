import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from "typeorm";

@Entity("processed_webhooks")
export class ProcessedWebhookEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Index({ unique: true })
  @Column()
  gateway_event_id!: string; // The unique ID from Paystack, PayPal, etc.

  @Column()
  provider!: string; // 'paystack', 'paypal', 'ivorypay'

  @CreateDateColumn()
  processed_at!: Date;

  @Column({ type: "jsonb", nullable: true })
  payload!: any;
}
