import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';
import { Role } from './enums/role.enum'; // Enum to be created next

@Entity({ name: 'user', schema: 'public' }) // NOTE: This entity lives in the MASTER DB/Schema, not a tenant schema
export class UserEntity {

  // Primary Key (Used as the user_id in LiveExpense table)
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true })
  email!: string;

  @Column({ select: false }) // CRITICAL: Never retrieve the password hash by default
  password_hash!: string;

  @Column({
    type: 'enum',
    enum: Role,
    default: Role.AssignedProjectUser, // Default role for accountability (Crucial Constraint)
  })
  role!: Role;

  @Column({ default: true })
  is_active!: boolean;

  @Column({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  created_at!: Date;
  
}
