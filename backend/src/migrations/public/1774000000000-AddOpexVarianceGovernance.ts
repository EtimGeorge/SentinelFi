import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";
import { VarianceFlag } from "shared/types";

export class AddOpexVarianceGovernance1774000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // We add these columns to all tenant schemas.
    // To do this, we query all schemas that look like tenants (e.g., using a regex or known prefix).
    // In our architecture, the `tenant` schema contains the true metadata, but the specific
    // operational_expense tables reside inside the individual tenant schema.
    
    // Get all schemas 
    const schemas = await queryRunner.query(
      `SELECT schema_name FROM information_schema.schemata WHERE schema_name != 'public' AND schema_name != 'information_schema' AND schema_name != 'pg_catalog' AND schema_name != 'pg_toast'`
    );

    for (const { schema_name } of schemas) {
      const tableExists = await queryRunner.hasTable(`${schema_name}.operational_expense`);
      if (tableExists) {
        // Add variance_flag
        const hasVarianceFlag = await queryRunner.hasColumn(`${schema_name}.operational_expense`, 'variance_flag');
        if (!hasVarianceFlag) {
          await queryRunner.addColumn(
            `${schema_name}.operational_expense`,
            new TableColumn({
              name: 'variance_flag',
              type: 'varchar',
              length: '255',
              default: `'${VarianceFlag.NO_VARIANCE}'`,
              isNullable: false,
            }),
          );
        }

        // Add override_reason
        const hasOverrideReason = await queryRunner.hasColumn(`${schema_name}.operational_expense`, 'override_reason');
        if (!hasOverrideReason) {
            await queryRunner.addColumn(
                `${schema_name}.operational_expense`,
                new TableColumn({
                name: 'override_reason',
                type: 'text',
                isNullable: true,
                }),
            );
        }
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const schemas = await queryRunner.query(
      `SELECT schema_name FROM information_schema.schemata WHERE schema_name != 'public' AND schema_name != 'information_schema' AND schema_name != 'pg_catalog' AND schema_name != 'pg_toast'`
    );

    for (const { schema_name } of schemas) {
      const tableExists = await queryRunner.hasTable(`${schema_name}.operational_expense`);
      if (tableExists) {
        // Drop variance_flag
        const hasVarianceFlag = await queryRunner.hasColumn(`${schema_name}.operational_expense`, 'variance_flag');
        if (hasVarianceFlag) {
          await queryRunner.dropColumn(`${schema_name}.operational_expense`, 'variance_flag');
        }

        // Drop override_reason
        const hasOverrideReason = await queryRunner.hasColumn(`${schema_name}.operational_expense`, 'override_reason');
        if (hasOverrideReason) {
            await queryRunner.dropColumn(`${schema_name}.operational_expense`, 'override_reason');
        }
      }
    }
  }
}
