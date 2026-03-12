import { MigrationInterface, QueryRunner } from "typeorm";

export class FixProjectFinancialColumns1771029000000 implements MigrationInterface {
    name = 'FixProjectFinancialColumns1771029000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Add missing financial columns to the project table with idempotency
        await queryRunner.query(`
            DO $$ BEGIN
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'project' AND column_name = 'currency') THEN
                    ALTER TABLE "project" ADD "currency" character varying(10) NOT NULL DEFAULT 'NGN';
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'project' AND column_name = 'contract_value') THEN
                    ALTER TABLE "project" ADD "contract_value" numeric(19,4) NOT NULL DEFAULT '0';
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'project' AND column_name = 'contingency_percent') THEN
                    ALTER TABLE "project" ADD "contingency_percent" numeric(5,2) NOT NULL DEFAULT '0';
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'project' AND column_name = 'vat_rate') THEN
                    ALTER TABLE "project" ADD "vat_rate" numeric(5,2) NOT NULL DEFAULT '7.5';
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'project' AND column_name = 'wht_rate') THEN
                    ALTER TABLE "project" ADD "wht_rate" numeric(5,2) NOT NULL DEFAULT '5.0';
                END IF;
            END $$;
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "project" DROP COLUMN "wht_rate"`);
        await queryRunner.query(`ALTER TABLE "project" DROP COLUMN "vat_rate"`);
        await queryRunner.query(`ALTER TABLE "project" DROP COLUMN "contingency_percent"`);
        await queryRunner.query(`ALTER TABLE "project" DROP COLUMN "contract_value"`);
        await queryRunner.query(`ALTER TABLE "project" DROP COLUMN "currency"`);
    }
}
