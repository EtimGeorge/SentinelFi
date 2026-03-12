import { Client } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load env
const envPath = path.resolve(process.cwd(), '.env.local');
dotenv.config({ path: envPath });

async function run() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL not found in .env.local");
    process.exit(1);
  }

  const client = new Client({ 
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  
  await client.connect();
  console.log("Connected to Neon DB.");

  try {
    // 0. Ensure extensions
    await client.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
    await client.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`);

    // 1. PUBLIC SCHEMA: tenant_settings
    console.log("Synchronizing 'public.tenant_settings'...");
    
    // Check if tenants table exists
    const tCheck = await client.query(`SELECT table_name FROM information_schema.tables WHERE table_name = 'tenants' AND table_schema = 'public'`);
    const tenantsTable = tCheck.rows.length > 0 ? 'tenants' : 'tenant';
    
    await client.query(`DROP TABLE IF EXISTS "public"."tenant_settings" CASCADE`);
    await client.query(`
      CREATE TABLE "public"."tenant_settings" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "tenant_id" uuid NOT NULL,
        "is_dcs_enabled" boolean NOT NULL DEFAULT true,
        "is_api_enabled" boolean NOT NULL DEFAULT false,
        "is_mfa_required" boolean NOT NULL DEFAULT false,
        "is_audit_log_public" boolean NOT NULL DEFAULT false,
        "use_custom_smtp" boolean NOT NULL DEFAULT false,
        "smtp_config" jsonb,
        "sendgrid_api_key" character varying,
        "erp_config" jsonb,
        "notify_on_approval" boolean NOT NULL DEFAULT true,
        "notify_on_budget_breach" boolean NOT NULL DEFAULT true,
        "budget_breach_threshold_pct" integer NOT NULL DEFAULT 90,
        "audit_retention_days" integer NOT NULL DEFAULT 90,
        "session_timeout_minutes" integer NOT NULL DEFAULT 60,
        "timezone" character varying(64) NOT NULL DEFAULT 'UTC',
        "company_logo_url" character varying,
        CONSTRAINT "REL_tenant_settings_tenant_id" UNIQUE ("tenant_id"),
        CONSTRAINT "PK_tenant_settings" PRIMARY KEY ("id"),
        CONSTRAINT "FK_tenant_settings_tenant_id" FOREIGN KEY ("tenant_id") REFERENCES "public"."${tenantsTable}"("tenant_id") ON DELETE CASCADE ON UPDATE NO ACTION
      );
    `);
    
    // Backfill settings for all tenants
    await client.query(`
        INSERT INTO public.tenant_settings (tenant_id)
        SELECT tenant_id FROM public.${tenantsTable}
        ON CONFLICT (tenant_id) DO NOTHING
    `);
    console.log("✓ public.tenant_settings synchronized.");

    // 2. TENANT SCHEMAS: Multi-Currency
    const schemaRes = await client.query(`SELECT DISTINCT schema_name FROM public.${tenantsTable} WHERE schema_name IS NOT NULL AND schema_name != 'public'`);
    const schemas = schemaRes.rows.map(r => r.schema_name);
    console.log(`Discovered schemas:`, schemas);

    const tables = ['p2p_requisition', 'p2p_purchase_order', 'p2p_invoice'];
    
    for (const schema of schemas) {
      console.log(`Updating schema [${schema}]...`);
      for (const table of tables) {
        // Verification query
        const hasTable = await client.query(`SELECT 1 FROM information_schema.tables WHERE table_schema = $1 AND table_name = $2`, [schema, table]);
        if (hasTable.rows.length === 0) {
            console.log(`  ⚠ ${table} not found in ${schema}`);
            continue;
        }

        const amountCol = table === 'p2p_purchase_order' ? 'committed_base_amount' : 'base_amount';
        
        try {
            await client.query(`ALTER TABLE "${schema}"."${table}" ADD COLUMN IF NOT EXISTS "currency" character varying(3) NOT NULL DEFAULT 'USD'`);
            await client.query(`ALTER TABLE "${schema}"."${table}" ADD COLUMN IF NOT EXISTS "exchange_rate" numeric(19,6) NOT NULL DEFAULT '1.000000'`);
            await client.query(`ALTER TABLE "${schema}"."${table}" ADD COLUMN IF NOT EXISTS "${amountCol}" numeric(19,4)`);
            console.log(`  ✓ Updated ${schema}.${table}`);
        } catch (e: any) {
            console.error(`  ❌ Failed to update ${schema}.${table}: ${e.message}`);
        }
      }
    }

    console.log("\nDATABASE SYNC COMPLETE.");

  } catch (err: any) {
    console.error("CRITICAL ERROR:", err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

run();
