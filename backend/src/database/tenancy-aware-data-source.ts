import { DataSource, DataSourceOptions, QueryRunner } from "typeorm";
import { ClsService } from "nestjs-cls";

/**
 * Custom DataSource that wraps the standard TypeORM DataSource to implement multi-tenancy.
 * It uses the 'nestjs-cls' service (Async Local Storage) to retrieve the current tenant's
 * schema name and ensures that every QueryRunner created sets the PostgreSQL 'search_path'
 * to that schema.
 */
export class TenancyAwareDataSource extends DataSource {
  constructor(
    options: DataSourceOptions,
    private readonly cls: ClsService,
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

    // Override the connect method of the QueryRunner
    queryRunner.connect = async () => {
      // 1. Establish the physical connection using the original method
      await originalConnect();

      // 2. Retrieve the schema name from the CLS context
      // The context is populated by the TenancyMiddleware
      const schemaName = this.cls.get("SCHEMA_NAME") || "public";

      // 3. Set the search_path for this connection session
      // This ensures all subsequent queries on this runner use the correct schema
      if (schemaName) {
        // Sanitize schemaName to prevent SQL injection (basic check)
        const sanitizedSchema = schemaName.replace(/[^a-z0-9_]/gi, "");
        await queryRunner.query(
          `SET search_path TO ${sanitizedSchema}, public`,
        );
      }
    };

    return queryRunner;
  }
}
