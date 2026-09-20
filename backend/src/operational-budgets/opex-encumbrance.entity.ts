import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from "typeorm";
import {
  EncumbranceStatus,
  EncumbranceSourceType,
} from "@shared/types";

/**
 * Phase 4 — Encumbrance & Control (4.1).
 *
 * Single append-only lifecycle ledger for budget holds across both OPEX
 * expenses and the procure-to-pay pipeline:
 *   RESERVED   (soft-hold: pending expense / requisition)
 *   FIRM       (committed: approved expense / issued purchase order)
 *   LIQUIDATED (realised: settled as actual spend)
 *   RELEASED   (cancelled: rejected, reversed, deleted)
 */
@Entity("opex_encumbrance")
@Index(["tenant_id", "source_type", "source_id"])
@Index(["tenant_id", "operational_budget_id"])
export class OpexEncumbranceEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Index()
  @Column({ type: "uuid" })
  tenant_id!: string;

  @Column({
    type: "enum",
    enum: EncumbranceSourceType,
    enumName: "opex_encumbrance_source_type_enum",
  })
  source_type!: EncumbranceSourceType;

  @Column({ type: "uuid" })
  source_id!: string;

  @Column({
    type: "enum",
    enum: EncumbranceStatus,
    enumName: "opex_encumbrance_status_enum",
    default: EncumbranceStatus.RESERVED,
  })
  status!: EncumbranceStatus;

  @Column({ type: "decimal", precision: 19, scale: 4, default: 0 })
  amount!: number;

  @Column({ type: "uuid", nullable: true })
  operational_budget_id!: string | null;

  @Column({ type: "uuid", nullable: true })
  operational_budget_category_id!: string | null;

  @Column({ type: "text", nullable: true })
  notes!: string | null;

  @CreateDateColumn({ type: "timestamptz" })
  created_at!: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  updated_at!: Date;
}