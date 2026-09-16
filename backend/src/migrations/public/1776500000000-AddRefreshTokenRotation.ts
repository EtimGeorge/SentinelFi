import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Phase 4: Refresh token rotation (AUTH-P0-03).
 * - public.refresh_token: hashed refresh tokens with rotation families,
 *   consumption markers and revocation for reuse detection.
 * Phase 4 fix (Flaw G): family_expires_at absolute ceiling + backfill for
 * families issued before the column existed.
 */
export class AddRefreshTokenRotation1776500000000
  implements MigrationInterface
{
  name = "AddRefreshTokenRotation1776500000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasTable("refresh_token"))) {
      await queryRunner.query(
        `CREATE TABLE "refresh_token" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid NOT NULL, "token_hash" character varying(64) NOT NULL, "family_id" uuid NOT NULL, "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL, "family_expires_at" TIMESTAMP WITH TIME ZONE NOT NULL, "consumed_at" TIMESTAMP WITH TIME ZONE, "revoked_at" TIMESTAMP WITH TIME ZONE, "replaced_by_id" uuid, "ip" character varying(64), "user_agent" character varying(255), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_refresh_token" PRIMARY KEY ("id"))`,
      );
    }
    // Flaw G backfill: tables created before family_expires_at existed get the
    // column (nullable-tolerant) and inherit each row's own expiry as the
    // family ceiling — existing sessions keep working, new rotations enforce it.
    if (!(await queryRunner.hasColumn("refresh_token", "family_expires_at"))) {
      await queryRunner.query(
        `ALTER TABLE "refresh_token" ADD "family_expires_at" TIMESTAMP WITH TIME ZONE`,
      );
      await queryRunner.query(
        `UPDATE "refresh_token" SET "family_expires_at" = "expires_at" WHERE "family_expires_at" IS NULL`,
      );
      await queryRunner.query(
        `ALTER TABLE "refresh_token" ALTER COLUMN "family_expires_at" SET NOT NULL`,
      );
    }
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "UQ_refresh_token_hash" ON "refresh_token" ("token_hash")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_refresh_token_user" ON "refresh_token" ("user_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_refresh_token_family" ON "refresh_token" ("family_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_refresh_token_expiry" ON "refresh_token" ("expires_at")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "refresh_token"`);
  }
}