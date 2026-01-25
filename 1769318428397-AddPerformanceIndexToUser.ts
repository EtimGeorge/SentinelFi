import { MigrationInterface, QueryRunner } from "typeorm";

export class AddPerformanceIndexToUser1769318428397 implements MigrationInterface {
    name = 'AddPerformanceIndexToUser1769318428397'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_user_email_is_active"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_user_tenant_id_is_active"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_audit_log_userId_action_tenantId"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_audit_log_timestamp"`);
        await queryRunner.query(`CREATE TABLE "settings" ("id" integer NOT NULL DEFAULT '1', "maintenanceMode" boolean NOT NULL DEFAULT false, "allowNewRegistrations" boolean NOT NULL DEFAULT true, "defaultUserQuota" integer NOT NULL DEFAULT '50', "defaultStorageQuotaGB" integer NOT NULL DEFAULT '10', "smtpServer" character varying, "smtpPort" integer, "smtpUser" character varying, "smtpPass" character varying, "supportEmail" character varying, CONSTRAINT "PK_0669fe20e252eb692bf4d344975" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "password_hash"`);
        await queryRunner.query(`ALTER TABLE "user" ADD "password_hash" character varying(255) NOT NULL`);
        await queryRunner.query(`CREATE INDEX "IDX_3d79be558ff58a353061c6b1a8" ON "user" ("email", "is_active") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_3d79be558ff58a353061c6b1a8"`);
        await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "password_hash"`);
        await queryRunner.query(`ALTER TABLE "user" ADD "password_hash" character varying NOT NULL`);
        await queryRunner.query(`DROP TABLE "settings"`);
        await queryRunner.query(`CREATE INDEX "IDX_audit_log_timestamp" ON "audit_log" ("timestamp") `);
        await queryRunner.query(`CREATE INDEX "IDX_audit_log_userId_action_tenantId" ON "audit_log" ("action", "tenantId", "userId") `);
        await queryRunner.query(`CREATE INDEX "IDX_user_tenant_id_is_active" ON "user" ("is_active", "tenant_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_user_email_is_active" ON "user" ("email", "is_active") `);
    }

}
