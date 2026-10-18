import * as fs from "fs";
import * as path from "path";

// TypeORM orders migrations only by their leading timestamp
// (MigrationExecutor.sort((a, b) => a.timestamp - b.timestamp)). When two files
// share a timestamp the tie is broken by file-discovery order, which is not
// guaranteed. They also make `migration:revert` and fresh-DB rehearsals pick an
// arbitrary order. Executed migrations are tracked by class name, so a duplicate
// timestamp is silently tolerated at runtime — until an order-dependent pair
// bites. This guard fails the build on any NEW collision.
//
// The two pairs below already exist in deployed databases. Their class names are
// recorded in the `migrations` table, so renaming the file/timestamp would make
// TypeORM treat them as unapplied and re-run `up()` on the next deploy. They are
// grandfathered here instead of renamed.
const GRANDFATHERED: Record<string, string[]> = {
  public: ["1773500000000", "1774100000000"],
  tenant: [],
};

const MIGRATIONS_ROOT = path.join(__dirname, "..");

function collectMigrationTimestamps(dir: string): Map<string, string[]> {
  const found = new Map<string, string[]>();
  if (!fs.existsSync(dir)) return found;

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (entry.name === "__tests__") continue;
      for (const [ts, files] of collectMigrationTimestamps(path.join(dir, entry.name))) {
        found.set(ts, [...(found.get(ts) ?? []), ...files]);
      }
      continue;
    }
    if (!entry.name.endsWith(".ts") || entry.name.endsWith(".spec.ts")) continue;
    const match = /^(\d+)-/.exec(entry.name);
    if (!match) continue;
    const ts = match[1];
    found.set(ts, [...(found.get(ts) ?? []), entry.name]);
  }
  return found;
}

describe("migration timestamp uniqueness", () => {
  for (const scope of ["public", "tenant"]) {
    describe(scope, () => {
      it("has no duplicate timestamps beyond the grandfathered set", () => {
        const timestamps = collectMigrationTimestamps(path.join(MIGRATIONS_ROOT, scope));
        const allowed = new Set(GRANDFATHERED[scope] ?? []);

        const unexpected = [...timestamps.entries()]
          .filter(([ts, files]) => files.length > 1 && !allowed.has(ts))
          .map(([ts, files]) => `${ts}: ${files.join(", ")}`);

        expect(unexpected).toEqual([]);
      });

      it("still finds the grandfathered duplicates (remove them from the allow-list if fixed)", () => {
        const timestamps = collectMigrationTimestamps(path.join(MIGRATIONS_ROOT, scope));

        for (const ts of GRANDFATHERED[scope] ?? []) {
          expect((timestamps.get(ts) ?? []).length).toBeGreaterThan(1);
        }
      });
    });
  }
});
