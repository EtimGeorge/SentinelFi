import { BadRequestException } from "@nestjs/common";
import { createHash } from "crypto";

/**
 * PostgreSQL identifiers are truncated to NAMEDATALEN - 1 = 63 bytes.
 * A schema name longer than this is SILENTLY truncated by the server, which
 * produces a schema the application can never reach again (the stored
 * `tenants.schema_name` keeps the full string while the physical schema is
 * shorter). Every schema name therefore must be validated/derived here.
 */
export const MAX_SCHEMA_NAME_LENGTH = 63;

/**
 * Lowercase-and-digits only, must not start with a digit. Because this pattern
 * cannot match a double quote, backslash, semicolon or whitespace, any string
 * that passes `assertValidSchemaName` is safe to interpolate into DDL.
 */
const VALID_SCHEMA_NAME = /^[a-z_][a-z0-9_]{0,62}$/;

/**
 * Schemas the application must never CREATE INTO or DROP. `public` is the
 * shared ledger containing `tenants`, `users`, `subscriptions`, ... — running
 * tenant migrations into it would corrupt the shared ledger, and dropping it
 * would destroy the platform.
 */
const RESERVED_SCHEMA_NAMES = new Set([
  "public",
  "information_schema",
  "pg_catalog",
  "pg_toast",
  "pg_temp",
  "pgagent",
]);

/** Short deterministic digest used to keep truncated names collision-resistant. */
function shortDigest(value: string): string {
  return createHash("sha256").update(value).digest("hex").slice(0, 8);
}

/**
 * True when `name` belongs to PostgreSQL itself or to a schema the platform
 * reserves. Checked case-insensitively and covers the whole `pg_*` namespace,
 * not just the handful of well-known names.
 */
export function isReservedSchemaName(name: string): boolean {
  if (!name) return true;
  const normalized = name.trim().toLowerCase();
  return (
    RESERVED_SCHEMA_NAMES.has(normalized) || normalized.startsWith("pg_")
  );
}

/**
 * THE canonical schema-name derivation.
 *
 * Every code path that provisions a tenant (superadmin, trial, free plan, paid
 * webhook, offline provisioning) must route through this function. It used to
 * be copy-pasted in four places with three different behaviours — some
 * truncated to 63 chars, some did not — which meant the *same* company name
 * could map to different schema names depending on the signup route, defeating
 * both the pre-flight duplicate check and the `tenants.schema_name` unique
 * index.
 *
 * Guarantees:
 *  - result always matches `^[a-z_][a-z0-9_]*$` and is <= 63 chars
 *  - never returns a reserved/PostgreSQL-internal schema name
 *  - deterministic and idempotent (f(f(x)) === f(x))
 *  - long inputs are truncated WITH a content digest so two distinct long
 *    company names cannot collapse onto the same schema name
 *  - throws BadRequestException for inputs with no usable characters
 */
export function deriveSchemaName(
  input: string,
  options?: { fallbackPrefix?: string },
): string {
  const fallbackPrefix = options?.fallbackPrefix ?? "t";

  const raw = (input ?? "").trim().toLowerCase();
  if (!raw) {
    throw new BadRequestException(
      "Cannot derive a database schema name from an empty value.",
    );
  }

  // Collapse every run of non-alphanumerics into a single underscore, then trim
  // the edges. "./replace(/[^a-z0-9]+/g, "_")" handles runs in one pass so
  // "ACME  Corp!! Ltd" -> "acme_corp_ltd" (never "acme__corp__ltd").
  let sanitized = raw.replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");

  if (!sanitized) {
    throw new BadRequestException(
      `Cannot derive a database schema name from "${input}" — it contains no usable alphanumeric characters.`,
    );
  }

  // A leading digit is legal only inside a quoted identifier; prefix it so the
  // name stays trivially safe in every context.
  if (!/^[a-z]/.test(sanitized)) {
    sanitized = `${fallbackPrefix}_${sanitized}`;
  }

  // "Public Ltd" / "PG&E" must not collide with PostgreSQL's own namespaces.
  if (isReservedSchemaName(sanitized)) {
    sanitized = `${fallbackPrefix}_${sanitized}`;
  }

  // Enforce NAMEDATALEN *here* rather than letting the server silently truncate.
  // The digest keeps distinct long names distinct after collision.
  if (sanitized.length > MAX_SCHEMA_NAME_LENGTH) {
    const digest = shortDigest(sanitized);
    sanitized = `${sanitized.slice(0, MAX_SCHEMA_NAME_LENGTH - digest.length - 1)}_${digest}`;
  }

  return assertValidSchemaName(sanitized, "derived schema name");
}

/**
 * Guard for any schema name that did not just come out of `deriveSchemaName`,
 * most importantly names read back from the database before being interpolated
 * into DDL (e.g. `DROP SCHEMA "..."`). Prevents a tampered/legacy row from
 * turning identifier interpolation into SQL injection.
 */
export function assertValidSchemaName(
  name: string,
  context = "schema name",
): string {
  if (typeof name !== "string" || !VALID_SCHEMA_NAME.test(name)) {
    throw new BadRequestException(
      `Refusing to use "${String(name)}" as a ${context}: it must match [a-z_][a-z0-9_]* and be at most ${MAX_SCHEMA_NAME_LENGTH} characters.`,
    );
  }
  if (isReservedSchemaName(name)) {
    throw new BadRequestException(
      `Refusing to use reserved PostgreSQL schema "${name}" as a ${context}.`,
    );
  }
  return name;
}

/**
 * Returns a DDL-safe quoted identifier. Use this everywhere a schema name is
 * interpolated into SQL; it validates first, so injection is impossible even if
 * callers forget to.
 */
export function quoteSchemaIdentifier(
  name: string,
  context = "schema name",
): string {
  return `"${assertValidSchemaName(name, context)}"`;
}
