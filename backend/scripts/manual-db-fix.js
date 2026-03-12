const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function run() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  console.log("Connected to DB. Starting multi-tenant schema synchronization...");

  try {
    // 0. Ensure uuid-ossp in public schema
    await client.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    // 1. Recreate tenant_settings in PUBLIC schema (Global table)
    console.log("Step 1: Synchronizing 'tenant_settings' in public schema...");
    
    // Check if table 'tenants' exists, if not try 'tenant'
    let tenantsTable = 'tenants';
    const tableCheckV1 = await client.query(`SELECT table_name FROM information_schema.tables WHERE table_name = 'tenants' AND table_schema = 'public'`);
    if (tableCheckV1.rows.length === 0) {
        const tableCheckV2 = await client.query(`SELECT table_name FROM information_schema.tables WHERE table_name = 'tenant' AND table_schema = 'public'`);
        if (tableCheckV2.rows.length > 0) tenantsTable = 'tenant';
    }
    console.log(`Using tenants table: public.${tenantsTable}`);

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
    console.log("✓ 'tenant_settings' recreated.");

    // 2. Discover all tenant schemas from the tenants table
    const schemaRes = await client.query(`SELECT DISTINCT schema_name FROM public.${tenantsTable}`);
    const schemas = schemaRes.rows.map(r => r.schema_name);
    console.log(`Step 2: Discovered ${schemas.length} tenant schemas from public.${tenantsTable}:`, schemas);

    // 3. Update P2P tables in EACH schema
    const tables = ['p2p_requisition', 'p2p_purchase_order', 'p2p_invoice'];
    
    for (const schema of schemas) {
      if (!schema || schema === 'public') continue;
      
      console.log(`Updating schema: ${schema}...`);
      for (const table of tables) {
        // Check if table exists in this schema
        const tableCheck = await client.query(`
          SELECT table_name 
          FROM information_schema.tables 
          WHERE table_schema = $1 AND table_name = $2
        `, [schema, table]);

        if (tableCheck.rows.length > 0) {
          const amountCol = table === 'p2p_purchase_order' ? 'committed_base_amount' : 'base_amount';
          
          await client.query(`ALTER TABLE "${schema}"."${table}" ADD COLUMN IF NOT EXISTS "currency" character varying(3) NOT NULL DEFAULT 'USD'`);
          await client.query(`ALTER TABLE "${schema}"."${table}" ADD COLUMN IF NOT EXISTS "exchange_rate" numeric(19,6) NOT NULL DEFAULT '1.000000'`);
          await client.query(`ALTER TABLE "${schema}"."${table}" ADD COLUMN IF NOT EXISTS "${amountCol}" numeric(19,4)`);
          
          console.log(`  ✓ Updated ${schema}.${table}`);
        } else {
          console.log(`  ⚠ Table ${table} not found in schema ${schema}`);
        }
      }
    }

    console.log("\nDatabase schema successfully synchronized across all tenants.");

  } catch (err) {
    console.error("Critical Failure:", err);
    console.error(err.stack);
  } finally {
    await client.end();
  }
}

run();
