
import { DataSource } from "typeorm";
import * as dotenv from "dotenv";
import * as path from "path";

// Load environment variables from .env.local if available, otherwise .env
dotenv.config({ path: path.join(__dirname, "../.env.local") });
if (!process.env.DATABASE_URL) {
  dotenv.config({ path: path.join(__dirname, "../.env") });
}

console.log("Using DATABASE_URL:", process.env.DATABASE_URL ? "Set" : "Not Set");

const dataSource = new DataSource({
  type: "postgres",
  url: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function checkColumns() {
    try {
        await dataSource.initialize();
        console.log("Connected to DB.");

        const columns = await dataSource.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'user'
        `);
        
        console.log("Columns in 'user' table:");
        console.table(columns);

        const migrations = await dataSource.query(`SELECT * FROM "public_migrations" ORDER BY "id" DESC LIMIT 5`);
        console.log("Recent Migrations:");
        console.table(migrations);

        await dataSource.destroy();
    } catch (error) {
        console.error("Error:", error);
    }
}

checkColumns();
