import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index, ManyToOne, JoinColumn } from "typeorm";
import { AccountGroupEntity } from "./account-group.entity";

@Entity("gl_account")
@Index(["tenant_id", "code"], { unique: true })
export class GLAccountEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Index()
  @Column({ type: "uuid" })
  tenant_id!: string;

  @Column({ type: "varchar", length: 150 })
  name!: string; // e.g., "Software Subscriptions"

  @Column({ type: "varchar", length: 20 })
  code!: string; // e.g., "5130"

  @Column({ type: "text", nullable: true })
  description!: string | null;

  @Column({ type: "boolean", default: true })
  is_active!: boolean;

  @Column({ type: "uuid" })
  account_group_id!: string;

  @ManyToOne(() => AccountGroupEntity, group => group.glAccounts)
  @JoinColumn({ name: "account_group_id" })
  accountGroup!: AccountGroupEntity;

  @CreateDateColumn({ type: "timestamptz" })
  created_at!: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  updated_at!: Date;
}
