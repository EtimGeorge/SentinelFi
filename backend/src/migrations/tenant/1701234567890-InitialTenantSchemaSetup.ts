import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
} from "typeorm";

export class InitialTenantSchemaSetup1701234567890 implements MigrationInterface {
  // Replace timestamp with actual
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create Project Table
    await queryRunner.createTable(
      new Table({
        name: "projects",
        columns: [
          {
            name: "project_id",
            type: "uuid",
            isPrimary: true,
            default: "gen_random_uuid()",
          },
          {
            name: "name",
            type: "varchar",
            length: "255",
            isNullable: false,
          },
          {
            name: "description",
            type: "text",
            isNullable: true,
          },
          {
            name: "start_date",
            type: "timestamp",
            isNullable: false,
            default: "CURRENT_TIMESTAMP",
          },
          {
            name: "end_date",
            type: "timestamp",
            isNullable: true,
          },
          {
            name: "created_at",
            type: "timestamp",
            isNullable: false,
            default: "CURRENT_TIMESTAMP",
          },
          {
            name: "updated_at",
            type: "timestamp",
            isNullable: false,
            default: "CURRENT_TIMESTAMP",
          },
        ],
      }),
      true,
    );

    // WbsCategory table
    await queryRunner.createTable(
      new Table({
        name: "wbs_category",
        columns: [
          {
            name: "id",
            type: "uuid",
            isPrimary: true,
            default: "gen_random_uuid()",
          },
          {
            name: "code",
            type: "varchar",
            length: "50",
            isUnique: true,
            isNullable: false,
          },
          {
            name: "name",
            type: "varchar",
            length: "255",
            isNullable: false,
          },
          {
            name: "description",
            type: "text",
            isNullable: true,
          },
          {
            name: "created_at",
            type: "timestamp",
            default: "CURRENT_TIMESTAMP",
            isNullable: false,
          },
          {
            name: "updated_at",
            type: "timestamp",
            default: "CURRENT_TIMESTAMP",
            isNullable: false,
          },
        ],
      }),
      true,
    );

    // WbsBudget Table (linking to Projects and WbsCategory)
    await queryRunner.createTable(
      new Table({
        name: "wbs_budget",
        columns: [
          {
            name: "id",
            type: "uuid",
            isPrimary: true,
            default: "gen_random_uuid()",
          },
          {
            name: "project_id",
            type: "uuid",
            isNullable: false,
          },
          {
            name: "wbs_category_id",
            type: "uuid",
            isNullable: true, // Can be a custom WBS item without a template
          },
          {
            name: "name", // Custom name if wbs_category_id is null
            type: "varchar",
            length: "255",
            isNullable: false,
          },
          {
            name: "budgeted_amount",
            type: "numeric",
            precision: 12,
            scale: 2,
            isNullable: false,
            default: 0,
          },
          {
            name: "actual_spent",
            type: "numeric",
            precision: 12,
            scale: 2,
            isNullable: false,
            default: 0,
          },
          {
            name: "parent_id", // For hierarchical WBS
            type: "uuid",
            isNullable: true,
          },
          {
            name: "created_at",
            type: "timestamp",
            default: "CURRENT_TIMESTAMP",
            isNullable: false,
          },
          {
            name: "updated_at",
            type: "timestamp",
            default: "CURRENT_TIMESTAMP",
            isNullable: false,
          },
        ],
      }),
      true,
    );

    await queryRunner.createForeignKey(
      "wbs_budget",
      new TableForeignKey({
        columnNames: ["project_id"],
        referencedColumnNames: ["project_id"],
        referencedTableName: "projects",
        onDelete: "CASCADE",
      }),
    );

    await queryRunner.createForeignKey(
      "wbs_budget",
      new TableForeignKey({
        columnNames: ["wbs_category_id"],
        referencedColumnNames: ["id"],
        referencedTableName: "wbs_category",
        onDelete: "SET NULL",
      }),
    );

    await queryRunner.createForeignKey(
      "wbs_budget",
      new TableForeignKey({
        columnNames: ["parent_id"],
        referencedColumnNames: ["id"],
        referencedTableName: "wbs_budget",
        onDelete: "CASCADE",
      }),
    );

    // LiveExpense Table (linking to WbsBudget)
    await queryRunner.createTable(
      new Table({
        name: "live_expense",
        columns: [
          {
            name: "id",
            type: "uuid",
            isPrimary: true,
            default: "gen_random_uuid()",
          },
          {
            name: "wbs_budget_id",
            type: "uuid",
            isNullable: false,
          },
          {
            name: "description",
            type: "text",
            isNullable: true,
          },
          {
            name: "amount",
            type: "numeric",
            precision: 12,
            scale: 2,
            isNullable: false,
          },
          {
            name: "expense_date",
            type: "timestamp",
            isNullable: false,
            default: "CURRENT_TIMESTAMP",
          },
          {
            name: "created_at",
            type: "timestamp",
            default: "CURRENT_TIMESTAMP",
            isNullable: false,
          },
          {
            name: "updated_at",
            type: "timestamp",
            default: "CURRENT_TIMESTAMP",
            isNullable: false,
          },
        ],
      }),
      true,
    );

    await queryRunner.createForeignKey(
      "live_expense",
      new TableForeignKey({
        columnNames: ["wbs_budget_id"],
        referencedColumnNames: ["id"],
        referencedTableName: "wbs_budget",
        onDelete: "CASCADE",
      }),
    );

    // OperationalBudget Table
    await queryRunner.createTable(
      new Table({
        name: "operational_budget",
        columns: [
          {
            name: "id",
            type: "uuid",
            isPrimary: true,
            default: "gen_random_uuid()",
          },
          {
            name: "name",
            type: "varchar",
            length: "255",
            isNullable: false,
          },
          {
            name: "description",
            type: "text",
            isNullable: true,
          },
          {
            name: "start_date",
            type: "timestamp",
            isNullable: false,
            default: "CURRENT_TIMESTAMP",
          },
          {
            name: "end_date",
            type: "timestamp",
            isNullable: true,
          },
          {
            name: "budgeted_amount",
            type: "numeric",
            precision: 12,
            scale: 2,
            isNullable: false,
            default: 0,
          },
          {
            name: "actual_spent",
            type: "numeric",
            precision: 12,
            scale: 2,
            isNullable: false,
            default: 0,
          },
          {
            name: "created_at",
            type: "timestamp",
            default: "CURRENT_TIMESTAMP",
            isNullable: false,
          },
          {
            name: "updated_at",
            type: "timestamp",
            default: "CURRENT_TIMESTAMP",
            isNullable: false,
          },
        ],
      }),
      true,
    );

    // OperationalBudgetCategory Table
    await queryRunner.createTable(
      new Table({
        name: "operational_budget_category",
        columns: [
          {
            name: "id",
            type: "uuid",
            isPrimary: true,
            default: "gen_random_uuid()",
          },
          {
            name: "operational_budget_id",
            type: "uuid",
            isNullable: false,
          },
          {
            name: "name",
            type: "varchar",
            length: "255",
            isNullable: false,
          },
          {
            name: "budgeted_amount",
            type: "numeric",
            precision: 12,
            scale: 2,
            isNullable: false,
            default: 0,
          },
          {
            name: "actual_spent",
            type: "numeric",
            precision: 12,
            scale: 2,
            isNullable: false,
            default: 0,
          },
          {
            name: "created_at",
            type: "timestamp",
            default: "CURRENT_TIMESTAMP",
            isNullable: false,
          },
          {
            name: "updated_at",
            type: "timestamp",
            default: "CURRENT_TIMESTAMP",
            isNullable: false,
          },
        ],
      }),
      true,
    );

    await queryRunner.createForeignKey(
      "operational_budget_category",
      new TableForeignKey({
        columnNames: ["operational_budget_id"],
        referencedColumnNames: ["id"],
        referencedTableName: "operational_budget",
        onDelete: "CASCADE",
      }),
    );

    // OperationalExpense Table
    await queryRunner.createTable(
      new Table({
        name: "operational_expense",
        columns: [
          {
            name: "id",
            type: "uuid",
            isPrimary: true,
            default: "gen_random_uuid()",
          },
          {
            name: "operational_budget_category_id",
            type: "uuid",
            isNullable: false,
          },
          {
            name: "description",
            type: "text",
            isNullable: true,
          },
          {
            name: "amount",
            type: "numeric",
            precision: 12,
            scale: 2,
            isNullable: false,
          },
          {
            name: "expense_date",
            type: "timestamp",
            isNullable: false,
            default: "CURRENT_TIMESTAMP",
          },
          {
            name: "status", // e.g., PENDING, APPROVED, REJECTED
            type: "varchar",
            length: "50",
            isNullable: false,
            default: "'PENDING'",
          },
          {
            name: "vendor",
            type: "varchar",
            length: "255",
            isNullable: true,
          },
          {
            name: "receipt_url",
            type: "text",
            isNullable: true,
          },
          {
            name: "created_at",
            type: "timestamp",
            default: "CURRENT_TIMESTAMP",
            isNullable: false,
          },
          {
            name: "updated_at",
            type: "timestamp",
            default: "CURRENT_TIMESTAMP",
            isNullable: false,
          },
        ],
      }),
      true,
    );

    await queryRunner.createForeignKey(
      "operational_expense",
      new TableForeignKey({
        columnNames: ["operational_budget_category_id"],
        referencedColumnNames: ["id"],
        referencedTableName: "operational_budget_category",
        onDelete: "CASCADE",
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable("operational_expense");
    await queryRunner.dropTable("operational_budget_category");
    await queryRunner.dropTable("operational_budget");
    await queryRunner.dropTable("live_expense");
    await queryRunner.dropTable("wbs_budget");
    await queryRunner.dropTable("wbs_category");
    await queryRunner.dropTable("projects");
  }
}
