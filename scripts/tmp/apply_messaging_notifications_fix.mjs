import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config({path:'backend/.env'});
const {Client}=pg;
const c=new Client({connectionString:process.env.DATABASE_URL, ssl:{rejectUnauthorized:false}});
await c.connect();
const tenants=await c.query(`SELECT schema_name FROM public.tenants WHERE deleted_at IS NULL`);
console.log('tenants', tenants.rows.map(r=>r.schema_name));
for(const {schema_name} of tenants.rows){
  console.log(`\n=== fixing ${schema_name} ===`);
  const statements = [
    `CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`,
    `CREATE TABLE IF NOT EXISTS "${schema_name}"."notifications" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenant_id" uuid NOT NULL, "user_id" uuid, "title" character varying(255) NOT NULL, "message" text NOT NULL, "type" character varying(50) NOT NULL DEFAULT 'info', "is_read" boolean NOT NULL DEFAULT false, "metadata" jsonb, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_notifications" PRIMARY KEY ("id"))`,
    `CREATE INDEX IF NOT EXISTS "IDX_notifications_tenant" ON "${schema_name}"."notifications" ("tenant_id")`,
    `CREATE INDEX IF NOT EXISTS "IDX_notifications_user" ON "${schema_name}"."notifications" ("user_id")`,
    `CREATE INDEX IF NOT EXISTS "IDX_notifications_is_read" ON "${schema_name}"."notifications" ("is_read")`,
    `CREATE TABLE IF NOT EXISTS "${schema_name}"."conversation" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenant_id" uuid NOT NULL, "type" character varying(20) NOT NULL DEFAULT 'DIRECT', "name" character varying(255), "last_activity_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_conversation" PRIMARY KEY ("id"))`,
    `CREATE INDEX IF NOT EXISTS "IDX_conversation_tenant" ON "${schema_name}"."conversation" ("tenant_id")`,
    `CREATE TABLE IF NOT EXISTS "${schema_name}"."conversation_member" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "conversation_id" uuid NOT NULL, "user_id" uuid NOT NULL, "last_read_at" TIMESTAMP WITH TIME ZONE, "joined_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_conversation_member" PRIMARY KEY ("id"))`,
    `CREATE INDEX IF NOT EXISTS "IDX_conversation_member_user" ON "${schema_name}"."conversation_member" ("user_id")`,
    `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_conversation_member_unique" ON "${schema_name}"."conversation_member" ("conversation_id", "user_id")`,
    `CREATE TABLE IF NOT EXISTS "${schema_name}"."message" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenant_id" uuid NOT NULL, "conversation_id" uuid NOT NULL, "sender_id" uuid NOT NULL, "content" text NOT NULL, "is_read" boolean NOT NULL DEFAULT false, "metadata" jsonb, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_message" PRIMARY KEY ("id"))`,
    `CREATE INDEX IF NOT EXISTS "IDX_message_conversation" ON "${schema_name}"."message" ("conversation_id")`,
    `CREATE INDEX IF NOT EXISTS "IDX_message_tenant" ON "${schema_name}"."message" ("tenant_id")`,
  ];
  for(const sql of statements){
    try{ await c.query(sql); }catch(e){ console.log(' err', sql.slice(0,80), e.message.slice(0,200));}
  }
  // rename receiver_id -> conversation_id if exists
  try{
    await c.query(`
      DO $$ 
      BEGIN
          IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='${schema_name}' AND table_name = 'message' AND column_name = 'receiver_id') THEN
              ALTER TABLE "${schema_name}"."message" DROP CONSTRAINT IF EXISTS "FK_f4da40532b0102d51beb220f16a";
              DROP INDEX IF EXISTS "${schema_name}"."IDX_f4da40532b0102d51beb220f16";
              ALTER TABLE "${schema_name}"."message" RENAME COLUMN "receiver_id" TO "conversation_id";
          END IF;
      END $$;
    `);
  }catch(e){ console.log(' rename err', e.message.slice(0,200));}
  // FKs
  try{ await c.query(`ALTER TABLE "${schema_name}"."conversation_member" DROP CONSTRAINT IF EXISTS "FK_conversation_member_conversation"`); await c.query(`ALTER TABLE "${schema_name}"."conversation_member" ADD CONSTRAINT "FK_conversation_member_conversation" FOREIGN KEY ("conversation_id") REFERENCES "${schema_name}"."conversation"("id") ON DELETE CASCADE`);}catch(e){console.log('fk conv', e.message.slice(0,120));}
  try{ await c.query(`ALTER TABLE "${schema_name}"."conversation_member" DROP CONSTRAINT IF EXISTS "FK_conversation_member_user"`); await c.query(`ALTER TABLE "${schema_name}"."conversation_member" ADD CONSTRAINT "FK_conversation_member_user" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE NO ACTION`);}catch(e){console.log('fk user', e.message.slice(0,120));}
  try{ await c.query(`ALTER TABLE "${schema_name}"."message" DROP CONSTRAINT IF EXISTS "FK_message_conversation"`); await c.query(`ALTER TABLE "${schema_name}"."message" ADD CONSTRAINT "FK_message_conversation" FOREIGN KEY ("conversation_id") REFERENCES "${schema_name}"."conversation"("id") ON DELETE CASCADE`);}catch(e){console.log('fk msg', e.message.slice(0,120));}
  try{ await c.query(`ALTER TABLE "${schema_name}"."message" DROP CONSTRAINT IF EXISTS "FK_message_sender"`); await c.query(`ALTER TABLE "${schema_name}"."message" ADD CONSTRAINT "FK_message_sender" FOREIGN KEY ("sender_id") REFERENCES "public"."user"("id") ON DELETE NO ACTION`);}catch(e){console.log('fk sender', e.message.slice(0,120));}
  // record migration as executed to avoid re-run via TypeORM
  try{ await c.query(`INSERT INTO "${schema_name}"."tenant_migrations" ("timestamp","name") VALUES (1776000000002,'EnsureMessagingAndNotificationsParity1776000000002') ON CONFLICT DO NOTHING`); console.log(' migration marker inserted');}catch(e){console.log(' marker err', e.message.slice(0,200));}
  console.log(` done ${schema_name}`);
}
await c.end();
console.log('All done');
