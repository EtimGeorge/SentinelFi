import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: [path.resolve(__dirname, '../.env.local'), path.resolve(__dirname, '../.env')] });

async function fix() {
  const ds = new DataSource({
    type: 'postgres',
    url: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL?.includes('neon.tech') ? { rejectUnauthorized: false } : false,
  });

  try {
    await ds.initialize();
    console.log('Connected to database.');

    // 1. Create settings table if not exists
    await ds.query(`
      CREATE TABLE IF NOT EXISTS "settings" (
        "id" integer NOT NULL DEFAULT '1',
        "maintenanceMode" boolean NOT NULL DEFAULT false,
        "allowNewRegistrations" boolean NOT NULL DEFAULT true,
        "defaultUserQuota" integer NOT NULL DEFAULT '50',
        "defaultStorageQuotaGB" integer NOT NULL DEFAULT '10',
        "smtpServer" character varying,
        "smtpPort" integer,
        "smtpUser" character varying,
        "smtpPass" character varying,
        "supportEmail" character varying,
        CONSTRAINT "PK_0669fe20e252eb692bf4d344975" PRIMARY KEY ("id")
      )
    `);
    console.log('Settings table verified/created.');

    // 2. Ensure default record exists
    const existing = await ds.query('SELECT * FROM "settings" WHERE id = 1');
    if (existing.length === 0) {
      await ds.query('INSERT INTO "settings" (id) VALUES (1)');
      console.log('Default settings record seeded.');
    } else {
      console.log('Settings record already exists.');
    }

  } catch (err) {
    console.error('Fix failed:', err);
  } finally {
    await ds.destroy();
  }
}

fix();
