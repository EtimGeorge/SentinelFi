import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Creates the `tenant_settings` table in the public schema.
 * One row per tenant, auto-created when a tenant is provisioned.
 */
export class CreateTenantSettings1773400000000 implements MigrationInterface {
  name = 'CreateTenantSettings1773400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS public.tenant_settings (
        id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id        UUID NOT NULL UNIQUE REFERENCES public.tenants(tenant_id) ON DELETE CASCADE,

        -- Feature flags
        is_dcs_enabled          BOOLEAN NOT NULL DEFAULT TRUE,
        is_api_enabled          BOOLEAN NOT NULL DEFAULT FALSE,
        is_mfa_required         BOOLEAN NOT NULL DEFAULT FALSE,
        is_audit_log_public     BOOLEAN NOT NULL DEFAULT FALSE,

        -- Email / SMTP
        use_custom_smtp          BOOLEAN NOT NULL DEFAULT FALSE,
        smtp_config              JSONB,
        sendgrid_api_key         VARCHAR,
        notify_on_approval       BOOLEAN NOT NULL DEFAULT TRUE,
        notify_on_budget_breach  BOOLEAN NOT NULL DEFAULT TRUE,
        budget_breach_threshold_pct INT NOT NULL DEFAULT 90,

        -- ERP Integration (stored as JSONB to allow flexible provider schemas)
        erp_config               JSONB,

        -- Audit & Session
        audit_retention_days     INT NOT NULL DEFAULT 90,
        session_timeout_minutes  INT NOT NULL DEFAULT 60,

        -- Branding / Locale
        company_logo_url         VARCHAR,
        timezone                 VARCHAR(64) NOT NULL DEFAULT 'UTC',

        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    // Index for fast lookup by tenant_id
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS IDX_tenant_settings_tenant_id
      ON public.tenant_settings (tenant_id)
    `);

    // Backfill rows for all existing tenants so every tenant has a settings record
    await queryRunner.query(`
      INSERT INTO public.tenant_settings (tenant_id)
      SELECT tenant_id FROM public.tenants
      WHERE tenant_id NOT IN (SELECT tenant_id FROM public.tenant_settings)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS public.tenant_settings CASCADE`);
  }
}
