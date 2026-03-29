import { MigrationInterface, QueryRunner } from "typeorm";

export class AddUsernameToUserTable1773120000000 implements MigrationInterface {
  name = "AddUsernameToUserTable1773120000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Add username column
    await queryRunner.query(
      `ALTER TABLE "user" ADD "username" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "user" ADD CONSTRAINT "UQ_78a916df40e02a9deb1c4b75edb" UNIQUE ("username")`,
    );

    // 2. Drop old performance index if it exists (from 1769318428397)
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."IDX_3d79be558ff58a353061c6b1a8"`,
    );

    // 3. Create new identity index including username
    await queryRunner.query(
      `CREATE INDEX "IDX_user_identity" ON "user" ("email", "username", "is_active") `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // 1. Drop new index
    await queryRunner.query(`DROP INDEX "public"."IDX_user_identity"`);

    // 2. Restore old performance index
    await queryRunner.query(
      `CREATE INDEX "IDX_3d79be558ff58a353061c6b1a8" ON "user" ("email", "is_active") `,
    );

    // 3. Remove username column and constraint
    await queryRunner.query(
      `ALTER TABLE "user" DROP CONSTRAINT "UQ_78a916df40e02a9deb1c4b75edb"`,
    );
    await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "username"`);
  }
}
