import * as path from "path";
import { Logger } from "@nestjs/common";

/**
 * Robustly resolves the path to tenant migrations.
 * Works across:
 * 1. Development (src) vs Production (dist)
 * 2. Standalone scripts (ts-node) vs NestJS runtime
 * 3. Different execution depths (monorepo root vs backend folder)
 */
export function getTenantMigrationsPath(): string {
  const logger = new Logger("PathUtils");

  // __dirname will be somewhere in src/ or dist/ depending on the runtime
  // We want to find the root of the source/build tree
  const baseDir = __dirname;

  // Normal NestJS runtime structure:
  // Dev: backend/src/common/utils -> baseDir: backend/src/common/utils
  // Prod: backend/dist/src/common/utils -> baseDir: backend/dist/src/common/utils

  // We look for the 'src' or 'dist' folder and anchor there
  const isProduction = baseDir.includes(path.sep + "dist" + path.sep);

  // Find the 'backend' root or similar stable anchor
  // Alternatively, just go up enough levels to find the project root
  // A safer way in NestJS is to find the migrations folder relative to this file

  // CURRENT PATH: backend/src/common/utils/path.utils.ts
  // TARGET PATH:  backend/src/migrations/tenant/*{.ts,.js}

  const resolvedPath = path.join(
    path.resolve(__dirname, "..", ".."), // backend/src
    "migrations",
    "tenant",
    isProduction ? "*.js" : "*.ts",
  );

  logger.log(`Resolved robust tenant migrations path: ${resolvedPath}`);
  return resolvedPath;
}
