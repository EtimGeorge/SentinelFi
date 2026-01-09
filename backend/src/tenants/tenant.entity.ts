import { Entity, PrimaryGeneratedColumn, Column, Unique, OneToMany } from "typeorm";
import { UserEntity } from "../../src/auth/user.entity"; // Relative path to UserEntity

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

  @Column({ type: "timestamptz", default: () => "CURRENT_TIMESTAMP" })
  created_at!: Date;

  @OneToMany(() => UserEntity, (user) => user.tenant) // Revert to direct reference in function
  users!: UserEntity[];
}