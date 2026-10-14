import * as fs from "fs";
import * as path from "path";
import { InternalServerErrorException, Logger } from "@nestjs/common";

/**
 * Every tenant schema is built by running this directory's migrations. If the
 * glob resolves to nothing, TypeORM's `runMigrations()` applies ZERO migrations
 * and returns success — producing an empty schema and a tenant that can never
 * work. That silent no-op is unobservable at the call site, so it is turned
 * into a hard, immediate failure here instead.
 */
/**
 * A tenant migration is a `*.ts`/`*.js` file that exports a migration class.
 *
 * Spec/test files live in the same directory so they can reach the real
 * migrations, and a plain `*.ts` glob matches them too. TypeORM `require()`s
 * every file the glob matches, so an included `*.spec.ts` executes
 * `describe(...)` at module scope and the DataSource dies with
 * "describe is not defined" — which fails EVERY tenant migration run, not just
 * the spec's own suite. Excluding them here is what keeps provisioning working.
 */
export function isTenantMigrationFile(fileName: string): boolean {
  if (fileName.includes(".spec.") || fileName.includes(".test.")) return false;
  return fileName.endsWith(".ts") || fileName.endsWith(".js");
}

function assertMigrationsResolve(
  glob: string,
  dir: string,
  extension: string,
  logger: Logger,
  label = "Tenant",
): void {
  const lower = label.toLowerCase();
  let files: string[];
  try {
    files = fs
      .readdirSync(dir)
      .filter((f) => isTenantMigrationFile(f) && f.endsWith(extension));
  } catch (err) {
    throw new InternalServerErrorException(
      `${label} migrations directory could not be read: "${dir}" (${
        err instanceof Error ? err.message : String(err)
      }). Refusing to run with zero migrations.`,
    );
  }

  if (files.length === 0) {
    throw new InternalServerErrorException(
      `No ${lower} migration files (*${extension}) found in "${dir}". ` +
        `Refusing to continue: running migrations would silently apply nothing.`,
    );
  }

  logger.log(
    `${label} migrations resolved: ${files.length} file(s) in "${dir}" (pattern ${glob}).`,
  );
}

/**
 * Robustly resolves the path to tenant migrations.
 * Works across:
 * 1. Development (src) vs Production (dist)
 * 2. Standalone scripts (ts-node) vs NestJS runtime
 * 3. Different execution depths (monorepo root vs backend folder)
 *
 * FAIL-LOUD: throws if the resolved directory contains no migrations, because
 * an empty glob is silently equivalent to "provision an empty schema".
 *
 * Returns a glob ARRAY so `*.spec.*` / `*.test.*` can be excluded by negation.
 * TypeORM accepts `string | string[]` for `migrations`.
 */
export function getTenantMigrationsPath(): string[] {
  const logger = new Logger("PathUtils");

  // __dirname is somewhere in src/ or dist/ depending on the runtime.
  // Dev:  backend/src/common/utils
  // Prod: backend/dist/backend/src/common/utils (tsconfig spans src + shared)
  const baseDir = __dirname;
  const isProduction = baseDir.includes(path.sep + "dist" + path.sep);

  const migrationsDir = path.join(
    path.resolve(__dirname, "..", ".."), // backend/src (or its dist equivalent)
    "migrations",
    "tenant",
  );

  const extension = isProduction ? ".js" : ".ts";
  const globs = [
    path.join(migrationsDir, `*${extension}`),
    `!${path.join(migrationsDir, `*.spec${extension}`)}`,
    `!${path.join(migrationsDir, `*.test${extension}`)}`,
  ];

  assertMigrationsResolve(globs[0], migrationsDir, extension, logger);

  return globs;
}

/**
 * Robustly resolves the path to PUBLIC (`public` schema) migrations.
 *
 * Mirrors {@link getTenantMigrationsPath} so the optional boot migrator can
 * build a dedicated DataSource without relying on the CLI's `ormconfig`. Same
 * fail-loud guarantee: an empty glob would make `runMigrations()` a silent
 * no-op, so a missing directory/file set is a hard error.
 */
export function getPublicMigrationsPath(): string[] {
  const logger = new Logger("PathUtils");

  // Dev:  backend/src/common/utils
  // Prod: backend/dist/backend/src/common/utils
  const baseDir = __dirname;
  const isProduction = baseDir.includes(path.sep + "dist" + path.sep);

  const migrationsDir = path.join(
    path.resolve(__dirname, "..", ".."), // backend/src (or its dist equivalent)
    "migrations",
    "public",
  );

  const extension = isProduction ? ".js" : ".ts";
  const globs = [
    path.join(migrationsDir, `*${extension}`),
    `!${path.join(migrationsDir, `*.spec${extension}`)}`,
    `!${path.join(migrationsDir, `*.test${extension}`)}`,
  ];

  assertMigrationsResolve(globs[0], migrationsDir, extension, logger, "Public");

  return globs;
}

/**
 * Number of tenant migration files visible to the current runtime. Used by the
 * provisioning verifier to detect the "migrations ran but applied nothing" case.
 * Must count exactly what the glob resolves to, so spec/test files are excluded
 * here too — otherwise the count over-reports and the zero-migration guard
 * never fires.
 */
export function countTenantMigrationFiles(): number {
  const dir = path.dirname(getTenantMigrationsPath()[0]);
  const extension = path.extname(getTenantMigrationsPath()[0]);
  try {
    return fs
      .readdirSync(dir)
      .filter((f) => isTenantMigrationFile(f) && f.endsWith(extension)).length;
  } catch {
    return 0;
  }
}
