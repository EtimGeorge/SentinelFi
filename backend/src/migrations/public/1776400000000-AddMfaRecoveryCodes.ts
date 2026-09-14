import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Phase 3: SuperAdmin TOTP MFA backup.
 * - User: mfa_recovery_code_hashes (text[] — 5 bcrypt-hashed one-time codes)
 * - User: totp_pending_secret (varchar — secret staged during enrollment until confirmed)
 */
export class AddMfaRecoveryCodes1776400000000 implements MigrationInterface {
  name = "AddMfaRecoveryCodes1776400000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasColumn("user", "mfa_recovery_code_hashes"))) {
      await queryRunner.query(
        `ALTER TABLE "user" ADD "mfa_recovery_code_hashes" text[]`,
      );
    }
    if (!(await queryRunner.hasColumn("user", "totp_pending_secret"))) {
      await queryRunner.query(
        `ALTER TABLE "user" ADD "totp_pending_secret" character varying`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user" DROP COLUMN "mfa_recovery_code_hashes"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user" DROP COLUMN "totp_pending_secret"`,
    );
  }
}