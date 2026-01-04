import { Entity, PrimaryGeneratedColumn, Column, Unique } from "typeorm";
import { IWbsCategoryEntity } from "../../../shared/types/wbs"; // NEW: Import shared interface

@Entity({ name: "wbs_category", schema: "public" }) // Master data, resides in public schema
@Unique(["code"])
export class WbsCategoryEntity implements IWbsCategoryEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  // The WBS Code for Level 1 (e.g., '1.0', '2.0')
  @Column({ length: 10, unique: true })
  code!: string;

  // The human-readable name (e.g., 'HUMAN RESOURCES', 'MATERIAL REQUIREMENTS')
  @Column({ length: 255 })
  description!: string;

  @Column({ type: "timestamptz", default: () => "CURRENT_TIMESTAMP" })
  created_at!: Date;
}
