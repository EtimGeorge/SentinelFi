import type { QueryRunner } from "typeorm";
import { CreateVendorMaster1777000000005 } from "../1777000000005-CreateVendorMaster";

function recordingRunner(schema = "tenant_alpha", existingTables?: string[]) {
  const recorded: string[] = [];
  const runner = {
    connection: { options: { type: "postgres", schema } },
    query: jest.fn(async (sql: string, params?: unknown[]) => {
      recorded.push(sql);
      // Existence probes: report the tables this schema is assumed to have.
      if (sql.includes("information_schema.tables")) {
        const table = Array.isArray(params) ? String(params[0]) : undefined;
        const present =
          table === undefined
            ? true
            : existingTables === undefined || existingTables.includes(table);
        return present ? [{ present: 1 }] : [];
      }
      return [];
    }),
  } as unknown as QueryRunner;
  return { runner, recorded };
}

describe("CreateVendorMaster1777000000005", () => {
  it("scopes to the tenant schema before touching anything", async () => {
    const { runner, recorded } = recordingRunner("tenant_alpha");
    await new CreateVendorMaster1777000000005().up(runner);
    expect(recorded[0]).toContain('SET search_path TO "tenant_alpha"');
  });

  it("creates the vendor table and the status enum", async () => {
    const { runner, recorded } = recordingRunner();
    await new CreateVendorMaster1777000000005().up(runner);
    const sql = recorded.join("\n");
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS "vendor"');
    expect(sql).toContain('CREATE TYPE "vendor_status_enum"');
    expect(sql).toContain(
      'UQ_vendor_tenant_code" ON "vendor" ("tenant_id", "code")',
    );
  });

  it("links the three P2P documents to the vendor master", async () => {
    const { runner, recorded } = recordingRunner();
    await new CreateVendorMaster1777000000005().up(runner);
    const sql = recorded.join("\n");
    for (const table of [
      "p2p_requisition",
      "p2p_purchase_order",
      "p2p_invoice",
    ]) {
      expect(sql).toContain(
        `ALTER TABLE "${table}" ADD COLUMN IF NOT EXISTS "vendor_id"`,
      );
      expect(sql).toContain(`FK_${table}_vendor`);
    }
  });

  it("creates vendor even when a legacy schema lacks a P2P table, skipping only that link", async () => {
    const { runner, recorded } = recordingRunner("tenant_alpha", [
      "p2p_requisition",
      "p2p_purchase_order",
      // p2p_invoice absent
    ]);
    await new CreateVendorMaster1777000000005().up(runner);
    const sql = recorded.join("\n");
    // The migration's own DDL must still run — it is what creates vendor.
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS "vendor"');
    expect(sql).toContain(
      `ALTER TABLE "p2p_requisition" ADD COLUMN IF NOT EXISTS "vendor_id"`,
    );
    expect(sql).not.toContain(
      `ALTER TABLE "p2p_invoice" ADD COLUMN IF NOT EXISTS "vendor_id"`,
    );
  });

  // Regression: pg_type / pg_constraint are GLOBAL catalogs. An unscoped
  // `typname` / `conname` probe matches the row in every OTHER tenant schema and
  // ignores the search_path set at the top of `up()`, so the second tenant to
  // run this migration would skip the CREATE and then fail on the missing type.
  // Both guards must therefore be namespaced to the current schema.
  describe("catalog guards are scoped to the tenant schema", () => {
    it("scopes the enum existence check to the current namespace", async () => {
      const { runner, recorded } = recordingRunner("tenant_beta");
      await new CreateVendorMaster1777000000005().up(runner);

      const enumGuard = recorded.find((sql) => sql.includes("vendor_status_enum"));
      expect(enumGuard).toBeDefined();

      // Must join pg_type to pg_namespace and filter on it.
      expect(enumGuard).toContain("FROM pg_type");
      expect(enumGuard).toContain("JOIN pg_namespace");
      expect(enumGuard).toContain("n.nspname = current_schema()");
      // The buggy form matched every schema's enum — must not survive.
      expect(enumGuard).not.toContain("FROM pg_type WHERE typname");
    });

    it("scopes each FK existence check to schema + table", async () => {
      const { runner, recorded } = recordingRunner("tenant_beta");
      await new CreateVendorMaster1777000000005().up(runner);

      const fkGuards = recorded.filter((sql) => sql.includes("pg_constraint"));
      expect(fkGuards).toHaveLength(3);

      for (const table of [
        "p2p_requisition",
        "p2p_purchase_order",
        "p2p_invoice",
      ]) {
        const guard = fkGuards.find((sql) => sql.includes(`FK_${table}_vendor`));
        expect(guard).toBeDefined();
        expect(guard).toContain("JOIN pg_namespace");
        expect(guard).toContain("n.nspname = current_schema()");
        expect(guard).toContain(`t.relname = '${table}'`);
        // The buggy form saw every other tenant's FK.
        expect(guard).not.toContain("FROM pg_constraint WHERE conname");
      }
    });
  });

  it("drops columns, links, table and enum on rollback", async () => {
    const { runner, recorded } = recordingRunner();
    await new CreateVendorMaster1777000000005().down(runner);
    const sql = recorded.join("\n");
    expect(sql).toContain(
      `ALTER TABLE "p2p_invoice" DROP COLUMN IF EXISTS "vendor_id"`,
    );
    expect(sql).toContain('DROP TABLE IF EXISTS "vendor"');
    expect(sql).toContain('DROP TYPE IF EXISTS "vendor_status_enum"');
  });
});
