import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateBillingInvoices1773900000000 implements MigrationInterface {
  name = "CreateBillingInvoices1773900000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            CREATE TABLE "billing_invoices" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "tenant_id" uuid NOT NULL,
                "subscription_id" uuid NOT NULL,
                "invoice_number" character varying(50) NOT NULL,
                "amount_usd" numeric(12,2) NOT NULL,
                "status" character varying NOT NULL DEFAULT 'pending',
                "pdf_url" character varying(255),
                "due_date" TIMESTAMP WITH TIME ZONE NOT NULL,
                "paid_at" TIMESTAMP WITH TIME ZONE,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "UQ_billing_invoices_number" UNIQUE ("invoice_number"),
                CONSTRAINT "PK_billing_invoices" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            ALTER TABLE "billing_invoices" 
            ADD CONSTRAINT "FK_billing_invoices_subscription" 
            FOREIGN KEY ("subscription_id") 
            REFERENCES "subscriptions"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "billing_invoices" DROP CONSTRAINT "FK_billing_invoices_subscription"`,
    );
    await queryRunner.query(`DROP TABLE "billing_invoices"`);
  }
}
