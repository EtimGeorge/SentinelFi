import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index, ManyToOne, JoinColumn, OneToMany } from "typeorm";
import { P2PRequisitionEntity } from "@src/finance-core/entities/p2p-requisition.entity";
import { P2PInvoiceEntity } from "@src/finance-core/entities/p2p-invoice.entity";

export enum POStatus {
  ISSUED = "ISSUED",
  PARTIALLY_FULFILLED = "PARTIALLY_FULFILLED",
  FULFILLED = "FULFILLED",
  CANCELLED = "CANCELLED"
}

@Entity("p2p_purchase_order")
export class P2PPurchaseOrderEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Index()
  @Column({ type: "uuid" })
  tenant_id!: string;

  @Column({ type: "varchar", length: 50, unique: true })
  po_number!: string;

  @Column({ type: "uuid" })
  requisition_id!: string;

  @ManyToOne(() => P2PRequisitionEntity, req => req.purchaseOrders)
  @JoinColumn({ name: "requisition_id" })
  requisition!: P2PRequisitionEntity;

  @Column({ type: "varchar", length: 255 })
  vendor_name!: string;

  // Represents COMMITTED SPEND
  @Column({ type: "decimal", precision: 19, scale: 4 })
  committed_amount!: number;

  @Column({ type: "varchar", length: 3, default: 'USD' })
  currency!: string;

  @Column({ type: "decimal", precision: 19, scale: 6, default: 1.0 })
  exchange_rate!: number;

  @Column({ type: "decimal", precision: 19, scale: 4, nullable: true })
  committed_base_amount!: number | null;

  @Column({ type: "enum", enum: POStatus, default: POStatus.ISSUED })
  status!: POStatus;

  @OneToMany(() => P2PInvoiceEntity, inv => inv.purchaseOrder)
  invoices!: P2PInvoiceEntity[];

  @CreateDateColumn({ type: "timestamptz" })
  created_at!: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  updated_at!: Date;
}
