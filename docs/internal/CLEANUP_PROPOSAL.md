# Deployment Cleanup: Proposed Deletions

I have audited the entire application and identified the following files as redundant diagnostic, log, or scratch files that should be deleted before deployment.

## 1. Root Directory Cleanup
The following files were used for initial environment verification and monorepo diagnostics:
- `boot_diag.txt`, `boot_full_diag.txt`, `boot_root.log`
- `final_check_log.txt`, `npm_audit_report.json`, `output.md`, `terminal_check.txt`
- `test-api.js`, `test-fetch.js`, `test_db_conn_simple.js`, `test_log.txt`, `test_utf8.txt`
- `verify-boot.ts`
- **Directories**: `investigated-audit-documents/`, `pdf_extract/`

## 2. Backend Documentation & Diagnostics
The backend contains a significant number of query tests and database audit logs:
- **Scripts**: `audit.js`, `boot-test.js`, `check_budget_actuals.js`, `check_expense_dates.js`, `check_live_expense_cols.js`, `check_migrations.js`, `deep_audit.js`, `final_confirmation.js`, `test-api-fetch.js`, `test-api.js`, `test-queries.js`, `test_backend_query.js`, `test_db_conn.js`, `test_db_conn_v2.js`, `test_serialization.js`
- **Logs**: `audit_debug.log`, `backend_query_test.log`, `boot.log`, `boot_debug.log`, `budget_actuals.log`, `data_check.log`, `debug-log.txt`, `debug-service.log`, `deep_audit.log`, `diag_output.log`, `expense_dates.log`, `final_confirmation.log`, `live_expense_cols.log`, `migration.log`, `migrations_audit.log`, `seed_debug.log`, `serialization_test.log`, `test-api-out.txt`, `test-out.txt`
- **Reports**: `boot.txt`, `boot_readable.txt`, `check_output.txt`, `cleanup_output.txt`, `diag_result.txt`, `diag_result_final.txt`, `diag_result_fixed.txt`, `diag_result_public.txt`, `diag_result_utf8.txt`, `diag_verify_after_fix.txt`, `diag_verify_final.txt`, `diag_verify_final_utf8.txt`, `diag_verify_utf8.txt`, `git_log.txt`, `git_status.txt`, `git_status_utf8.txt`, `migration_debug.txt`, `migration_output.txt`, `schema-audit.txt`, `schemas-out.txt`, `script-out.txt`, `seed_debug_txt.txt`, `subs_output.txt`, `tables-audit.txt`, `tenants-out.txt`, `user-audit-v2.txt`, `user-audit.txt`, `user-cols.txt`, `user_output.txt`, `verify-db.txt`

## 3. Frontend & AI Agent Cleanup
- **Frontend**: `typecheck.log`
- **AI Agent**: `diag_output.txt`, `diagnostic.py`, `env_audit.py`, `test_key.py`

## 4. Security Audit (.gitignore & .dockerignore)
- **Status**: **SECURE**. All `.env`, `.env.local`, and `.env.prod` files are correctly ignored across all directories.
- **Proposed Updates**:
    - Add `*.log`, `*.txt`, and `*.js` (diagnostic scripts) to the root `.gitignore` more aggressively to prevent future clutter.
    - Explicitly ignore the `/docs` and `/scripts` directories in `.dockerignore` to reduce image size.

---
**Please review this list. Once approved, I will perform the deletion and update the ignore files.**
