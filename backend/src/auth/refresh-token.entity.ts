import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from "typeorm";

/**
 * Refresh token store for silent session renewal (AUTH-P0-03).
 *
 * Design:
 * - The raw token NEVER touches the database — only its SHA-256 hash is stored.
 * - Tokens are rotated on every use: the consumed token records `consumed_at`
 *   and links to its replacement via `replaced_by_id`.
 * - All tokens issued from one login belong to the same `family_id`. Presenting
 *   a consumed token (theft/replay signature) revokes the ENTIRE family —
 *   the industry-standard reuse-detection defense.
 * - Rows are revocable per user (password change, admin action) and are
 *   invalidated together with `token_version` bumps.
 */
@Entity("refresh_token")
@Index("IDX_refresh_token_user", ["user_id"])
@Index("IDX_refresh_token_family", ["family_id"])
@Index("IDX_refresh_token_expiry", ["expires_at"])
export class RefreshTokenEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "uuid" })
  user_id!: string;

  /** SHA-256 hex digest of the raw token (64 chars). Unique. */
  @Column({ type: "varchar", length: 64, unique: true })
  token_hash!: string;

  /** Rotation family: all descendants of one login share this id. */
  @Column({ type: "uuid" })
  family_id!: string;

  /** Absolute family ceiling (Flaw G): every child expires no later than this,
   * no matter how often rotation slides the per-token window. */
  @Column({ type: "timestamptz" })
  family_expires_at!: Date;

  @Column({ type: "timestamptz" })
  expires_at!: Date;

  /** Set when the token was exchanged (rotation). Replay of a consumed token triggers family revocation. */
  @Column({ type: "timestamptz", nullable: true })
  consumed_at!: Date | null;

  @Column({ type: "timestamptz", nullable: true })
  revoked_at!: Date | null;

  @Column({ type: "uuid", nullable: true })
  replaced_by_id!: string | null;

  @Column({ type: "varchar", length: 64, nullable: true })
  ip!: string | null;

  @Column({ type: "varchar", length: 255, nullable: true })
  user_agent!: string | null;

  @CreateDateColumn({ type: "timestamptz" })
  created_at!: Date;
}