import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { SubscriptionEntity } from "./subscription.entity";
import { InvoiceStatus } from "@shared/types";

@Entity("billing_invoices")
export class BillingInvoiceEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "uuid" })
  tenant_id!: string;

  @Column({ type: "uuid" })
  subscription_id!: string;

  @ManyToOne(() => SubscriptionEntity)
  @JoinColumn({ name: "subscription_id" })
  subscription!: SubscriptionEntity;

  // e.g., 'INV-A1B2C3'
  @Column({ type: "varchar", length: 50, unique: true })
  invoice_number!: string;

  @Column({ type: "decimal", precision: 12, scale: 2 })
  amount_usd!: number;

  @Column({ type: "enum", enum: InvoiceStatus, default: InvoiceStatus.Pending })
  status!: InvoiceStatus;

  @Column({ type: "varchar", length: 255, nullable: true })
  pdf_url!: string | null;

  @Column({ type: "timestamptz" })
  due_date!: Date;

  @Column({ type: "timestamptz", nullable: true })
  paid_at!: Date | null;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}
