import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';

/**
 * Stores hashed password-reset tokens.
 * The plaintext token is emailed to the user; only the SHA-256 hash is persisted
 * so that a database leak cannot be used to reset accounts.
 */
@Entity('password_reset_tokens')
export class PasswordResetEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ unique: true })
  token_hash!: string; // SHA-256 hash of the reset token

  @Column()
  user_id!: string; // FK → users.id (not enforced to avoid circular deps)

  @Column()
  expires_at!: Date;

  @Column({ default: false })
  is_consumed!: boolean;

  @CreateDateColumn()
  created_at!: Date;
}
