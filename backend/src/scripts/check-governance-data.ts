import { NestFactory } from "@nestjs/core";
import { AppModule } from "../app.module";
import { FinanceCoreService } from "../finance-core/finance-core.service";
import { WbsService } from "../wbs/wbs.service";
import { ClsService } from "nestjs-cls";
import { DataSource } from "typeorm";

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ["error", "warn"],
  });
  const cls = app.get(ClsService);
  const dataSource = app.get(DataSource);

  // 1. Identify a tenant (get the first one for diagnostics)
  const tenant = await dataSource.query(
    `SELECT tenant_id, name, schema_name FROM public.tenant LIMIT 1`,
  );

  if (!tenant || tenant.length === 0) {
    console.log("❌ No tenants found in database.");
    await app.close();
    return;
  }

  const { tenant_id, name, schema_name } = tenant[0];
  console.log(`\n🔍 Running Diagnostics for Tenant: ${name} (${tenant_id})`);
  console.log(`📡 Target Schema: ${schema_name}`);

  await cls.run(async () => {
    cls.set("tenant_id", tenant_id);
    cls.set("SCHEMA_NAME", schema_name);

    console.log("\n--- OPEX DATA (Document Status) ---");
    try {
      const requisitions = await dataSource.query(
        `SELECT status, count(*) FROM ${schema_name}.p2p_requisition GROUP BY status`,
      );
      console.table(requisitions);
    } catch (e: any) {
      console.log(`❌ Error fetching requisitions: ${e.message}`);
    }

    console.log("\n--- CAPEX DATA (WBS Budget Status) ---");
    try {
      const budgets = await dataSource.query(
        `SELECT status, count(*) FROM ${schema_name}.wbs_budget GROUP BY status`,
      );
      console.table(budgets);
    } catch (e: any) {
      console.log(`❌ Error fetching budgets: ${e.message}`);
    }

    console.log("\n--- PROJECT DATA ---");
    try {
      const projects = await dataSource.query(
        `SELECT count(*) as total_projects FROM ${schema_name}.project`,
      );
      console.log(`Total Projects: ${projects[0].total_projects}`);
    } catch (e: any) {
      console.log(`❌ Error fetching projects: ${e.message}`);
    }
  });

  await app.close();
}

bootstrap();
