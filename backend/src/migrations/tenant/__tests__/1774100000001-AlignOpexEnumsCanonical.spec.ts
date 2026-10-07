import type { QueryRunner } from "typeorm";
import { AlignOpexEnumsCanonicalTenant1774100000001 } from "../1774100000001-AlignOpexEnumsCanonical";

/**
 * This migration used to interpolate the literal `solution_energy` into every
 * statement, so running it for any other tenant mutated the WRONG tenant's enum
 * types and values. These tests pin the properties that make it safe: it
 * derives its schema from the DataSource it is handed, and it re-reads pg_enum
 * before altering anything instead of assuming a starting shape.
 */
interface Recorded {
  sql: string;
  params: unknown[];
}

function recordingRunner(
  schema: string,
  options: {
    typeExists?: boolean;
    labelsByType?: Record<string, string[]>;
  } = {},
) {
  const { typeExists = true, labelsByType = {} } = options;
  const recorded: Recorded[] = [];

  const runner = {
    connection: { options: { type: "postgres", schema } },
    query: jest.fn(async (sql: string, params?: unknown[]) => {
      recorded.push({ sql, params: params ?? [] });
      if (sql.includes("FROM pg_type t")) {
        return typeExists ? [{ oid: 12345 }] : [];
      }
      if (sql.includes("to_regclass")) return [{ oid: 999 }];
      if (sql.includes("pg_enum")) {
        // params[0] is the type name; each enum has its own label set.
        const typeName = String(params?.[0] ?? "");
        return (labelsByType[typeName] ?? []).map((l) => ({ label: l }));
      }
      return [];
    }),
  } as unknown as QueryRunner;

  return { runner, recorded };
}

const TYPE_ENUM = "operational_budget_type_enum";
const STATUS_ENUM = "operational_budget_status_enum";

const CANONICAL = {
  [TYPE_ENUM]: [
    "company_wide",
    "departmental",
    "project_specific",
    "recurring",
  ],
  [STATUS_ENUM]: ["active", "inactive", "archived"],
};

const sqlOf = (recorded: Recorded[]) => recorded.map((r) => r.sql).join("\n");
const paramsOf = (recorded: Recorded[]) =>
  recorded
    .flatMap((r) => r.params)
    .filter((p): p is string => typeof p === "string");

describe("AlignOpexEnumsCanonical tenant scoping", () => {
  it("never hardcodes a tenant schema name", async () => {
    const { runner, recorded } = recordingRunner("some_other_tenant");
    await new AlignOpexEnumsCanonicalTenant1774100000001().up(runner);

    const sql = sqlOf(recorded);
    for (const forbidden of [
      "solution_energy",
      "saencrystal_global_services",
    ]) {
      expect(sql).not.toContain(forbidden);
    }
  });

  it("scopes search_path to the schema on the query runner's DataSource", async () => {
    const { runner, recorded } = recordingRunner("some_other_tenant");
    await new AlignOpexEnumsCanonicalTenant1774100000001().up(runner);

    expect(
      recorded.some((r) =>
        /SET\s+search_path\s+TO\s+"?some_other_tenant"?/i.test(r.sql),
      ),
    ).toBe(true);
  });

  it("passes type and table names as bind parameters, not interpolated SQL", async () => {
    const { runner, recorded } = recordingRunner("some_other_tenant");
    await new AlignOpexEnumsCanonicalTenant1774100000001().up(runner);

    const params = paramsOf(recorded);
    expect(params).toContain("operational_budget_type_enum");
    expect(params).toContain("operational_budget_status_enum");
    expect(params).toContain("operational_budget");
    expect(sqlOf(recorded)).not.toContain("operational_budget_type_enum");
  });

  it("reads enum labels from the current schema, not a global lookup", async () => {
    const { runner, recorded } = recordingRunner("some_other_tenant");
    await new AlignOpexEnumsCanonicalTenant1774100000001().up(runner);

    const enumQuery = recorded.find((r) => r.sql.includes("pg_enum"));
    expect(enumQuery).toBeDefined();
    expect(enumQuery!.sql).toContain("current_schema()");
    expect(enumQuery!.sql).toContain("enumtypid");
  });

  it("leaves an already-canonical schema untouched", async () => {
    const { runner, recorded } = recordingRunner("some_other_tenant", {
      labelsByType: CANONICAL,
    });

    await new AlignOpexEnumsCanonicalTenant1774100000001().up(runner);

    const sql = sqlOf(recorded);
    expect(sql).not.toContain("ALTER TYPE");
    expect(sql).not.toContain("USING");
  });

  it("skips a schema that has no such enum type instead of guessing", async () => {
    const { runner, recorded } = recordingRunner("some_other_tenant", {
      typeExists: false,
      labelsByType: { [TYPE_ENUM]: ["company-wide"] },
    });

    await new AlignOpexEnumsCanonicalTenant1774100000001().up(runner);

    expect(sqlOf(recorded)).not.toContain("ALTER TYPE");
  });

  it("refuses to guess a legacy value that has no canonical mapping", async () => {
    const { runner } = recordingRunner("some_other_tenant", {
      labelsByType: {
        ...CANONICAL,
        [TYPE_ENUM]: ["company-wide", "totally-unmapped"],
      },
    });

    await expect(
      new AlignOpexEnumsCanonicalTenant1774100000001().up(runner),
    ).rejects.toThrow(/totally-unmapped/);
  });

  it("converts legacy labels to the canonical ones", async () => {
    const { runner, recorded } = recordingRunner("some_other_tenant", {
      labelsByType: {
        [TYPE_ENUM]: ["company-wide", "departmental", "recurring"],
        [STATUS_ENUM]: ["active", "closed", "archived"],
      },
    });

    await new AlignOpexEnumsCanonicalTenant1774100000001().up(runner);

    const sql = sqlOf(recorded);
    expect(sql).toContain("company-wide");
    expect(sql).toContain("company_wide");
    expect(sql).toContain("closed");
    expect(sql).toContain("inactive");
  });

  it("is also schema-agnostic on the way back down", async () => {
    const { runner, recorded } = recordingRunner("some_other_tenant", {
      labelsByType: CANONICAL,
    });

    await new AlignOpexEnumsCanonicalTenant1774100000001().down(runner);

    expect(sqlOf(recorded)).not.toContain("solution_energy");
  });
});
