import { DataSource, DataSourceOptions, QueryRunner } from "typeorm";
import { ClsService, ClsServiceManager } from "nestjs-cls";

/**
 * Custom DataSource that wraps the standard TypeORM DataSource to implement multi-tenancy.
 * It uses the 'nestjs-cls' service (Async Local Storage) to retrieve the current tenant's
 * schema name and ensures that every QueryRunner created sets the PostgreSQL 'search_path'
 * to that schema.
 */
export class TenancyAwareDataSource extends DataSource {
  constructor(
    options: DataSourceOptions,
    private readonly cls?: ClsService,
  ) {
    super(options);
  }

  /**
   * Overrides the default createQueryRunner to inject tenant context.
   * @param mode Replication mode (master/slave) - passed through to super
   */
  createQueryRunner(mode?: "master" | "slave"): QueryRunner {
    const queryRunner = super.createQueryRunner(mode);
    const originalConnect = queryRunner.connect.bind(queryRunner);
    let isSwitching = false;

    // Override the connect method of the QueryRunner
    queryRunner.connect = async () => {
      let correlationId = "N/A";
      let schemaName = "public";

      try {
        const cls = ClsServiceManager.getClsService();
        correlationId = cls.get("correlationId") || "N/A";
        schemaName = cls.get("SCHEMA_NAME") || "public";
      } catch (e) {
        // CLS not available in this context (e.g. background task)
      }

      // 1. Establish the physical connection
      // We MUST return the connection object that TypeORM expects
      const connection = await originalConnect();

      // 2. Set search_path if not public and not currently switching (recursion guard)
      if (schemaName && schemaName !== "public" && !isSwitching) {
        isSwitching = true;
        try {
          const sanitizedSchema = schemaName.replace(/[^a-z0-9_]/gi, "");
          const setSearchPath = async () => {
            if (
              this.driver &&
              typeof (this.driver as any).query === "function"
            ) {
              await (this.driver as any).query(
                `SET search_path TO ${sanitizedSchema}, public`,
                undefined,
                queryRunner,
              );
            } else {
              await queryRunner.query(
                `SET search_path TO ${sanitizedSchema}, public`,
              );
            }
          };

          try {
            await setSearchPath();
          } catch (firstErr: any) {
            // If a previous query left the connection in a broken transaction state,
            // issue ROLLBACK to clean it up and retry the search_path switch.
            if (firstErr?.message?.includes("current transaction is aborted")) {
              console.warn(
                `[TenancyAwareDataSource][CID: ${correlationId}] Recovering from aborted transaction, issuing ROLLBACK and retrying...`,
              );
              try {
                await queryRunner.query("ROLLBACK");
              } catch (_rollbackErr) {
                // ROLLBACK itself might fail if no transaction is active, that's OK
              }
              await setSearchPath();
            } else {
              throw firstErr;
            }
          }
        } catch (err) {
          console.error(
            `[TenancyAwareDataSource][CID: ${correlationId}] Connection/Schema switch failed:`,
            err,
          );
          throw err;
        } finally {
          isSwitching = false;
        }
      }

      return connection;
    };

    return queryRunner;
  }
}
