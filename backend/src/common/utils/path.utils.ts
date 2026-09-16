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
function assertMigrationsResolve(
  glob: string,
  dir: string,
  extension: string,
  logger: Logger,
): void {
  let files: string[];
  try {
    files = fs.readdirSync(dir).filter((f) => f.endsWith(extension));
  } catch (err) {
    throw new InternalServerErrorException(
      `Tenant migrations directory could not be read: "${dir}" (${
        err instanceof Error ? err.message : String(err)
      }). Tenant provisioning cannot proceed — refusing to run with zero migrations.`,
    );
  }

  if (files.length === 0) {
    throw new InternalServerErrorException(
      `No tenant migration files (*${extension}) found in "${dir}". Refusing to provision: ` +
        `running migrations would silently apply nothing and create a non-functional tenant schema.`,
    );
  }

  logger.log(
    `Tenant migrations resolved: ${files.length} file(s) in "${dir}" (pattern ${glob}).`,
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
 */
export function getTenantMigrationsPath(): string {
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
  const glob = path.join(migrationsDir, `*${extension}`);

  assertMigrationsResolve(glob, migrationsDir, extension, logger);

  return glob;
}

/**
 * Number of tenant migration files visible to the current runtime. Used by the
 * provisioning verifier to detect the "migrations ran but applied nothing" case.
 */
export function countTenantMigrationFiles(): number {
  const glob = getTenantMigrationsPath();
  const dir = path.dirname(glob);
  const extension = path.extname(glob);
  try {
    return fs.readdirSync(dir).filter((f) => f.endsWith(extension)).length;
  } catch {
    return 0;
  }
}
