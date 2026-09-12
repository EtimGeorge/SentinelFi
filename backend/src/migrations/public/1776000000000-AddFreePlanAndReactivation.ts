import { MigrationInterface, QueryRunner } from "typeorm";

export class AddFreePlanAndReactivation1776000000000 implements MigrationInterface {
  name = "AddFreePlanAndReactivation1776000000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Free-tier caps + ad-supported fields
    await queryRunner.query(
      `ALTER TABLE "subscriptions" ADD "max_tasks_per_day" integer`,
    );
    await queryRunner.query(
      `ALTER TABLE "subscriptions" ADD "has_ads" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `ALTER TABLE "subscriptions" ADD "ad_unlock_credits" integer NOT NULL DEFAULT 0`,
    );
    await queryRunner.query(
      `ALTER TABLE "subscriptions" ADD "ad_unlock_date" character varying(10)`,
    );

    // New enum values: status 'paused', billing_cycle 'free'
    await queryRunner.query(
      `ALTER TYPE "public"."subscriptions_status_enum" ADD VALUE IF NOT EXISTS 'paused'`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."subscriptions_billing_cycle_enum" ADD VALUE IF NOT EXISTS 'free'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "subscriptions" DROP COLUMN "ad_unlock_date"`,
    );
    await queryRunner.query(
      `ALTER TABLE "subscriptions" DROP COLUMN "ad_unlock_credits"`,
    );
    await queryRunner.query(`ALTER TABLE "subscriptions" DROP COLUMN "has_ads"`);
    await queryRunner.query(
      `ALTER TABLE "subscriptions" DROP COLUMN "max_tasks_per_day"`,
    );
    // Note: Postgres cannot remove enum values; requires type recreation. Skipped.
  }
}
