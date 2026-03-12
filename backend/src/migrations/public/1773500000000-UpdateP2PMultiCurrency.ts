import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdateP2PMultiCurrency1773500000000 implements MigrationInterface {
    name = 'UpdateP2PMultiCurrency1773500000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // --- p2p_requisition ---
        await queryRunner.query(`ALTER TABLE "p2p_requisition" ADD "currency" character varying(3) NOT NULL DEFAULT 'USD'`);
        await queryRunner.query(`ALTER TABLE "p2p_requisition" ADD "exchange_rate" numeric(19,6) NOT NULL DEFAULT '1.000000'`);
        await queryRunner.query(`ALTER TABLE "p2p_requisition" ADD "base_amount" numeric(19,4)`);

        // --- p2p_purchase_order ---
        await queryRunner.query(`ALTER TABLE "p2p_purchase_order" ADD "currency" character varying(3) NOT NULL DEFAULT 'USD'`);
        await queryRunner.query(`ALTER TABLE "p2p_purchase_order" ADD "exchange_rate" numeric(19,6) NOT NULL DEFAULT '1.000000'`);
        await queryRunner.query(`ALTER TABLE "p2p_purchase_order" ADD "committed_base_amount" numeric(19,4)`);

        // --- p2p_invoice ---
        await queryRunner.query(`ALTER TABLE "p2p_invoice" ADD "currency" character varying(3) NOT NULL DEFAULT 'USD'`);
        await queryRunner.query(`ALTER TABLE "p2p_invoice" ADD "exchange_rate" numeric(19,6) NOT NULL DEFAULT '1.000000'`);
        await queryRunner.query(`ALTER TABLE "p2p_invoice" ADD "base_amount" numeric(19,4)`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // --- p2p_invoice ---
        await queryRunner.query(`ALTER TABLE "p2p_invoice" DROP COLUMN "base_amount"`);
        await queryRunner.query(`ALTER TABLE "p2p_invoice" DROP COLUMN "exchange_rate"`);
        await queryRunner.query(`ALTER TABLE "p2p_invoice" DROP COLUMN "currency"`);

        // --- p2p_purchase_order ---
        await queryRunner.query(`ALTER TABLE "p2p_purchase_order" DROP COLUMN "committed_base_amount"`);
        await queryRunner.query(`ALTER TABLE "p2p_purchase_order" DROP COLUMN "exchange_rate"`);
        await queryRunner.query(`ALTER TABLE "p2p_purchase_order" DROP COLUMN "currency"`);

        // --- p2p_requisition ---
        await queryRunner.query(`ALTER TABLE "p2p_requisition" DROP COLUMN "base_amount"`);
        await queryRunner.query(`ALTER TABLE "p2p_requisition" DROP COLUMN "exchange_rate"`);
        await queryRunner.query(`ALTER TABLE "p2p_requisition" DROP COLUMN "currency"`);
    }
}
