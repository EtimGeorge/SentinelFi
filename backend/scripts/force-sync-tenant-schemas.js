const { Client } = require('pg');

const connectionString = 'postgresql://neondb_owner:npg_Zj7Im1SgebkV@ep-spring-feather-ahvamwz8-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require';

async function forceSync() {
  const client = new Client({ connectionString });
  await client.connect();

  try {
    // 1. Get all tenant schemas (excluding public, etc.)
    const schemaRes = await client.query(`
      SELECT schema_name 
      FROM information_schema.schemata 
      WHERE schema_name NOT IN ('information_schema', 'pg_catalog', 'public', 'pg_toast')
      AND schema_name NOT LIKE 'pg_temp%'
      AND schema_name NOT LIKE 'pg_toast_temp%'
    `);

    const schemas = schemaRes.rows.map(r => r.schema_name);
    console.log(`Found ${schemas.length} potential tenant schemas:`, schemas);

    for (const schema of schemas) {
      console.log(`\nProcessing Schema: ${schema}`);

      // A. Ensure 'clients' table exists
      await client.query(`
        CREATE TABLE IF NOT EXISTS "${schema}"."clients" (
          "id" uuid NOT NULL DEFAULT uuid_generate_v4(), 
          "tenant_id" uuid NOT NULL, 
          "name" character varying NOT NULL, 
          "email" character varying, 
          "phone" character varying, 
          "address" text, 
          "industry" character varying, 
          "is_active" boolean NOT NULL DEFAULT true, 
          "created_at" TIMESTAMP NOT NULL DEFAULT now(), 
          "updated_at" TIMESTAMP NOT NULL DEFAULT now(), 
          "deleted_at" TIMESTAMP WITH TIME ZONE,
          CONSTRAINT "PK_clients_id_${schema}" PRIMARY KEY ("id")
        )
      `);
      console.log(`- 'clients' table verified/created.`);

      // B. Check and Fix 'project' table
      const projectCols = [
        ['client_id', 'uuid', 'NULL'],
        ['currency', 'character varying(10)', "'NGN'"],
        ['contract_value', 'numeric(19,4)', '0'],
        ['contingency_percent', 'numeric(5,2)', '0'],
        ['vat_rate', 'numeric(5,2)', '7.5'],
        ['wht_rate', 'numeric(5,2)', '5.0'],
        ['rfq_number', 'text', 'NULL'],
        ['sow_details', 'text', 'NULL'],
        ['notes', 'text', 'NULL']
      ];

      for (const [col, type, def] of projectCols) {
        const colCheck = await client.query(`
          SELECT 1 FROM information_schema.columns 
          WHERE table_schema = $1 AND table_name = 'project' AND column_name = $2
        `, [schema, col]);

        if (colCheck.rows.length === 0) {
          console.log(`- Adding missing column 'project.${col}'...`);
          await client.query(`ALTER TABLE "${schema}"."project" ADD COLUMN "${col}" ${type} DEFAULT ${def}`);
        }
      }

      // C. Re-verify 'wbs_budget' (just in case)
      const wbsCols = [
        ['sort_order', 'integer', '0'],
        ['uom', 'character varying', 'NULL'],
        ['custom_metadata', 'jsonb', 'NULL'],
        ['unit_cost_budgeted', 'numeric', '0'],
        ['quantity_budgeted', 'numeric', '0']
      ];

      for (const [col, type, def] of wbsCols) {
        const colCheck = await client.query(`
          SELECT 1 FROM information_schema.columns 
          WHERE table_schema = $1 AND table_name = 'wbs_budget' AND column_name = $2
        `, [schema, col]);

        if (colCheck.rows.length === 0) {
          console.log(`- Adding missing column 'wbs_budget.${col}'...`);
          await client.query(`ALTER TABLE "${schema}"."wbs_budget" ADD COLUMN "${col}" ${type} DEFAULT ${def}`);
        }
      }

      // D. Test a query to confirm it works
      try {
        await client.query(`SET search_path TO "${schema}", public`);
        const testRes = await client.query(`
          SELECT p.*, c.name as client_name 
          FROM project p 
          LEFT JOIN clients c ON p.client_id = c.id 
          LIMIT 1
        `);
        console.log(`- Schema test query: SUCCESS (Found ${testRes.rows.length} projects)`);
      } catch (testErr) {
        console.error(`- Schema test query: FAILED - ${testErr.message}`);
      }
    }

    console.log('\n=========================================');
    console.log('FORCE SYNC COMPLETE');
    console.log('=========================================');

  } catch (err) {
    console.error('ERROR DURING FORCE SYNC:', err);
  } finally {
    await client.end();
  }
}

forceSync();
