import { MigrationInterface, QueryRunner } from "typeorm";

export class AddOfflineBillingAuditTrail1773800000000 implements MigrationInterface {
    name = 'AddOfflineBillingAuditTrail1773800000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "subscriptions" ADD "payment_proof_url" character varying(1000)`);
        await queryRunner.query(`ALTER TABLE "subscriptions" ADD "payment_proof_text" text`);
        await queryRunner.query(`ALTER TABLE "subscriptions" ADD "offline_bank_reference" character varying(255)`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "subscriptions" DROP COLUMN "offline_bank_reference"`);
        await queryRunner.query(`ALTER TABLE "subscriptions" DROP COLUMN "payment_proof_text"`);
        await queryRunner.query(`ALTER TABLE "subscriptions" DROP COLUMN "payment_proof_url"`);
    }
}
