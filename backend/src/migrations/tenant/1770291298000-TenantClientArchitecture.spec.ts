import type { QueryRunner } from "typeorm";
import { TenantClientArchitecture1770291298000 } from "./1770291298000-TenantClientArchitecture";

describe("TenantClientArchitecture schema isolation", () => {
  let statements: string[];

  beforeEach(async () => {
    statements = [];
    const runner = {
      query: jest.fn(async (sql: string) => { statements.push(sql); }),
    } as unknown as QueryRunner;
    await new TenantClientArchitecture1770291298000().up(runner);
  });

  it("checks project.client_id only in the migrating tenant schema", () => {
    const sql = statements.find(statement => statement.includes("information_schema.columns"));
    expect(sql).toContain("table_schema = current_schema()");
    expect(sql).toContain("table_name = 'project'");
    expect(sql).toContain("column_name = 'client_id'");
    expect(sql).toContain('ALTER TABLE "project" ADD "client_id" uuid');
  });

  it("does not reuse an enum from another tenant", () => {
    const sql = statements.find(statement => statement.includes("FROM pg_type"));
    expect(sql).toContain("typnamespace = current_schema()::regnamespace");
  });

  it.each([
    ["FK_clients_tenant", "clients"],
    ["FK_project_client", "project"],
    ["FK_ceo_annotation_author", "ceo_annotation"],
  ])("scopes %s to the current schema and its table", (constraint, table) => {
    const sql = statements.join("\n");
    expect(sql).toContain(
      `conname = '${constraint}' AND connamespace = current_schema()::regnamespace AND conrelid = '${table}'::regclass`,
    );
  });
});
