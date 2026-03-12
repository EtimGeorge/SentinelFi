import { MigrationInterface, QueryRunner } from "typeorm";

export class AddCurrencyColumnsToEntities1738455000000 implements MigrationInterface {
    name = 'AddCurrencyColumnsToEntities1738455000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Add default_currency_code to tenants table
        await queryRunner.query(`ALTER TABLE "public"."tenants" ADD "default_currency_code" character varying(3) NOT NULL DEFAULT 'USD'`);

        // Add display_currency_code to user table
        await queryRunner.query(`ALTER TABLE "public"."user" ADD "display_currency_code" character varying(3) NOT NULL DEFAULT 'USD'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Remove display_currency_code from user table
        await queryRunner.query(`ALTER TABLE "public"."user" DROP COLUMN "display_currency_code"`);

        // Remove default_currency_code from tenants table
        await queryRunner.query(`ALTER TABLE "public"."tenants" DROP COLUMN "default_currency_code"`);
    }
}
