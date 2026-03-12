
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

const dataSource = new DataSource({
    type: "postgres",
    url: process.env.DATABASE_URL,
    ssl: false,
});

async function insectTable() {
    try {
        await dataSource.initialize();
        console.log(`\n🔍 Listing PROJECTS in 'solution_energy' schema:`);
        const projects = await dataSource.query(`
            SELECT project_id, project_name, status, tenant_id
            FROM "solution_energy"."project";
        `);
        console.log(JSON.stringify(projects, null, 2));
        


    } catch (error) {
        console.error("❌ Inspection failed:", error);
    } finally {
        await dataSource.destroy();
    }
}

insectTable();
