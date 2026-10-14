# Implementation progress (plain English)

## #1 Expense bug: "No active projects found" — ROOT CAUSE FOUND + FIXED

Date: October 11, 2026.

Root cause (verified against the live DB, read-only): the user was
operating inside the SAENCRYSTAL_GLOBAL_SERVICES workspace, which was
soft-deleted on Oct 8 (`is_active=false`, `deleted_at` set, 0 projects).
The 3 ACTIVE projects all live in SOLUTION_ENERGY. The security guard
(`TenancyGuard`) checked provisioning state and schema existence but
NEVER checked `is_active`/`deleted_at`, so dead workspaces sailed
through to empty schemas and surfaced as the confusing "No active
projects found" screen.

Fix: the guard now fails closed — deactivated/deleted workspaces get a
clear 403 `TENANT_DEACTIVATED` ("This workspace has been deactivated.
Please contact your administrator or switch to an active workspace.")
before any tenant query runs. Verified: backend tsc clean, new
tenancy.guard.spec.ts 5/5 pass.

Immediate unblock for the user: log in under the SOLUTION_ENERGY
workspace (pass its tenant code at login), not SAENCRYSTAL.

Follow-up worth doing: the expense page currently shows a generic
"Failed to load" toast on 403 — it could render the server's
TENANT_DEACTIVATED message directly so users know to switch workspaces.

DONE 2026-10-11: new shared `frontend/lib/apiError.ts`
(`parseApiError` handles all NestJS error shapes + network failures;
`isWorkspaceDeactivated` flags the switch-workspace hint), wired into
`financials/expenses/new.tsx` for BOTH the projects and OPEX-budget
steps — a persistent error panel now renders the server's message
verbatim with a "switch to an active workspace" hint and a Try-again
button, instead of the transient generic toast. Verified: frontend tsc
clean, apiError.test.ts 5/5, next lint clean on touched files.


Date: October 10, 2026 — production + security hardening complete.

## Closed today (were listed as gaps, now fixed in code)

- **Missing DB migration (the real deploy blocker).** `synchronize: false`
  means prod schema comes only from migrations, and nothing created the
  new `name` / `filters` / `last_error` columns or the scheduler indexes.
  Added `1777000000002-AddAiReportScheduleConsolidationColumns` (tenant
  migration, follows the repo search_path convention, all statements
  IF NOT EXISTS) + a 5-test spec. Migration spec passes, backend tsc clean.
  Deliberately no auto-backfill from legacy `report_schedule`: it lacks
  `created_by_id` (NOT NULL here), so copying would fail or invent fake
  creators. Legacy rows stay for manual review.
- **Local Ollama third leg.** Registered LAST via the same lazy-factory
  pattern (`OLLAMA_ENABLED` default true, `OLLAMA_BASE_URL` default
  localhost:11434, `OLLAMA_MODEL` default llama3.1, OpenAI-compatible
  /v1, no new dependencies). Reached only after all cloud legs fail;
  absent Ollama costs ~ms per catastrophe. 4 new tests incl. failover
  reaching Ollama + `OLLAMA_ENABLED=false` opt-out. NOTE: Ollama is not
  installed on this machine — bring-up is 3 commands (below).
  STATUS 2026-10-11: Ollama 0.40.2 installed (winget, user scope),
  `ollama serve` running (background), model pull in progress via
  detached resume daemon (backend/.workspace-temp/ollama_pull_daemon.ps1,
  logs to ollama-pull.log). Blocker is purely network: CDN pipe to
  Ollama's blob storage runs ~200KB/s with drops here, so the 4.9GB
  llama3.1 blob takes hours; partial blobs resume automatically.
  Verify later with: `ollama list` (expect llama3.1), then run the
  Ollama-only live check. `ollama serve` is a user process — it dies
  on logout/reboot; make it persistent (Scheduled Task / service) if
  this box is the production fallback host.
- **Dead OpenRouter default model.** `google/gemini-2.0-flash-exp:free`
  returns 404 (verified against the live API). Default is now
  `nvidia/nemotron-3-super-120b-a12b:free` (verified answering Sep 2026),
  plus new `OPENROUTER_MODELS` env for an ordered fallback chain across
  providers, and `GEMINI_MODEL` override. Never hardcode one free ID —
  they churn monthly.
- **Google provider event-loop crash.** `ChatGoogleGenerativeAI` was built
  at import (no running loop) so every `ainvoke` raised. Clients are now
  built lazily inside the running loop, cached per provider, and dropped
  on failure so the next call rebuilds fresh. Verified: live chat PASS
  (real "OK" from the model) + in-loop Google construction PASS.
- **Streaming was single-chunk.** The manager had no `astream`, so the SSE
  endpoint always fell back to one-shot. Added manager-level `astream`
  with per-provider failover — tokens now truly stream.
- **Stale `.env.example`.** Wrong var name, no OpenRouter section, phantom
  rate-limit vars the code never reads. Rewritten to match the code.
- **Dead dep.** `psycopg2-binary` imported nowhere — removed from
  requirements (smaller Docker image). pytest/httpx were already pinned.

## Verified today

- Python: 22/22 pass in a single run, incl. per-provider no-backoff test.
- Backend tsc: NO_ERRORS. Migration spec: 5/5.
- Static guard: all 10 AI POST endpoints have @limiter.limit + Request.
- Smoke 7/7 (no-LLM paths, re-run after Ollama change). Live LLM chat:
  PASS. Ollama-only transport: PASS (fast 404 model-not-found, proving
  client build + transport + safe errors; inference awaits the model
  download). Lint: zero errors.
- Email: creds present (Resend + SMTP), provider selection + preview
  logic confirmed correct — no code change needed.

## Honestly left (needs environments, not code)

- Run the new migration per tenant (`run-tenant-migrations.ts`) in
  staging first — I will not fire migrations at prod DBs unprompted.
- Real email delivery happens only when NODE_ENV != development (by
  design); staging send to a test inbox confirms the provider key.
- Free-model IDs rot: re-check https://openrouter.ai/models?q=free
  whenever AI calls start 404ing and rotate OPENROUTER_MODELS.
