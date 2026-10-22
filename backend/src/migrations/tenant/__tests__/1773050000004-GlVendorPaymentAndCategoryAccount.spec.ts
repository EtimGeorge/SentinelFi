import type { QueryRunner } from "typeorm";
import { GlVendorPaymentAndCategoryAccount1773050000004 } from "../1773050000004-GlVendorPaymentAndCategoryAccount";

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

describe("GlVendorPaymentAndCategoryAccount1773050000004", () => {
  it("scopes to the tenant schema before touching anything", async () => {
    const { runner, recorded } = recordingRunner("tenant_alpha");
    await new GlVendorPaymentAndCategoryAccount1773050000004().up(runner);
    expect(recorded[0]).toContain('SET search_path TO "tenant_alpha"');
  });

  it("adds VENDOR_PAYMENT enum value and maps category GL account", async () => {
    const { runner, recorded } = recordingRunner();
    await new GlVendorPaymentAndCategoryAccount1773050000004().up(runner);
    const sql = recorded.join("\n");
    expect(sql).toContain("ADD VALUE IF NOT EXISTS 'VENDOR_PAYMENT'");
    expect(sql).toContain('ALTER TABLE "budget_category" ADD COLUMN IF NOT EXISTS "gl_account_id"');
    expect(sql).toContain('"FK_budget_category_gl_account"');
  });
  it("drops the new budget_category column and index/FK on rollback", async () => {
    const { runner, recorded } = recordingRunner();
    await new GlVendorPaymentAndCategoryAccount1773050000004().down(runner);
    const sql = recorded.join("\n");
    expect(sql).toContain('"FK_budget_category_gl_account"');
    expect(sql).toContain('DROP INDEX IF EXISTS "IDX_budget_category_gl_account"');
    expect(sql).toContain('ALTER TABLE "budget_category" DROP COLUMN IF EXISTS "gl_account_id"');
  });
});
