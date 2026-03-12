
import { DataSource } from "typeorm";
import { config } from "dotenv";
import { resolve } from "path";

// Load environment variables
const envLocalPath = resolve(__dirname, "../.env.local");
const envPath = resolve(__dirname, "../.env");
config({ path: envLocalPath });
if (!process.env.DATABASE_URL) {
    config({ path: envPath });
}
const dbUrl = process.env.DATABASE_URL;

if (!dbUrl) {
    console.error("❌ Error: DATABASE_URL is undefined.");
    process.exit(1);
}

const tenantId = '28c5e8aa-5270-4299-b062-2414575019b9';
const schemaName = `tenant_${tenantId.replace(/-/g, "_")}`;

const mainDataSource = new DataSource({
    type: "postgres",
    url: dbUrl,
    ssl: false,
});

async function repairTenant() {
    try {
        await mainDataSource.initialize();
        console.log("✅ Main Connection Established.");

        // 0. Drop Schema to ensure clean slate (since we are repairing a broken state)
        console.log(`🗑️ Dropping schema (if exists) for clean repair: ${schemaName}`);
        await mainDataSource.query(`DROP SCHEMA IF EXISTS "${schemaName}" CASCADE`);

        // 1. Create Schema
        console.log(`🛠️ Creating schema: ${schemaName}`);
        await mainDataSource.query(`CREATE SCHEMA IF NOT EXISTS "${schemaName}"`);

        // 1.5 Create Enums manually
        // The migration 'ComprehensiveTenantSchemaStabilization' has a bug: it checks pg_type globally.
        // If these enums exist in ANY schema, it skips creating them in THIS tenant schema.
        // So we must create them manually here.
        // We DO NOT create 'operational_expense_status_enum' because 'InitialTenantSchemaSetup' creates it unconditionally.
        console.log(`🛠️ Creating Enums...`);
        try {
            await mainDataSource.query(`CREATE TYPE "${schemaName}"."lpo_status_enum" AS ENUM ('OPEN', 'APPROVED', 'REJECTED', 'PARTIALLY_DELIVERED', 'DELIVERED', 'CLOSED', 'CANCELLED');`);
        } catch (e) { console.log("Enum likely exists or error ignored: " + e); }
        
        try {
            await mainDataSource.query(`CREATE TYPE "${schemaName}"."budget_category_type_enum" AS ENUM ('CAPEX', 'OPEX');`);
        } catch (e) { console.log("Enum likely exists or error ignored: " + e); }

        try {
            await mainDataSource.query(`CREATE TYPE "${schemaName}"."period_type_enum" AS ENUM ('MONTHLY', 'WEEKLY', 'DAILY', 'CUSTOM');`);
        } catch (e) { console.log("Enum likely exists or error ignored: " + e); }



        // 2. Run Migrations using a separate DataSource scoped to this schema
        const tenantDataSource = new DataSource({
            type: "postgres",
            url: dbUrl,
            ssl: false,
            schema: schemaName,
            entities: [
                resolve(__dirname, "../src/**/*.entity.ts"),
            ],
            migrations: [
                resolve(__dirname, "../src/migrations/tenant/*.ts"),
            ],
            migrationsTableName: "tenant_migrations",
        });

        await tenantDataSource.initialize();
        console.log("✅ Tenant Connection Established.");

        console.log("🚀 Running Tenant Migrations...");
        try {
            const migrations = await tenantDataSource.runMigrations();
            if (migrations.length === 0) {
                 console.log("⚠️ No migrations were applied. Checking if tables exist...");
                 const tables = await tenantDataSource.query(`SELECT table_name FROM information_schema.tables WHERE table_schema = '${schemaName}'`);
                 console.log("Tables found:", tables.map((t: any) => t.table_name).join(", "));
            } else {
                 console.log(`✅ Applied ${migrations.length} migrations:`);
                 migrations.forEach(m => console.log(` - ${m.name}`));
            }
        } catch (migrationError: any) {
            console.error("⚠️ Migration Error:", migrationError.message);
            if (migrationError.message.includes("already exists")) {
                console.log("✅ Partial success: Some objects already existed. Checking tables...");
                 const tables = await tenantDataSource.query(`SELECT table_name FROM information_schema.tables WHERE table_schema = '${schemaName}'`);
                 console.log("Tables found:", tables.map((t: any) => t.table_name).join(", "));
            }
        }
        
        await tenantDataSource.destroy();

    } catch (error) {
        console.error("❌ Repair failed:", error);
        console.error(error);
    } finally {
        if (mainDataSource.isInitialized) await mainDataSource.destroy();
    }
}

repairTenant();
