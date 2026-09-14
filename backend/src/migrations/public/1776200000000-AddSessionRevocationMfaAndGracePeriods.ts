import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Phase 0 foundation:
 * - User: token_version + password_changed_at (session revocation)
 * - User: mfa_enabled + totp_secret (TOTP MFA)
 * - Tenant: grace_period_until (per-tenant payment grace)
 * - Settings: gracePeriodDays + archiveRetentionDays
 */
export class AddSessionRevocationMfaAndGracePeriods1776200000000
  implements MigrationInterface
{
  name = "AddSessionRevocationMfaAndGracePeriods1776200000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasColumn("user", "token_version"))) {
      await queryRunner.query(
        `ALTER TABLE "user" ADD "token_version" integer NOT NULL DEFAULT 0`,
      );
    }
    if (!(await queryRunner.hasColumn("user", "password_changed_at"))) {
      await queryRunner.query(
        `ALTER TABLE "user" ADD "password_changed_at" TIMESTAMP WITH TIME ZONE`,
      );
    }
    if (!(await queryRunner.hasColumn("user", "mfa_enabled"))) {
      await queryRunner.query(
        `ALTER TABLE "user" ADD "mfa_enabled" boolean NOT NULL DEFAULT false`,
      );
    }
    if (!(await queryRunner.hasColumn("user", "totp_secret"))) {
      await queryRunner.query(
        `ALTER TABLE "user" ADD "totp_secret" character varying`,
      );
    }
    if (!(await queryRunner.hasColumn("tenants", "grace_period_until"))) {
      await queryRunner.query(
        `ALTER TABLE "tenants" ADD "grace_period_until" TIMESTAMP WITH TIME ZONE`,
      );
    }
    if (!(await queryRunner.hasColumn("settings", "gracePeriodDays"))) {
      await queryRunner.query(
        `ALTER TABLE "settings" ADD "gracePeriodDays" integer NOT NULL DEFAULT 0`,
      );
    }
    if (!(await queryRunner.hasColumn("settings", "archiveRetentionDays"))) {
      await queryRunner.query(
        `ALTER TABLE "settings" ADD "archiveRetentionDays" integer NOT NULL DEFAULT 30`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user" DROP COLUMN "token_version"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user" DROP COLUMN "password_changed_at"`,
    );
    await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "mfa_enabled"`);
    await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "totp_secret"`);
    await queryRunner.query(
      `ALTER TABLE "tenants" DROP COLUMN "grace_period_until"`,
    );
    await queryRunner.query(`ALTER TABLE "settings" DROP COLUMN "gracePeriodDays"`);
    await queryRunner.query(
      `ALTER TABLE "settings" DROP COLUMN "archiveRetentionDays"`,
    );
  }
}