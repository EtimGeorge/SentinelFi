import type { QueryRunner } from "typeorm";
import { CreateVendorMaster1777000000005 } from "../1777000000005-CreateVendorMaster";

function recordingRunner(schema = "tenant_alpha") {
  const recorded: string[] = [];
  const runner = {
    connection: { options: { type: "postgres", schema } },
    query: jest.fn(async (sql: string) => {
      recorded.push(sql);
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
