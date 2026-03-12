
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

async function checkDatabase() {
    try {
        await dataSource.initialize();
        console.log("Connected to DB.");

        const ratesCount = await dataSource.query(`SELECT COUNT(*) FROM "currency_exchange_rates"`);
        console.log("Total rates in database:", ratesCount[0].count);

        if (ratesCount[0].count > 0) {
            const rates = await dataSource.query(`SELECT * FROM "currency_exchange_rates" LIMIT 10`);
            console.log("Sample rates:");
            console.table(rates);
        } else {
            console.log("No rates found in 'currency_exchange_rates' table.");
        }

        await dataSource.destroy();
    } catch (error) {
        console.error("Error:", error);
    }
}

checkDatabase();
