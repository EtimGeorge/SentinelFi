// backend/scripts/upgrade-lpo-governance.js
// Applies LPO approval-governance columns + missing project finance tables to
// EXISTING tenant schemas. runTenantMigrations only executes on tenant creation,
// so live databases need this surgical upgrade (same pattern as
// add-lpo-commitment-column.js and force-sync-wbs-fields.js).
//
// Usage:  node upgrade-lpo-governance.js
// Reads DATABASE_URL from the environment (falls back to backend/.env).
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

function loadDatabaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL.trim();
  const envPath = path.join(__dirname, '..', '.env');
  if (fs.existsSync(envPath)) {
    const match = fs
      .readFileSync(envPath, 'utf8')
      .split('\n')
      .find((line) => line.startsWith('DATABASE_URL='));
    if (match) return match.replace(/^DATABASE_URL=/, '').trim().replace(/^['"]|['"]$/g, '');
  }
  throw new Error('DATABASE_URL not found. Export it or supply backend/.env');
}

const MIGRATION_NAME = 'LpoApprovalGovernance1780000000000';
const MIGRATION_TIMESTAMP = 1780000000000;

async function upgradeLpoGovernance() {
  console.log('--- LPO APPROVAL GOVERNANCE UPGRADE STARTED ---');
  const connectionString = loadDatabaseUrl();
  const isNeon = connectionString.includes('neon.tech');
  const client = new Client({
    connectionString,
    ssl: isNeon ? { rejectUnauthorized: false } : undefined,
  });

  try {
    await client.connect();
    console.log('Connected to database.');

    const res = await client.query(
      'SELECT tenant_id, name, schema_name FROM public.tenants WHERE is_active = true',
    );
    console.log(`Processing ${res.rows.length} active tenants.`);

    for (const tenant of res.rows) {
      const schema = tenant.schema_name;
      console.log(`\nTenant: ${tenant.name} (Schema: ${schema})`);
      try {
        await client.query(`
          ALTER TABLE "${schema}"."lpo"
          ADD COLUMN IF NOT EXISTS "approval_status" character varying(50) NOT NULL DEFAULT 'APPROVED',
          ADD COLUMN IF NOT EXISTS "variance_flag" character varying(50) NOT NULL DEFAULT 'NO_VARIANCE',
          ADD COLUMN IF NOT EXISTS "override_reason" text
        `);
        console.log('  ✔ lpo governance columns ensured.');

        await client.query(`
          DO $$
          BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'lpo_status_enum') THEN
              CREATE TYPE "lpo_status_enum" AS ENUM ('OPEN', 'PARTIALLY_PAID', 'CLOSED', 'CANCELLED');
            END IF;
          END $$;
        `);
        console.log('  ✔ lpo_status_enum type ensured.');

        // Register the step so TypeORM migration bookkeeping stays consistent.
        await client.query(
          `DELETE FROM "${schema}"."tenant_migrations" WHERE name = $1`,
          [MIGRATION_NAME],
        );
        await client.query(
          `INSERT INTO "${schema}"."tenant_migrations" (name, timestamp) VALUES ($1, $2)`,
          [MIGRATION_NAME, MIGRATION_TIMESTAMP],
        );
        console.log('  ✔ Migration record saved.');
      } catch (err) {
        console.error(`  ✗ Error upgrading schema ${schema}: ${err.message}`);
      }
    }
  } catch (err) {
    console.error('CRITICAL UPGRADE ERROR:', err);
    process.exitCode = 1;
  } finally {
    await client.end();
    console.log('\n--- LPO APPROVAL GOVERNANCE UPGRADE FINISHED ---');
  }
}

upgradeLpoGovernance();