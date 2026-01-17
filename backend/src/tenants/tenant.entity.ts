import "reflect-metadata";
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Unique,
  OneToMany,
} from "typeorm";
import type { UserEntity } from "../../src/auth/user.entity";

@Entity({ name: "tenants", schema: "public" }) // Master data, resides in public schema
@Unique(["name"])
@Unique(["schema_name"])
export class TenantEntity {
  @PrimaryGeneratedColumn("uuid")
  tenant_id!: string; // Renamed from 'id' to 'tenant_id' for clarity and consistency

  @Column({ length: 255, unique: true })
  name!: string; // Unique identifier for the tenant/client (e.g., Company Name)

  @Column({ length: 63, unique: true }) // Max 63 chars for PostgreSQL schema name
  schema_name!: string;

  @Column({ type: "boolean", default: true }) // NEW: Added for tenant lifecycle management
  is_active!: boolean;

  @Column({ type: "varchar", length: 50, default: "basic" })
  plan!: string;

  @Column({ type: "timestamptz", default: () => "CURRENT_TIMESTAMP" })
  created_at!: Date;

  @Column({
    type: "timestamptz",
    default: () => "CURRENT_TIMESTAMP",
    onUpdate: "CURRENT_TIMESTAMP",
  })
  updated_at!: Date;

  @OneToMany("UserEntity", "tenant")
  users!: UserEntity[];
}