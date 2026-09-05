const { Client } = require('pg');
require('dotenv').config({path:'backend/.env'});
const url = process.env.DATABASE_URL;
const client = new Client({connectionString:url, ssl:{rejectUnauthorized:false}});
async function run(){
  await client.connect();
  const tenants = await client.query('SELECT schema_name FROM public.tenants');
  for(const t of tenants.rows){
    const schema = t.schema_name;
    console.log('Fixing schema',schema);
    const statements = [
      `ALTER TABLE "${schema}"."project" ADD COLUMN IF NOT EXISTS "project_code" character varying(100)`,
      `ALTER TABLE "${schema}"."project" ADD COLUMN IF NOT EXISTS "deleted_at" TIMESTAMPTZ`,
      `ALTER TABLE "${schema}"."project" ADD COLUMN IF NOT EXISTS "client_id" uuid`,
      `ALTER TABLE "${schema}"."project" ADD COLUMN IF NOT EXISTS "currency" character varying(10) DEFAULT 'NGN'`,
      `ALTER TABLE "${schema}"."project" ADD COLUMN IF NOT EXISTS "contract_value" numeric(19,4) DEFAULT '0'`,
      `ALTER TABLE "${schema}"."project" ADD COLUMN IF NOT EXISTS "contingency_percent" numeric(5,2) DEFAULT '0'`,
      `ALTER TABLE "${schema}"."project" ADD COLUMN IF NOT EXISTS "vat_rate" numeric(5,2) DEFAULT '7.5'`,
      `ALTER TABLE "${schema}"."project" ADD COLUMN IF NOT EXISTS "wht_rate" numeric(5,2) DEFAULT '5.0'`,
      `ALTER TABLE "${schema}"."project" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMPTZ`,
      `ALTER TABLE "${schema}"."project" ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMPTZ DEFAULT now()`,

      `ALTER TABLE "${schema}"."wbs_budget" ADD COLUMN IF NOT EXISTS "deleted_at" TIMESTAMPTZ`,
      `ALTER TABLE "${schema}"."wbs_budget" ADD COLUMN IF NOT EXISTS "quantity_actual" numeric(19,4) DEFAULT '0'`,
      `ALTER TABLE "${schema}"."wbs_budget" ADD COLUMN IF NOT EXISTS "days_actual" numeric(19,4) DEFAULT '0'`,
      `ALTER TABLE "${schema}"."wbs_budget" ADD COLUMN IF NOT EXISTS "uom" character varying(50)`,
      `ALTER TABLE "${schema}"."wbs_budget" ADD COLUMN IF NOT EXISTS "custom_metadata" jsonb`,
      `ALTER TABLE "${schema}"."wbs_budget" ADD COLUMN IF NOT EXISTS "total_committed_lpo" numeric(19,4) DEFAULT '0'`,
      `ALTER TABLE "${schema}"."wbs_budget" ADD COLUMN IF NOT EXISTS "sort_order" integer DEFAULT 0`,
      `ALTER TABLE "${schema}"."wbs_budget" ADD COLUMN IF NOT EXISTS "total_cost_actual" numeric(19,4) DEFAULT '0'`,
      `ALTER TABLE "${schema}"."wbs_budget" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMPTZ`,
      `ALTER TABLE "${schema}"."wbs_budget" ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMPTZ DEFAULT now()`,

      `ALTER TABLE "${schema}"."wbs_category" ADD COLUMN IF NOT EXISTS "code" character varying(20)`,
      `ALTER TABLE "${schema}"."wbs_category" ADD COLUMN IF NOT EXISTS "description" text`,
      `ALTER TABLE "${schema}"."wbs_category" ADD COLUMN IF NOT EXISTS "color" character varying(7)`,
      `ALTER TABLE "${schema}"."wbs_category" ADD COLUMN IF NOT EXISTS "sort_order" integer DEFAULT 0`,
      `ALTER TABLE "${schema}"."wbs_category" ADD COLUMN IF NOT EXISTS "parent_id" uuid`,
      `ALTER TABLE "${schema}"."wbs_category" ADD COLUMN IF NOT EXISTS "is_active" boolean DEFAULT true`,
      `ALTER TABLE "${schema}"."wbs_category" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMPTZ DEFAULT now()`,
      `ALTER TABLE "${schema}"."wbs_category" ADD COLUMN IF NOT EXISTS "deleted_at" TIMESTAMPTZ`,
      `ALTER TABLE "${schema}"."wbs_category" ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMPTZ DEFAULT now()`,

      `ALTER TABLE "${schema}"."live_expense" ADD COLUMN IF NOT EXISTS "deleted_at" TIMESTAMPTZ`,
      `ALTER TABLE "${schema}"."live_expense" ADD COLUMN IF NOT EXISTS "approval_status" character varying(50) DEFAULT 'APPROVED'`,
      `ALTER TABLE "${schema}"."live_expense" ADD COLUMN IF NOT EXISTS "override_reason" text`,
      `ALTER TABLE "${schema}"."live_expense" ADD COLUMN IF NOT EXISTS "days" numeric(19,4)`,
      `ALTER TABLE "${schema}"."live_expense" ADD COLUMN IF NOT EXISTS "vat_amount" numeric(19,4) DEFAULT '0'`,
      `ALTER TABLE "${schema}"."live_expense" ADD COLUMN IF NOT EXISTS "wht_amount" numeric(19,4) DEFAULT '0'`,
      `ALTER TABLE "${schema}"."live_expense" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMPTZ`,
      `ALTER TABLE "${schema}"."live_expense" ADD COLUMN IF NOT EXISTS "category_id" uuid`,
      `ALTER TABLE "${schema}"."live_expense" ADD COLUMN IF NOT EXISTS "project_id" uuid`,
      `ALTER TABLE "${schema}"."live_expense" ADD COLUMN IF NOT EXISTS "commitment_lpo_amount" numeric(19,4) DEFAULT '0'`,
      `ALTER TABLE "${schema}"."live_expense" ADD COLUMN IF NOT EXISTS "variance_flag" character varying(50) DEFAULT 'NO_VARIANCE'`,

      `ALTER TABLE "${schema}"."project_inflow" ADD COLUMN IF NOT EXISTS "deleted_at" TIMESTAMPTZ`,
      `ALTER TABLE "${schema}"."lpo" ADD COLUMN IF NOT EXISTS "deleted_at" TIMESTAMPTZ`,
      `ALTER TABLE "${schema}"."operational_budget" ADD COLUMN IF NOT EXISTS "deleted_at" TIMESTAMPTZ`,
      `ALTER TABLE "${schema}"."operational_budget_category" ADD COLUMN IF NOT EXISTS "deleted_at" TIMESTAMPTZ`,
      `ALTER TABLE "${schema}"."operational_expense" ADD COLUMN IF NOT EXISTS "deleted_at" TIMESTAMPTZ`,
      `ALTER TABLE "${schema}"."payroll_entry" ADD COLUMN IF NOT EXISTS "deleted_at" TIMESTAMPTZ`,

      `CREATE INDEX IF NOT EXISTS "IDX_project_deleted_at" ON "${schema}"."project" ("deleted_at")`,
      `CREATE INDEX IF NOT EXISTS "IDX_wbs_budget_deleted_at" ON "${schema}"."wbs_budget" ("deleted_at")`,
      `CREATE INDEX IF NOT EXISTS "IDX_wbs_category_deleted_at" ON "${schema}"."wbs_category" ("deleted_at")`,
      `CREATE INDEX IF NOT EXISTS "IDX_live_expense_deleted_at" ON "${schema}"."live_expense" ("deleted_at")`,
    ];
    for(const sql of statements){
      try{
        await client.query(sql);
        // console.log('ok',sql.substring(0,60));
      }catch(e){
        console.log('ERR',sql,e.message);
      }
    }
    // add parent FK if not exists
    try{
      const fk = await client.query(`SELECT 1 FROM information_schema.table_constraints WHERE table_schema=$1 AND table_name='wbs_category' AND constraint_name='FK_wbs_category_parent'`,[schema]);
      if(fk.rows.length===0){
        await client.query(`ALTER TABLE "${schema}"."wbs_category" ADD CONSTRAINT "FK_wbs_category_parent" FOREIGN KEY ("parent_id") REFERENCES "${schema}"."wbs_category"("id") ON DELETE CASCADE`);
        console.log(' added FK_wbs_category_parent for',schema);
      }
    }catch(e){ console.log('FK err',e.message)}
    // try enum add recalled
    try{
      await client.query(`DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid WHERE t.typname = 'wbs_budget_status_enum' AND e.enumlabel = 'recalled') THEN ALTER TYPE "wbs_budget_status_enum" ADD VALUE 'recalled'; END IF; EXCEPTION WHEN duplicate_object THEN NULL; END $$;`);
    }catch(e){ /* ignore */ }
    // Now ensure tenant_migrations has entry for EnsureSoftDeleteParity to avoid re-running via TypeORM
    try{
      await client.query(`INSERT INTO "${schema}"."tenant_migrations" ("timestamp","name") VALUES (1776000000000,'EnsureSoftDeleteParity1776000000000') ON CONFLICT DO NOTHING`);
      console.log(' inserted migration marker for',schema);
    }catch(e){ console.log('migration marker err',e.message)}
    console.log('Done',schema);
  }
  await client.end();
  console.log('All schemas patched');
}
run().catch(e=>{console.error(e); process.exit(1)});
