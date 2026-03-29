import { MigrationInterface, QueryRunner, Table, TableIndex } from "typeorm";

export class CreateCurrencyExchangeRatesTable1738454400000 implements MigrationInterface {
  name = "CreateCurrencyExchangeRatesTable1738454400000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: "currency_exchange_rates",
        columns: [
          {
            name: "id",
            type: "uuid",
            isPrimary: true,
            generationStrategy: "uuid",
            default: "uuid_generate_v4()",
          },
          {
            name: "from_currency",
            type: "varchar",
            length: "3",
            isNullable: false,
          },
          {
            name: "to_currency",
            type: "varchar",
            length: "3",
            isNullable: false,
          },
          {
            name: "rate",
            type: "decimal",
            precision: 18,
            scale: 6,
            isNullable: false,
          },
          {
            name: "last_updated",
            type: "timestamp",
            isNullable: false,
          },
          {
            name: "source",
            type: "varchar",
            length: "100",
            isNullable: true,
          },
          {
            name: "created_at",
            type: "timestamp",
            default: "now()",
            isNullable: false,
          },
          {
            name: "updated_at",
            type: "timestamp",
            default: "now()",
            isNullable: false,
          },
        ],
      }),
      true,
    );

    // Create composite unique index on (from_currency, to_currency, last_updated)
    await queryRunner.createIndex(
      "currency_exchange_rates",
      new TableIndex({
        name: "IDX_CURRENCY_RATE_UNIQUE",
        columnNames: ["from_currency", "to_currency", "last_updated"],
        isUnique: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex(
      "currency_exchange_rates",
      "IDX_CURRENCY_RATE_UNIQUE",
    );
    await queryRunner.dropTable("currency_exchange_rates");
  }
}
