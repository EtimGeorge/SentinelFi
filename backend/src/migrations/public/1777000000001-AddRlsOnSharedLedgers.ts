import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Defense-in-depth RLS on the SHARED public-schema tables that physically mix
 * multiple tenants' rows: audit_log and email_log.
 *
 * Isolation model: schema-per-tenant (ARCH-002) is the PRIMARY boundary — tenant
 * schemas are already physically separate. RLS adds a database-level backstop so a
 * regression in application WHERE-clauses can never surface another tenant's rows
 * from shared ledgers.
 *
 * The session variable `app.current_tenant_id` is set by TenancyAwareDataSource on
 * every connection (tenant uuid, or 'SYS' for platform/SuperAdmin/background
 * contexts). Unset/empty reads are treated as SYS so tooling and migrations that
 * run outside a request context keep working.
 *
 * FORCE ROW LEVEL SECURITY is required: the app role owns the tables, and owners
 * bypass RLS by default — without FORCE these policies would be decorative.
 */
export class AddRlsOnSharedLedgers1777000000001 implements MigrationInterface {
  name = "AddRlsOnSharedLedgers1777000000001";

  private async enableRlsForTable(
    queryRunner: QueryRunner,
    table: string,
    tenantColumn: string,
  ): Promise<void> {
    const rlsPredicate = `
      COALESCE(NULLIF(current_setting('app.current_tenant_id', true), ''), 'SYS') = 'SYS'
      OR ${tenantColumn}::text = NULLIF(COALESCE(NULLIF(current_setting('app.current_tenant_id', true), ''), 'SYS'), 'SYS')
    `;

    await queryRunner.query(`ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY`);
    await queryRunner.query(
      `DROP POLICY IF EXISTS "tenant_isolation" ON ${table}`,
    );
    // FOR ALL covers SELECT/INSERT/UPDATE/DELETE; INSERT/UPDATE enforce WITH CHECK
    await queryRunner.query(
      `CREATE POLICY "tenant_isolation" ON ${table}
       FOR ALL
       USING (${rlsPredicate})
       WITH CHECK (${rlsPredicate})`,
    );
    await queryRunner.query(`ALTER TABLE ${table} FORCE ROW LEVEL SECURITY`);
  }

  public async up(queryRunner: QueryRunner): Promise<void> {
    // audit_log uses camelCase "tenantId" (entity maps no explicit column name)
    await this.enableRlsForTable(queryRunner, '"public"."audit_log"', '"tenantId"');
    await this.enableRlsForTable(queryRunner, '"public"."email_log"', '"tenant_id"');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "public"."audit_log" NO FORCE ROW LEVEL SECURITY`,
    );
    await queryRunner.query(
      `DROP POLICY IF EXISTS "tenant_isolation" ON "public"."audit_log"`,
    );
    await queryRunner.query(`ALTER TABLE "public"."audit_log" DISABLE ROW LEVEL SECURITY`);

    await queryRunner.query(
      `ALTER TABLE "public"."email_log" NO FORCE ROW LEVEL SECURITY`,
    );
    await queryRunner.query(
      `DROP POLICY IF EXISTS "tenant_isolation" ON "public"."email_log"`,
    );
    await queryRunner.query(`ALTER TABLE "public"."email_log" DISABLE ROW LEVEL SECURITY`);
  }
}