import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateCurrencyMetadataTable1773016000000 implements MigrationInterface {
  name = 'CreateCurrencyMetadataTable1773016000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'currency_metadata',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'code',
            type: 'varchar',
            length: '3',
            isUnique: true,
            isNullable: false,
          },
          {
            name: 'name',
            type: 'varchar',
            length: '50',
            isNullable: false,
          },
          {
            name: 'symbol',
            type: 'varchar',
            length: '10',
            isNullable: false,
          },
          {
            name: 'is_active',
            type: 'boolean',
            default: true,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'now()',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'now()',
          },
        ],
      }),
      true,
    );

    // Initial seed of supported currencies
    const currencies = [
      ['USD', 'US Dollar', '$'],
      ['NGN', 'Nigerian Naira', '₦'],
      ['EUR', 'Euro', '€'],
      ['GBP', 'British Pound', '£'],
      ['JPY', 'Japanese Yen', '¥'],
      ['CAD', 'Canadian Dollar', 'C$'],
      ['AUD', 'Australian Dollar', 'A$'],
      ['CHF', 'Swiss Franc', 'CHF'],
      ['CNY', 'Chinese Yuan', '¥'],
      ['INR', 'Indian Rupee', '₹'],
      ['ZAR', 'South African Rand', 'R'],
      ['BRL', 'Brazilian Real', 'R$'],
      ['MXN', 'Mexican Peso', 'Mex$']
    ];

    for (const [code, name, symbol] of currencies) {
      await queryRunner.query(
        `INSERT INTO currency_metadata (code, name, symbol) VALUES ($1, $2, $3)`,
        [code, name, symbol]
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('currency_metadata');
  }
}
