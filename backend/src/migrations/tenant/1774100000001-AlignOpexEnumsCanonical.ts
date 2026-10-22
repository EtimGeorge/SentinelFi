import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Aligns the tenant-schema operational_budget enum types with the canonical
 * shared/types enum values.
 *
 * SCHEMA HANDLING: this resolves the target schema from the DataSource `schema`
 * option and then works through `search_path` with UNQUALIFIED names, which is
 * the convention used by the other tenant migrations (see
 * 1773050000001-OpexEncumbranceAndReceiptTenant.ts). An earlier revision of
 * this file hardcoded the literal schema `solution_energy` in every statement,
 * which meant running it for any other tenant mutated solution_energy instead
 * of the tenant actually being migrated, and failed outright on a new tenant.
 *
 * IDEMPOTENCE: the legacy label set and the canonical label set are read from
 * `pg_enum` first. If the column already carries the canonical labels the
 * migration returns without touching anything, so a re-run is a no-op rather
 * than a `RENAME TO ..._old` collision.
 *
 * Canonical values after this migration:
 *   type:   company_wide | departmental | project_specific | recurring
 *   status: active | inactive | archived
 */
export class AlignOpexEnumsCanonicalTenant1774100000001 implements MigrationInterface {
  name = "AlignOpexEnumsCanonicalTenant1774100000001";

  public async up(queryRunner: QueryRunner): Promise<void> {
    const schema = (queryRunner.connection.options as any).schema;
    if (schema) {
      await queryRunner.query(`SET search_path TO "${schema}", public`);
    }

    await this.alignEnumColumn(queryRunner, {
      typeName: "operational_budget_type_enum",
      table: "operational_budget",
      column: "type",
      canonical: [
        "company_wide",
        "departmental",
        "project_specific",
        "recurring",
      ],
      // Values that exist today but not in the canonical set.
      mapping: { "company-wide": "company_wide" },
      defaultValue: "company_wide",
    });

    await this.alignEnumColumn(queryRunner, {
      typeName: "operational_budget_status_enum",
      table: "operational_budget",
      column: "status",
      canonical: ["active", "inactive", "archived"],
      mapping: { closed: "inactive" },
      defaultValue: "active",
    });
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const schema = (queryRunner.connection.options as any).schema;
    if (schema) {
      await queryRunner.query(`SET search_path TO "${schema}", public`);
    }

    // Reverting re-canonicalises to the legacy vocabulary. Values with no
    // legacy counterpart (project_specific, inactive) are folded onto the
    // closest legacy label so the cast can never fail.
    await this.alignEnumColumn(queryRunner, {
      typeName: "operational_budget_type_enum",
      table: "operational_budget",
      column: "type",
      canonical: ["departmental", "company-wide", "recurring"],
      mapping: {
        company_wide: "company-wide",
        project_specific: "recurring",
      },
      defaultValue: "company-wide",
    });

    await this.alignEnumColumn(queryRunner, {
      typeName: "operational_budget_status_enum",
      table: "operational_budget",
      column: "status",
      canonical: ["active", "closed", "archived"],
      mapping: { inactive: "closed" },
      defaultValue: "active",
    });
  }

  /**
   * Rewrites a single enum-backed column onto a canonical label set.
   *
   * The rewrite is the usual rename/create/cast/drop dance, but it is driven by
   * the labels actually present in the database rather than by assumptions, and
   * it refuses to run when a stored value cannot be mapped. Guessing there would
   * either abort the transaction mid-migration or silently rewrite a tenant's
   * budget rows to a value nobody chose.
   */
  private async alignEnumColumn(
    queryRunner: QueryRunner,
    opts: {
      typeName: string;
      table: string;
      column: string;
      canonical: string[];
      mapping: Record<string, string>;
      defaultValue: string;
    },
  ): Promise<void> {
    const { typeName, table, column, canonical, mapping, defaultValue } = opts;

    // The enum type itself must exist in the tenant schema.
    const typeRows: Array<{ oid: number }> = await queryRunner.query(
      `SELECT t.oid
         FROM pg_type t
         JOIN pg_namespace n ON n.oid = t.typnamespace
        WHERE t.typname = $1
          AND n.nspname = current_schema()`,
      [typeName],
    );
    if (typeRows.length === 0) {
      return; // Nothing to align in this schema.
    }

    // So must the table carrying it.
    const tableRows: Array<{ oid: number }> = await queryRunner.query(
      `SELECT to_regclass($1)::oid AS oid`,
      [table],
    );
    if (tableRows.length === 0 || !tableRows[0].oid) {
      return;
    }

    const labelRows: Array<{ label: string }> = await queryRunner.query(
      `SELECT e.enumlabel AS label
         FROM pg_enum e
         JOIN pg_type t ON t.oid = e.enumtypid
         JOIN pg_namespace n ON n.oid = t.typnamespace
        WHERE t.typname = $1
          AND n.nspname = current_schema()
        ORDER BY e.enumsortorder`,
      [typeName],
    );

    const labels = labelRows.map((r) => r.label);
    const canonicalSet = new Set(canonical);
    const needsRewrite = labels.some((l) => !canonicalSet.has(l));

    if (!needsRewrite) {
      return; // Already canonical: a re-run must not try to RENAME a live type.
    }

    // Build the value mapping from what is really stored, and refuse to guess.
    const assignments: Array<{ from: string; to: string }> = [];
    for (const label of labels) {
      const target = mapping[label] ?? (canonicalSet.has(label) ? label : null);
      if (target === null) {
        throw new Error(
          `[AlignOpexEnumsCanonical] Cannot migrate "${table}"."${column}": ` +
            `stored value '${label}' has no canonical mapping. ` +
            `Add it to the migration's mapping table before running.`,
        );
      }
      assignments.push({ from: label, to: target });
    }

    const legacyName = `${typeName}_legacy`;
    const quote = (v: string) => `'${v.replace(/'/g, "''")}'`;
    const caseExpr = assignments
      .map((a) => `WHEN ${quote(a.from)} THEN ${quote(a.to)}::"${typeName}"`)
      .join("\n                     ");

    await queryRunner.query(
      `ALTER TYPE "${typeName}" RENAME TO "${legacyName}"`,
    );
    await queryRunner.query(
      `CREATE TYPE "${typeName}" AS ENUM(${canonical
        .map((c) => quote(c))
        .join(", ")})`,
    );
    await queryRunner.query(
      `ALTER TABLE "${table}" ALTER COLUMN "${column}" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "${table}"
         ALTER COLUMN "${column}" TYPE "${typeName}"
         USING (
           CASE "${column}"::text
                     ${caseExpr}
             ELSE "${column}"::text::"${typeName}"
           END
         )`,
    );
    await queryRunner.query(
      `ALTER TABLE "${table}" ALTER COLUMN "${column}" SET DEFAULT ${quote(
        defaultValue,
      )}::"${typeName}"`,
    );
    await queryRunner.query(`DROP TYPE "${legacyName}"`);
  }
}
