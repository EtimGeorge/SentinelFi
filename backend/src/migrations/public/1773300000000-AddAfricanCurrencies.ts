import { MigrationInterface, QueryRunner } from "typeorm";

export class AddAfricanCurrencies1773300000000 implements MigrationInterface {
    name = 'AddAfricanCurrencies1773300000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        const currencies = [
            ['GHS', 'Ghanaian Cedi', '₵'],
            ['XOF', 'West African CFA Franc', 'CFA'],
            ['KES', 'Kenyan Shilling', 'KSh'],
            ['UGX', 'Ugandan Shilling', 'USh'],
            ['TZS', 'Tanzanian Shilling', 'TSh'],
            ['ETB', 'Ethiopian Birr', 'Br'],
            ['EGP', 'Egyptian Pound', 'E£'],
            ['MAD', 'Moroccan Dirham', 'DH'],
            ['BWP', 'Botswana Pula', 'P']
        ];

        for (const [code, name, symbol] of currencies) {
            // Use INSERT ... ON CONFLICT to prevent duplicates if any already exist
            await queryRunner.query(
                `INSERT INTO public.currency_metadata (code, name, symbol, is_active) 
                 VALUES ($1, $2, $3, true) 
                 ON CONFLICT (code) DO UPDATE SET name = $2, symbol = $3, is_active = true`,
                [code, name, symbol]
            );
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        const codes = ['GHS', 'XOF', 'KES', 'UGX', 'TZS', 'ETB', 'EGP', 'MAD', 'BWP'];
        await queryRunner.query(
            `DELETE FROM public.currency_metadata WHERE code = ANY($1)`,
            [codes]
        );
    }
}
