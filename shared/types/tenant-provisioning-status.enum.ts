/**
 * Lifecycle of a tenant's physical PostgreSQL schema.
 *
 * Reservation-first provisioning writes the tenant row BEFORE the schema is
 * migrated, so a row can exist while its schema is still incomplete. This enum
 * makes that intermediate state explicit and queryable — previously it was
 * invisible, which is what allowed "zombie" tenants (row live, schema missing)
 * to exist in production with no way to detect them.
 *
 * PENDING  - reserved, schema creation / migrations still in flight (or the
 *            provisioning process died mid-flight; see PROVISIONING_STALE_MS)
 * FAILED   - provisioning attempted, did not complete. `provisioning_error`
 *            holds the cause. Retrying resumes (does NOT drop a schema that may
 *            already hold data unless it was created by the failed attempt).
 * ACTIVE   - schema migrated, verified, and safe to log in to.
 */
export enum TenantProvisioningStatus {
  PENDING = 'PENDING',
  ACTIVE = 'ACTIVE',
  FAILED = 'FAILED',
}

/**
 * A PENDING provisioning row older than this is treated as a dead attempt (the
 * provisioning process was killed mid-flight) and may be resumed by a retry.
 * Fresher than this, and the request is rejected as a 409 conflict — another
 * worker is actively provisioning. Tuned for cold-start of the tenant-migration
 * DataSource + initial tenant migration set; raise if migration set grows.
 */
export const PROVISIONING_STALE_MS = 5 * 60 * 1000;
