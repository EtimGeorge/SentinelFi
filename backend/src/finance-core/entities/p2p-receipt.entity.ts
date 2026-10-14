import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from "typeorm";
import { P2PPurchaseOrderEntity } from "./p2p-purchase-order.entity";
import { P2PReceiptLineEntity } from "./p2p-receipt-line.entity";

/**
 * Phase 4 — 3-Way Match (4.8): PO + Receipt + Invoice.
 *
 * Records goods/services received against a purchase order so that invoice
 * settlement can be validated against the physical fulfilment trail.
 */
@Entity("p2p_receipt")
@Index(["tenant_id", "purchase_order_id"])
export class P2PReceiptEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Index()
  @Column({ type: "uuid" })
  tenant_id!: string;

  @Column({ type: "uuid" })
  purchase_order_id!: string;

  @ManyToOne(() => P2PPurchaseOrderEntity, (po) => po.receipts, {
    nullable: false,
  })
  @JoinColumn({ name: "purchase_order_id" })
  purchaseOrder!: P2PPurchaseOrderEntity;

  @Column({ type: "uuid" })
  received_by_user_id!: string;

  @Column({ type: "date" })
  received_date!: Date;

  @Column({ type: "decimal", precision: 19, scale: 4, default: 1 })
  quantity!: number;

  @Column({ type: "decimal", precision: 19, scale: 4 })
  unit_amount!: number;

  @Column({ type: "decimal", precision: 19, scale: 4 })
  amount!: number;

  @Column({ type: "varchar", length: 3, default: "USD" })
  currency!: string;

  @Column({ type: "decimal", precision: 19, scale: 6, default: 1.0 })
  exchange_rate!: number;

  // Base-currency (USD) normalised amount: amount * exchange_rate.
  @Column({ type: "decimal", precision: 19, scale: 4, default: 0 })
  base_amount!: number;

  @Column({ type: "text", nullable: true })
  notes!: string | null;

  @OneToMany(() => P2PReceiptLineEntity, (line) => line.receipt)
  lines!: P2PReceiptLineEntity[];

  @CreateDateColumn({ type: "timestamptz" })
  created_at!: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  updated_at!: Date;
}