import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { P2PReceiptEntity } from "./p2p-receipt.entity";
import { P2PPurchaseOrderLineEntity } from "./p2p-purchase-order-line.entity";

/**
 * A received line on a goods-receipt note (GRN). Each line maps back to the PO
 * line it fulfils so partial and multi-line deliveries are tracked precisely.
 */
@Entity("p2p_receipt_line")
@Index(["tenant_id", "receipt_id"])
export class P2PReceiptLineEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Index()
  @Column({ type: "uuid" })
  tenant_id!: string;

  @Column({ type: "uuid" })
  receipt_id!: string;

  @ManyToOne(() => P2PReceiptEntity, (receipt) => receipt.lines, {
    nullable: false,
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "receipt_id" })
  receipt!: P2PReceiptEntity;

  // Nullable for legacy receipts recorded before line-level GRN existed.
  @Column({ type: "uuid", nullable: true })
  purchase_order_line_id!: string | null;

  @ManyToOne(() => P2PPurchaseOrderLineEntity, { nullable: true })
  @JoinColumn({ name: "purchase_order_line_id" })
  purchaseOrderLine?: P2PPurchaseOrderLineEntity;

  @Column({ type: "decimal", precision: 19, scale: 4, default: 1 })
  quantity!: number;

  @Column({ type: "decimal", precision: 19, scale: 4 })
  unit_amount!: number;

  @Column({ type: "decimal", precision: 19, scale: 4 })
  line_amount!: number;

  @CreateDateColumn({ type: "timestamptz" })
  created_at!: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  updated_at!: Date;
}
