import { Entity, PrimaryGeneratedColumn, Column, Unique, OneToMany } from "typeorm";
import { UserEntity } from "../../src/auth/user.entity"; // Relative path to UserEntity

@Entity({ name: "tenants", schema: "public" }) // Master data, resides in public schema
@Unique(["name"])
@Unique(["schema_name"])
export class TenantEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ length: 255, unique: true })
  name!: string; // Unique identifier for the tenant/client

  @Column({ length: 255 })
  project_name!: string; // Human-readable project name

  @Column({ length: 63, unique: true }) // Max 63 chars for PostgreSQL schema name
  schema_name!: string;

  @Column({ type: "timestamptz", default: () => "CURRENT_TIMESTAMP" })
  created_at!: Date;

  @OneToMany(() => UserEntity, (user) => user.tenant) // Revert to direct reference in function
  users!: UserEntity[];
}
