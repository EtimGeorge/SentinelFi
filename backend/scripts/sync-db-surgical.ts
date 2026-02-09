import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import * as path from 'path';

async function sync() {
    dotenv.config({ path: [path.resolve(process.cwd(), 'backend', '.env.local'), path.resolve(process.cwd(), 'backend', '.env')] });

    const ds = new DataSource({
        type: 'postgres',
        url: process.env.DATABASE_URL,
        ssl: process.env.DATABASE_URL?.includes('neon.tech'),
    });

    try {
        await ds.initialize();
        console.log('Connected to database.');
        
        // --- TENANTS TABLE ---
        console.log('Checking "tenants" table...');
        const tenantsCols = await ds.query(`
            SELECT column_name FROM information_schema.columns 
            WHERE table_name='tenants' AND column_name IN ('deleted_at')
        `);
        if (!tenantsCols.some((c: any) => c.column_name === 'deleted_at')) {
            console.log('Adding deleted_at to tenants...');
            await ds.query('ALTER TABLE "tenants" ADD COLUMN "deleted_at" TIMESTAMP WITH TIME ZONE');
        }

        // --- SETTINGS TABLE ---
        console.log('Checking "settings" table...');
        const settingsCols = await ds.query(`
            SELECT column_name FROM information_schema.columns 
            WHERE table_name='settings' AND column_name IN ('erpProvider', 'erpBaseUrl', 'erpApiKey', 'sendgridApiKey')
        `);
        const existingSettingsCols = settingsCols.map((c: any) => c.column_name);
        
        if (!existingSettingsCols.includes('erpProvider')) {
            await ds.query('ALTER TABLE "settings" ADD COLUMN "erpProvider" varchar(255)');
        }
        if (!existingSettingsCols.includes('erpBaseUrl')) {
            await ds.query('ALTER TABLE "settings" ADD COLUMN "erpBaseUrl" varchar(255)');
        }
        if (!existingSettingsCols.includes('erpApiKey')) {
            await ds.query('ALTER TABLE "settings" ADD COLUMN "erpApiKey" varchar(255)');
        }
        if (!existingSettingsCols.includes('sendgridApiKey')) {
            await ds.query('ALTER TABLE "settings" ADD COLUMN "sendgridApiKey" varchar(255)');
        }
        console.log('Settings columns synchronized.');

        // --- AUDIT_LOG TABLE ---
        console.log('Checking "audit_log" table...');
        const auditCols = await ds.query(`
            SELECT column_name FROM information_schema.columns 
            WHERE table_name='audit_log' AND column_name IN ('actionType')
        `);
        if (!auditCols.some((c: any) => c.column_name === 'actionType')) {
            console.log('Adding actionType to audit_log...');
            await ds.query('ALTER TABLE "audit_log" ADD COLUMN "actionType" varchar(50)');
            // Backfill actionType from action if needed
            await ds.query('UPDATE "audit_log" SET "actionType" = "action" WHERE "actionType" IS NULL');
            await ds.query('ALTER TABLE "audit_log" ALTER COLUMN "actionType" SET NOT NULL');
        }
        console.log('Audit log columns synchronized.');

        console.log('Surgical sync completed successfully.');

    } catch (e) {
        console.error('Surgical sync failed:', e);
    } finally {
        await ds.destroy();
    }
}

sync();
