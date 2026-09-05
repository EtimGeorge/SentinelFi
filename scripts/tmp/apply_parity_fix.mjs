import { DataSource } from "typeorm";
import dotenv from "dotenv";
dotenv.config({ path: "D:/DOCUMENTS/Development/SentinelFi/backend/.env" });
let url = (process.env.DATABASE_URL || "").trim().replace(/^['"]|['"]$/g, "");
if (url.startsWith("postgresql://")) url = url.replace("postgresql://", "postgres://");
const ds = new DataSource({ type: "postgres", url, ssl: { rejectUnauthorized: false } });
await ds.initialize();
console.log("Fetching tenants generically (no hardcoded names)...");
const tenants = await ds.query(`SELECT schema_name FROM public.tenants WHERE is_active = true`);
console.log("Tenants found:", tenants.map(t=>t.schema_name));
for(const {schema_name} of tenants){
  console.log(`\n=== Applying parity fix to schema "${schema_name}" ===`);
  // do NOT hardcode tenant names; loop over public.tenants
  const queries = [
    `ALTER TABLE "${schema_name}"."live_expense" ADD COLUMN IF NOT EXISTS "vendor_name" character varying(255)`,
    `ALTER TABLE "${schema_name}"."project" ADD COLUMN IF NOT EXISTS "project_code" character varying(100)`,
    `ALTER TABLE "${schema_name}"."project" ADD COLUMN IF NOT EXISTS "deleted_at" TIMESTAMPTZ`,
    `ALTER TABLE "${schema_name}"."project" ADD COLUMN IF NOT EXISTS "client_id" uuid`,
    `ALTER TABLE "${schema_name}"."project" ADD COLUMN IF NOT EXISTS "currency" character varying(10) DEFAULT 'NGN'`,
    `ALTER TABLE "${schema_name}"."project" ADD COLUMN IF NOT EXISTS "contract_value" numeric(19,4) DEFAULT '0'`,
    `ALTER TABLE "${schema_name}"."project" ADD COLUMN IF NOT EXISTS "contingency_percent" numeric(5,2) DEFAULT '0'`,
    `ALTER TABLE "${schema_name}"."project" ADD COLUMN IF NOT EXISTS "vat_rate" numeric(5,2) DEFAULT '7.5'`,
    `ALTER TABLE "${schema_name}"."project" ADD COLUMN IF NOT EXISTS "wht_rate" numeric(5,2) DEFAULT '5.0'`,
    `ALTER TABLE "${schema_name}"."project" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMPTZ`,
    `ALTER TABLE "${schema_name}"."project" ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMPTZ DEFAULT now()`,
    `CREATE TABLE IF NOT EXISTS "${schema_name}"."clients" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenant_id" uuid NOT NULL,
        "name" character varying NOT NULL,
        "email" character varying,
        "phone" character varying,
        "address" text,
        "industry" character varying,
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP WITH TIME ZONE,
        CONSTRAINT "PK_clients" PRIMARY KEY ("id")
      )`,
    `CREATE INDEX IF NOT EXISTS "IDX_project_deleted_at" ON "${schema_name}"."project" ("deleted_at")`,
    `CREATE INDEX IF NOT EXISTS "IDX_live_expense_deleted_at" ON "${schema_name}"."live_expense" ("deleted_at")`,
  ];
  for(const q of queries){
    try{
      await ds.query(q);
      console.log(" OK:", q.split("\n")[0].slice(0,80));
    }catch(e){
      console.log(" FAIL:", q.slice(0,80), e.message);
    }
  }
  // verify
  const cols = await ds.query(`SELECT column_name FROM information_schema.columns WHERE table_schema=$1 AND table_name='live_expense' AND column_name='vendor_name'`,[schema_name]);
  console.log(` vendor_name exists in ${schema_name}:`, cols.length>0);
  const projCols = await ds.query(`SELECT column_name FROM information_schema.columns WHERE table_schema=$1 AND table_name='project' ORDER BY ordinal_position`,[schema_name]);
  console.log(` project columns ${schema_name}:`, projCols.map(c=>c.column_name).join(","));
}
// final verification querying information_schema.columns for both schemas generically
console.log("\n=== Verification via information_schema.columns ===");
const verify = await ds.query(`
  SELECT table_schema, table_name, column_name
  FROM information_schema.columns
  WHERE table_schema IN (SELECT schema_name FROM public.tenants)
    AND table_name IN ('project','live_expense','clients')
  ORDER BY table_schema, table_name, column_name
`);
console.log(JSON.stringify(verify,null,2));
await ds.destroy();
console.log("\nDone – generic fix applied to all tenants (no hardcoded names).");
