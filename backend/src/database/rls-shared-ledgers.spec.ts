import { readFileSync } from "fs";
import { join } from "path";

/**
 * Regression guard for the RLS decision (ARCH-009 / Flaw D):
 * a tenant-scoped connection (app.current_tenant_id = <tenant>) must NEVER be
 * able to insert a null-tenant or wrong-tenant row into the shared ledgers.
 * We assert the SHIPPED policy source, because the unit-test suite has no live
 * Postgres. If anyone relaxes WITH CHECK to allow `tenantColumn IS NULL`, these
 * tests fail so the decision cannot silently regress.
 */
describe("RLS shared-ledger policy invariants", () => {
  const migrationSource = readFileSync(
    join(
      __dirname,
      "..",
      "migrations",
      "public",
      "1777000000001-AddRlsOnSharedLedgers.ts",
    ),
    "utf8",
  );

  it("forces row-level security (owner bypass would be decorative otherwise)", () => {
    expect(migrationSource).toContain("FORCE ROW LEVEL SECURITY");
    expect(migrationSource).toMatch(/ALTER TABLE \S+ FORCE ROW LEVEL SECURITY/);
  });

  it("keys the policy on the app.current_tenant_id session variable", () => {
    expect(migrationSource).toContain("app.current_tenant_id");
    expect(migrationSource).toMatch(
      /current_setting\('app\.current_tenant_id', true\)/,
    );
  });

  it("has NO null-tenant escape hatch for tenant-scoped connections", () => {
    // The ONLY broad bypass allowed is the SYS marker (platform/system).
    // A permissive `tenantId IS NULL OR ...` branch would let any tenant write
    // un-attributable rows that are invisible to normal tenant queries.
    expect(migrationSource).not.toContain('"tenantId" IS NULL');
    expect(migrationSource).not.toContain('"tenant_id" IS NULL');
    expect(migrationSource).not.toMatch(
      /tenantId[^,)]*\s+IS NULL\s+OR/i,
    );
  });

  it("enforces WITH CHECK (INSERT/UPDATE) as strictly as USING (SELECT)", () => {
    // Both clauses must be present and must reference the same predicate.
    expect(migrationSource).toContain("WITH CHECK");
    const usingBlock = migrationSource.match(/USING \(([\s\S]*?)\)/);
    const checkBlock = migrationSource.match(/WITH CHECK \(([\s\S]*?)\)/);
    expect(usingBlock).not.toBeNull();
    expect(checkBlock).not.toBeNull();
    // Normalize whitespace; the per-column condition may differ (tenantId vs
    // tenant_id) but the policy shape is identical across both tables.
    const strip = (s: string) => s.replace(/\s+/g, " ").trim();
    expect(strip(checkBlock![1])).toEqual(strip(usingBlock![1]));
  });

  it("covers every shared tenant-mixing ledger table", () => {
    expect(migrationSource).toContain('"public"."audit_log"');
    expect(migrationSource).toContain('"public"."email_log"');
  });
});