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
import { P2PPurchaseOrderEntity } from "@src/finance-core/entities/p2p-purchase-order.entity";
import { CostCenterEntity } from "@src/finance-core/entities/cost-center.entity";
import { GLAccountEntity } from "@src/finance-core/entities/gl-account.entity";
import { VendorEntity } from "@src/finance-core/entities/vendor.entity";

export enum InvoiceStatus {
  RECEIVED = "RECEIVED",
  UNDER_REVIEW = "UNDER_REVIEW",
  APPROVED = "APPROVED",
  PAID = "PAID",
  REJECTED = "REJECTED",
}

@Entity("p2p_invoice")
export class P2PInvoiceEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Index()
  @Column({ type: "uuid" })
  tenant_id!: string;

  @Column({ type: "varchar", length: 100 })
  invoice_number!: string;

  @Column({ type: "uuid", nullable: true })
  purchase_order_id!: string | null;

  @ManyToOne(() => P2PPurchaseOrderEntity, (po) => po.invoices, {
    nullable: true,
  })
  @JoinColumn({ name: "purchase_order_id" })
  purchaseOrder!: P2PPurchaseOrderEntity;

  @Column({ type: "uuid" })
  cost_center_id!: string;

  @ManyToOne(() => CostCenterEntity)
  @JoinColumn({ name: "cost_center_id" })
  costCenter!: CostCenterEntity;

  @Column({ type: "uuid" })
  gl_account_id!: string;

  @ManyToOne(() => GLAccountEntity)
  @JoinColumn({ name: "gl_account_id" })
  glAccount!: GLAccountEntity;

  @Column({ type: "varchar", length: 255 })
  vendor_name!: string;

  @Column({ type: "uuid", nullable: true })
  vendor_id!: string | null;

  @ManyToOne(() => VendorEntity, { nullable: true })
  @JoinColumn({ name: "vendor_id" })
  vendor?: VendorEntity;

  // Represents ACTUAL SPEND
  @Column({ type: "decimal", precision: 19, scale: 4 })
  amount!: number;

  @Column({ type: "varchar", length: 3, default: "USD" })
  currency!: string;

  @Column({ type: "decimal", precision: 19, scale: 6, default: 1.0 })
  exchange_rate!: number;

  @Column({ type: "decimal", precision: 19, scale: 4, nullable: true })
  base_amount!: number | null;

  @Column({ type: "date" })
  invoice_date!: Date;

  @Column({ type: "date", nullable: true })
  due_date!: Date | null;

  @Column({
    type: "enum",
    enum: InvoiceStatus,
    default: InvoiceStatus.RECEIVED,
  })
  status!: InvoiceStatus;

  @Column({ type: "varchar", length: 2048, nullable: true })
  receipt_url!: string | null;

  // ─── Retention & Withholding (contractor payables) ─────────────────────
  // Retention (retainage) withheld from a contractor invoice until final
  // acceptance, and withholding tax remitted to the authority on the vendor's
  // behalf. Both are percentages of `amount`.
  @Column({ type: "decimal", precision: 5, scale: 2, default: 0 })
  retention_pct!: number;

  @Column({ type: "decimal", precision: 19, scale: 4, default: 0 })
  retention_amount!: number;

  @Column({ type: "decimal", precision: 5, scale: 2, default: 0 })
  wht_pct!: number;

  @Column({ type: "decimal", precision: 19, scale: 4, default: 0 })
  wht_amount!: number;

  // `amount` - `retention_amount` - `wht_amount`: the cash actually payable
  // to the vendor now (retention released later via a separate claim).
  @Column({ type: "decimal", precision: 19, scale: 4, default: 0 })
  net_payable!: number;

  @CreateDateColumn({ type: "timestamptz" })
  created_at!: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  updated_at!: Date;
}
