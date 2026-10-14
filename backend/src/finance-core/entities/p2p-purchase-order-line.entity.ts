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
import { P2PPurchaseOrderEntity } from "./p2p-purchase-order.entity";

/**
 * A single ordered line on a purchase order. POs created from a requisition
 * get one synthesized line by default; callers may supply explicit lines.
 * `received_quantity` is the running total accepted against the line across all
 * receipts, enabling line-level goods-receipt validation and 3-way match.
 */
@Entity("p2p_purchase_order_line")
@Index(["tenant_id", "purchase_order_id"])
@Index(["purchase_order_id", "line_number"], { unique: true })
export class P2PPurchaseOrderLineEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Index()
  @Column({ type: "uuid" })
  tenant_id!: string;

  @Column({ type: "uuid" })
  purchase_order_id!: string;

  @ManyToOne(() => P2PPurchaseOrderEntity, (po) => po.lines, {
    nullable: false,
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "purchase_order_id" })
  purchaseOrder!: P2PPurchaseOrderEntity;

  @Column({ type: "integer" })
  line_number!: number;

  @Column({ type: "varchar", length: 500 })
  description!: string;

  @Column({ type: "decimal", precision: 19, scale: 4, default: 1 })
  quantity!: number;

  @Column({ type: "decimal", precision: 19, scale: 4 })
  unit_amount!: number;

  @Column({ type: "decimal", precision: 19, scale: 4 })
  line_amount!: number;

  @Column({ type: "decimal", precision: 19, scale: 4, default: 0 })
  received_quantity!: number;

  @Column({ type: "uuid", nullable: true })
  gl_account_id!: string | null;

  @Column({ type: "uuid", nullable: true })
  cost_center_id!: string | null;

  @CreateDateColumn({ type: "timestamptz" })
  created_at!: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  updated_at!: Date;
}
