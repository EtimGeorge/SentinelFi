import { MigrationInterface, QueryRunner } from "typeorm";

export class AddClientEntity1770162114192 implements MigrationInterface {
  name = "AddClientEntity1770162114192";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Fix for public schema indexes
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."IDX_CURRENCY_RATE_UNIQUE"`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_2a2461419b5ee6bdb2a8c8f03b" ON "currency_exchange_rates" ("from_currency", "to_currency", "last_updated") `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."IDX_2a2461419b5ee6bdb2a8c8f03b"`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_CURRENCY_RATE_UNIQUE" ON "currency_exchange_rates" ("from_currency", "last_updated", "to_currency") `,
    );
  }
}
