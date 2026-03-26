import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

export class AddTenantBranding1750000000000 implements MigrationInterface {
    name = 'AddTenantBranding1750000000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.addColumns("tenants", [
            new TableColumn({
                name: "brandLogoBase64",
                type: "text",
                isNullable: true,
            }),
            new TableColumn({
                name: "brandPrimaryColorHex",
                type: "varchar",
                length: "7",
                isNullable: true,
            }),
            new TableColumn({
                name: "companyAddress",
                type: "text",
                isNullable: true,
            })
        ]);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropColumn("tenants", "companyAddress");
        await queryRunner.dropColumn("tenants", "brandPrimaryColorHex");
        await queryRunner.dropColumn("tenants", "brandLogoBase64");
    }
}
