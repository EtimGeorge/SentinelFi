import { MigrationInterface, QueryRunner } from "typeorm";

export class MessagingGroupEntities1773201494945 implements MigrationInterface {
    name = 'MessagingGroupEntities1773201494945'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Safe rename of receiver_id to conversation_id
        await queryRunner.query(`
            DO $$ 
            BEGIN
                IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'message' AND column_name = 'receiver_id') THEN
                    ALTER TABLE "message" DROP CONSTRAINT IF EXISTS "FK_f4da40532b0102d51beb220f16a";
                    DROP INDEX IF EXISTS "IDX_f4da40532b0102d51beb220f16";
                    ALTER TABLE "message" RENAME COLUMN "receiver_id" TO "conversation_id";
                END IF;
            END $$;
        `);

        // Create new messaging entities
        await queryRunner.query(`CREATE TABLE IF NOT EXISTS "conversation" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenant_id" uuid NOT NULL, "type" character varying(20) NOT NULL DEFAULT 'DIRECT', "name" character varying(255), "last_activity_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_864528ec4274360a40f66c29845" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_77726325cecc7bc5d2442a7466" ON "conversation" ("tenant_id") `);

        await queryRunner.query(`CREATE TABLE IF NOT EXISTS "conversation_member" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "conversation_id" uuid NOT NULL, "user_id" uuid NOT NULL, "last_read_at" TIMESTAMP WITH TIME ZONE, "joined_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_ed07d3bc360f4e68836841b8358" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_b31b403f2e9c21a4a48460b8ed" ON "conversation_member" ("user_id") `);
        await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_1ebe869c785ab3616b58b55d2e" ON "conversation_member" ("conversation_id", "user_id") `);

        // Update Project defaults (standard across migrations)
        await queryRunner.query(`ALTER TABLE "project" ALTER COLUMN "vat_rate" SET DEFAULT '7.5'`);

        // Message table updates
        await queryRunner.query(`ALTER TABLE "message" ALTER COLUMN "conversation_id" SET NOT NULL`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_7fe3e887d78498d9c9813375ce" ON "message" ("conversation_id") `);

        // Constraints
        await queryRunner.query(`ALTER TABLE "conversation_member" DROP CONSTRAINT IF EXISTS "FK_60a5cedcd205ed3686ad16d6311"`);
        await queryRunner.query(`ALTER TABLE "conversation_member" ADD CONSTRAINT "FK_60a5cedcd205ed3686ad16d6311" FOREIGN KEY ("conversation_id") REFERENCES "conversation"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        
        await queryRunner.query(`ALTER TABLE "conversation_member" DROP CONSTRAINT IF EXISTS "FK_b31b403f2e9c21a4a48460b8ed9"`);
        await queryRunner.query(`ALTER TABLE "conversation_member" ADD CONSTRAINT "FK_b31b403f2e9c21a4a48460b8ed9" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        
        await queryRunner.query(`ALTER TABLE "message" DROP CONSTRAINT IF EXISTS "FK_7fe3e887d78498d9c9813375ce2"`);
        await queryRunner.query(`ALTER TABLE "message" ADD CONSTRAINT "FK_7fe3e887d78498d9c9813375ce2" FOREIGN KEY ("conversation_id") REFERENCES "conversation"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "message" DROP CONSTRAINT IF EXISTS "FK_7fe3e887d78498d9c9813375ce2"`);
        await queryRunner.query(`ALTER TABLE "conversation_member" DROP CONSTRAINT IF EXISTS "FK_b31b403f2e9c21a4a48460b8ed9"`);
        await queryRunner.query(`ALTER TABLE "conversation_member" DROP CONSTRAINT IF EXISTS "FK_60a5cedcd205ed3686ad16d6311"`);
        
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_7fe3e887d78498d9c9813375ce"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_77726325cecc7bc5d2442a7466"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "conversation"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_1ebe869c785ab3616b58b55d2e"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_b31b403f2e9c21a4a48460b8ed"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "conversation_member"`);

        await queryRunner.query(`
            DO $$ 
            BEGIN
                IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'message' AND column_name = 'conversation_id') THEN
                    ALTER TABLE "message" RENAME COLUMN "conversation_id" TO "receiver_id";
                    ALTER TABLE "message" ALTER COLUMN "receiver_id" DROP NOT NULL;
                    CREATE INDEX IF NOT EXISTS "IDX_f4da40532b0102d51beb220f16" ON "message" ("receiver_id");
                    ALTER TABLE "message" ADD CONSTRAINT "FK_f4da40532b0102d51beb220f16a" FOREIGN KEY ("receiver_id") REFERENCES "public"."user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
                END IF;
            END $$;
        `);
    }

}
