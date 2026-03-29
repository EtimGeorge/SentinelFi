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
import { CostCenterEntity } from "@src/finance-core/entities/cost-center.entity";
import { GLAccountEntity } from "@src/finance-core/entities/gl-account.entity";
import { UserEntity } from "@src/auth/user.entity";
import { P2PPurchaseOrderEntity } from "@src/finance-core/entities/p2p-purchase-order.entity";

export enum DocumentStatus {
  DRAFT = "DRAFT",
  PENDING_APPROVAL = "PENDING_APPROVAL",
  APPROVED = "APPROVED",
  REJECTED = "REJECTED",
  CANCELLED = "CANCELLED",
}

@Entity("p2p_requisition")
export class P2PRequisitionEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Index()
  @Column({ type: "uuid" })
  tenant_id!: string;

  @Column({ type: "varchar", length: 50, unique: true })
  requisition_number!: string;

  @Column({ type: "uuid" })
  requester_id!: string;

  @ManyToOne("UserEntity")
  @JoinColumn({ name: "requester_id" })
  requester!: UserEntity;

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

  @Column({ type: "text" })
  description!: string;

  @Column({ type: "varchar", length: 255, nullable: true })
  vendor_name!: string | null;

  @Column({ type: "decimal", precision: 19, scale: 4 })
  estimated_amount!: number;

  @Column({ type: "date", nullable: true })
  required_by_date!: Date | null;

  @Column({ type: "enum", enum: DocumentStatus, default: DocumentStatus.DRAFT })
  status!: DocumentStatus;

  @Column({ type: "varchar", length: 3, default: "USD" })
  currency!: string;

  @Column({ type: "decimal", precision: 19, scale: 6, default: 1.0 })
  exchange_rate!: number;

  @Column({ type: "decimal", precision: 19, scale: 4, nullable: true })
  base_amount!: number | null;

  @OneToMany(() => P2PPurchaseOrderEntity, (po) => po.requisition)
  purchaseOrders!: P2PPurchaseOrderEntity[];

  @CreateDateColumn({ type: "timestamptz" })
  created_at!: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  updated_at!: Date;
}
