import { Entity, PrimaryGeneratedColumn, Column, BeforeInsert } from 'typeorm';
import * as bcrypt from 'bcrypt';
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
  
  // Method for comparing passwords securely
  async validatePassword(password: string): Promise<boolean> {
    return bcrypt.compare(password, this.password_hash);
  }

  // Lifecycle hook to hash the password before it is inserted into the database
  @BeforeInsert()
  async hashPassword() {
    if (this.password_hash) {
      const salt = await bcrypt.genSalt();
      this.password_hash = await bcrypt.hash(this.password_hash, salt);
    }
  }
}
