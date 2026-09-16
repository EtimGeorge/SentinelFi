  /**
   * Regression guard (Flaw D): tenant-scoped sessions must NOT be able to
   * insert NULL-tenant rows into shared ledgers. If this test ever fails,
   * someone loosened the RLS WITH CHECK policy — treat it as a security
   * incident, not a flaky test.
   *
   * NOTE: requires a live Postgres (skipped without DATABASE_URL). Run in CI
   * against the ephemeral test database, after public migrations.
   */
  describe.each([
    {
      table: "audit_log",
      tenantColumn: "tenantId",
      insertCols:
        '"id", "userId", "action", "actionType", "timestamp", "tenantId"',
      insertSysValues: (id: string) =>
        `$1, NULL, 'RLS_PROBE', 'RLS_PROBE', now(), NULL /* id ${id} */`,
      insertDenyValues:
        "gen_random_uuid(), NULL, 'RLS_PROBE', 'RLS_PROBE', now(), NULL",
    },
    {
      table: "email_log",
      tenantColumn: "tenant_id",
      insertCols:
        '"id", "to", "subject", "provider", "status", "sent_at", "tenant_id"',
      insertSysValues: (id: string) =>
        `$1, 'rls-probe-${id.slice(-12)}@test.local', 'RLS_PROBE', 'smtp', 'sent', now(), NULL`,
      insertDenyValues:
        "gen_random_uuid(), 'rls-probe-deny@test.local', 'RLS_PROBE', 'smtp', 'sent', now(), NULL",
    },
  ])("RLS null-tenant write block on $table", ({ table, tenantColumn, insertCols, insertSysValues, insertDenyValues }) => {
    const dsn =
      process.env.TEST_DATABASE_URL || process.env.DATABASE_URL || "";
    const canRun = /^postgres(ql)?:\/\//.test(dsn);
    const itLive = canRun ? it : it.skip;

    itLive("rejects NULL-tenant insert from a tenant-scoped session", async () => {
      const { Client } = require("pg") as typeof import("pg");
      const client = new Client({
        connectionString: dsn,
        ssl: { rejectUnauthorized: false },
      });
      await client.connect();
      try {
        await client.query(
          `SET app.current_tenant_id = '11111111-1111-4111-8111-111111111111'`,
        );
        await expect(
          client.query(
            `INSERT INTO "public"."${table}" (${insertCols}) VALUES (${insertDenyValues})`,
          ),
        ).rejects.toThrow(/row-level security|policy/i);
      } finally {
        await client.end().catch(() => {});
      }
    });

    itLive("allows NULL-tenant insert from an explicit SYS session", async () => {
      const { Client } = require("pg") as typeof import("pg");
      const client = new Client({
        connectionString: dsn,
        ssl: { rejectUnauthorized: false },
      });
      await client.connect();
      const rowId = `00000000-0000-4000-8000-${Date.now()
        .toString(16)
        .padStart(12, "0")}`;
      try {
        await client.query(`SET app.current_tenant_id = 'SYS'`);
        await client.query(
          `INSERT INTO "public"."${table}" (${insertCols}) VALUES (${insertSysValues(rowId)})`,
          [rowId],
        );
      } finally {
        await client
          .query(`DELETE FROM "public"."${table}" WHERE "id" = $1`, [rowId])
          .catch(() => {});
        await client.end().catch(() => {});
      }
    });
  });
