
import { DataSource } from "typeorm";
import { config } from "dotenv";
import { resolve } from "path";

// Load environment variables
const envLocalPath = resolve(__dirname, "../.env.local");
const envPath = resolve(__dirname, "../.env");

console.log(`Debug: Attempting to load .env.local from: ${envLocalPath}`);
config({ path: envLocalPath });

// Fallback if DATABASE_URL is not found or empty
if (!process.env.DATABASE_URL) {
    console.log(`Debug: .env.local failed or DATABASE_URL missing. Attempting .env from: ${envPath}`);
    config({ path: envPath });
}

const dbUrl = process.env.DATABASE_URL;
console.log(`Debug: DATABASE_URL loaded: ${dbUrl ? dbUrl.replace(/:([^:@]+)@/, ":****@") : "UNDEFINED"}`);

if (!dbUrl) {
    console.error("❌ Error: DATABASE_URL is undefined. Cannot connect.");
    process.exit(1);
}

const dataSource = new DataSource({
    type: "postgres",
    url: dbUrl,
    ssl: false, // Explicitly false for local dev as requested
});

async function verifyProjects() {
    try {
        await dataSource.initialize();
        console.log("✅ Database connected.");

        const tenantId = '28c5e8aa-5270-4299-b062-2414575019b9';
        const schemaName = `tenant_${tenantId.replace(/-/g, "_")}`;

        console.log(`\n🔍 Checking Schema: ${schemaName}`);
        
        // 1. Check if schema exists
        const schemaExists = await dataSource.query(`
            SELECT schema_name FROM information_schema.schemata WHERE schema_name = '${schemaName}';
        `);
        
        if (schemaExists.length === 0) {
            console.error(`❌ Schema ${schemaName} does NOT exist!`);
            
            // Check if tenant exists in public.tenants
            const tenantRecord = await dataSource.query(`SELECT * FROM public.tenants WHERE tenant_id = '${tenantId}'`);
            if (tenantRecord.length > 0) {
                console.log(`✅ Tenant record FOUND in public.tenants: ${tenantRecord[0].name} (ID: ${tenantRecord[0].tenant_id})`);
                console.log(`⚠️  ACTION REQUIRED: Run schema migration for this tenant.`);
            } else {
                console.error(`❌ Tenant record NOT FOUND in public.tenants. The JWT might be invalid or from an old DB.`);
            }
            return;
        } else {
            console.log(`✅ Schema exists.`);
        }

        // 2. Check Projects in Tenant Schema
        try {
            const projects = await dataSource.query(`SELECT * FROM "${schemaName}".project`);
            console.log(`\n📂 Found ${projects.length} projects in tenant schema:`);
            projects.forEach((p: any) => {
                console.log(` - [${p.project_id}] ${p.project_name} (Status: ${p.status})`);
            });
        } catch (e: any) {
            console.error(`❌ Error querying tenant projects: ${e.message}`);
        }

        // 3. Check for Leaked Projects in Public
        try {
            const publicProjects = await dataSource.query(`SELECT * FROM public.project WHERE tenant_id = '${tenantId}'`);
            console.log(`\n⚠️  Found ${publicProjects.length} leaked projects in PUBLIC schema:`);
             publicProjects.forEach((p: any) => {
                console.log(` - [${p.project_id}] ${p.project_name}`);
            });
        } catch (e) {
            console.log(`\n✅ No 'project' table in public schema (or empty).`);
        }

    } catch (error) {
        console.error("❌ Verification failed:", error);
    } finally {
        await dataSource.destroy();
    }
}

verifyProjects();
