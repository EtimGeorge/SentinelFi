import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index, ManyToOne, JoinColumn, OneToMany } from "typeorm";
import { AccountClassEntity } from "./account-class.entity";
import { GLAccountEntity } from "./gl-account.entity";

@Entity("account_group")
@Index(["tenant_id", "code"], { unique: true })
export class AccountGroupEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Index()
  @Column({ type: "uuid" })
  tenant_id!: string;

  @Column({ type: "varchar", length: 100 })
  name!: string; // e.g., "Payroll & Benefits"

  @Column({ type: "varchar", length: 20 })
  code!: string; // e.g., "5100"

  @Column({ type: "uuid" })
  account_class_id!: string;

  @ManyToOne(() => AccountClassEntity, accClass => accClass.accountGroups)
  @JoinColumn({ name: "account_class_id" })
  accountClass!: AccountClassEntity;

  @OneToMany(() => GLAccountEntity, account => account.accountGroup)
  glAccounts!: GLAccountEntity[];

  @CreateDateColumn({ type: "timestamptz" })
  created_at!: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  updated_at!: Date;
}
