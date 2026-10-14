import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  InternalServerErrorException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { DataSource } from "typeorm";
import { getPublicMigrationsPath } from "../common/utils/path.utils";

/**
 * Arbitrary but stable key for the Postgres session-level advisory lock that
 * serializes public migrations across API instances. Any value works as long as
 * every writer uses the same one.
 */
const MIGRATION_ADVISORY_LOCK_KEY = 918273645;

/**
 * Optionally applies pending PUBLIC-schema migrations at boot.
 *
 * OFF by default. Set `RUN_MIGRATIONS_ON_BOOT=true` to enable. It is safe to
 * enable on a scaled deploy: the migration run is wrapped in a Postgres
 * advisory lock, so concurrent instances serialize and the pending set is
 * applied exactly once (the rest observe no pending migrations).
 *
 * The preferred production pattern is still a dedicated pre-deploy migration
 * job (see docs/DEPLOYMENT.md §3); this exists as a documented, race-safe
 * fallback for platforms that lack pre-deploy hooks (e.g. Render free plan).
 */
@Injectable()
export class PublicMigrationsBootstrapService implements OnApplicationBootstrap {
  private readonly logger = new Logger(PublicMigrationsBootstrapService.name);

  constructor(private readonly configService: ConfigService) {}

  async onApplicationBootstrap(): Promise<void> {
    const enabled =
      (
        this.configService.get<string>("RUN_MIGRATIONS_ON_BOOT") || "false"
      ).toLowerCase() === "true";

    if (!enabled) {
      this.logger.log(
        "RUN_MIGRATIONS_ON_BOOT not enabled — skipping boot migrations.",
      );
      return;
    }

    const nodeEnv = this.configService.get<string>("NODE_ENV", "development");
    const isProd = nodeEnv === "production";

    let databaseUrl = this.configService.get<string>("DATABASE_URL");
    if (!databaseUrl) {
      const msg =
        "RUN_MIGRATIONS_ON_BOOT is set but DATABASE_URL is missing.";
      if (isProd) throw new InternalServerErrorException(msg);
      this.logger.error(msg);
      return;
    }

    databaseUrl = databaseUrl.trim().replace(/^['"]|['"]$/g, "");
    if (databaseUrl.startsWith("postgresql://")) {
      databaseUrl = databaseUrl.replace("postgresql://", "postgres://");
    }

    const isNeon = databaseUrl.includes("neon.tech");
    const hasSslMode = databaseUrl.includes("sslmode=");

    const dataSource = new DataSource({
      type: "postgres",
      url: databaseUrl,
      ssl:
        isProd && !hasSslMode
          ? { rejectUnauthorized: true }
          : isNeon && !hasSslMode
            ? { rejectUnauthorized: false }
            : undefined,
      schema: "public",
      entities: [],
      migrations: getPublicMigrationsPath(),
      migrationsTableName: "public_migrations",
      synchronize: false,
      logging: ["error", "warn", "migration"],
    });

    try {
      await dataSource.initialize();
      this.logger.log(
        "Boot migrations: acquired DataSource, waiting for advisory lock...",
      );

      // Session-level lock: released explicitly below, and implicitly when the
      // connection closes if anything throws first.
      await dataSource.query("SELECT pg_advisory_lock($1::bigint)", [
        MIGRATION_ADVISORY_LOCK_KEY,
      ]);
      try {
        const applied = await dataSource.runMigrations({
          transaction: "all",
        });
        if (applied.length === 0) {
          this.logger.log("Boot migrations: no pending public migrations.");
        } else {
          this.logger.log(
            `Boot migrations applied (${applied.length}): ${applied
              .map((m) => m.name)
              .join(", ")}`,
          );
        }
      } finally {
        await dataSource.query("SELECT pg_advisory_unlock($1::bigint)", [
          MIGRATION_ADVISORY_LOCK_KEY,
        ]);
      }
    } catch (error) {
      const msg = `Boot migration failed: ${
        error instanceof Error ? error.message : String(error)
      }`;
      this.logger.error(msg);
      if (isProd) throw new InternalServerErrorException(msg);
    } finally {
      if (dataSource.isInitialized) {
        await dataSource.destroy();
      }
    }
  }
}
