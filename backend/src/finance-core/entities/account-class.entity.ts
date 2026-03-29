import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  OneToMany,
} from "typeorm";
import { AccountGroupEntity } from "./account-group.entity";

export enum AccountClassType {
  ASSET = "ASSET",
  LIABILITY = "LIABILITY",
  EQUITY = "EQUITY",
  REVENUE = "REVENUE",
  EXPENSE = "EXPENSE",
}

@Entity("account_class")
@Index(["tenant_id", "code"], { unique: true })
export class AccountClassEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Index()
  @Column({ type: "uuid" })
  tenant_id!: string;

  @Column({ type: "varchar", length: 100 })
  name!: string; // e.g., "Operating Expenses"

  @Column({ type: "varchar", length: 20 })
  code!: string; // e.g., "5000"

  @Column({ type: "enum", enum: AccountClassType })
  base_type!: AccountClassType;

  @OneToMany(() => AccountGroupEntity, (group) => group.accountClass)
  accountGroups!: AccountGroupEntity[];

  @CreateDateColumn({ type: "timestamptz" })
  created_at!: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  updated_at!: Date;
}
