# Production environment variables

Date: October 11, 2026. Names only — never commit values.
Sources of truth: `backend/src/common/config/env-validation.schema.ts`,
backend/frontend/ai-agent code usage, and `render.yaml`.
`(R)` = required, `(O)` = optional.

> **Neon note (important):** `DATABASE_URL` MUST use the **DIRECT (unpooled)**
> hostname for this long-running server. The `-pooler` hostname runs PgBouncer
> in transaction mode, which **discards session settings (`SET search_path`)**
> and intermittently routes tenant queries to `public`, producing
> `relation "wbs_budget" does not exist`. See `docs/DEPLOYMENT.md`.

## Backend (`backend/.env`, `backend/.env.local`, `backend/.env.production.example`)

All three files carry the same key set. Keep them in sync.

Core:

- `NODE_ENV` (R) — set `production`.
- `PORT` (O) — defaults 3000 (Render sets 3001 for the API).
- `DATABASE_URL` (R) — PostgreSQL connection string. **Neon DIRECT host.**
- `JWT_SECRET` (R) — 64+ chars in production. `JWT_SECRET_KEY` is an accepted
  back-compat alias; prefer `JWT_SECRET`.
- `JWT_EXPIRATION_TIME` (O) — JWT lifetime, default `3600s`.
- `FRONTEND_URL` (R) — valid URI; anchors WebSocket CORS + email links.
- `FRONTEND_ALLOWED_ORIGINS` (O) — extra comma-separated WebSocket origins.
- `SWAGGER_ENABLED` (O) — set `false` in production.
- `RUN_MIGRATIONS_ON_BOOT` (O) — default `false`; prefer a pre-deploy job
  (`npm run db:run-tenant-migrations -- <schema>`).

Redis (cache + distributed throttling + Socket.IO adapter):

- `REDIS_URL` (O, strongly recommended) — without it the throttler falls back to
  per-instance memory, so limits do not hold across replicas.
- `REDIS_HOST` / `REDIS_PORT` (O) — local-dev fallback when `REDIS_URL` is unset.

AI agent / workers:

- `AI_AGENT_URL` (R in practice) — defaults to `http://localhost:8000`.
- `PDF_WORKER_URL` (O) — when set, PDFs render in the standalone worker.
- `PDF_WORKER_TOKEN` (O) — shared with the worker service.
- `PDF_WORKER_TIMEOUT_MS`, `PDF_NAV_TIMEOUT_MS` (O).

Email:

- `EMAIL_PROVIDER` (O, default `resend`) — `resend` or `smtp`.
- `EMAIL_FROM` (O) — verified sender, or every send is rejected.
- `EMAIL_PREVIEW_ONLY` (O) — set `false` in production.
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS` (O) — when
  `EMAIL_PROVIDER=smtp`.
- `RESEND_API_KEY` (O) — required when `EMAIL_PROVIDER=resend`.

Payments / currency:

- `PAYSTACK_SECRET_KEY` (O).
- `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `PAYPAL_WEBHOOK_ID` (O).
- `PAYPAL_SANDBOX` (O, default `true`), `PAYPAL_ENV` (O, `sandbox`|`live`).
- `EXCHANGE_RATE_API_KEY` (O) — defaults to the free `demo` key when unset.

Storage / ads / seed:

- `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`,
  `R2_ENDPOINT`, `R2_REGION` (default `auto`), `R2_PUBLIC_BASE_URL` (O) —
  without these, uploads use local disk and do not survive deploys.
- `ADS_PROVIDER` (default `test`), `ADS_ENABLED` (default `true`),
  `ADSENSE_CLIENT_ID`, `ADSENSE_BANNER_SLOT`, `ADS_SSV_SECRET` (O).
- `SUPERADMIN_EMAIL`, `SUPERADMIN_PASSWORD` (R in production if seeding).

PDF worker service only (`backend/Dockerfile.worker` → `backend/src/worker.ts`;
not read by the API): `WORKER_PORT`, `PUPPETEER_EXECUTABLE_PATH`,
`PDF_WORKER_CONCURRENCY`, `PDF_RENDER_TIMEOUT_MS`, `PDF_MAX_HTML_BYTES`,
`PDF_WORKER_TOKEN`.

## Frontend (`frontend/.env.local`, `frontend/.env.production.example`)

`NEXT_PUBLIC_*` are inlined at **build time**.

- `NEXT_PUBLIC_API_URL` (R) — backend base URL, including `/api/v1`.
- `NEXT_PUBLIC_WS_URL` (O) — notification WebSocket URL; derived from the API URL
  when unset.
- `NEXT_PUBLIC_ADSENSE_CLIENT_ID`, `NEXT_PUBLIC_ADSENSE_BANNER_SLOT` (O).
- `BACKEND_INTERNAL_URL` (O) — server-side URL used by Next.js rewrites.
- `FRONTEND_URL` (O) — same-origin value used to build CSP/WS allowlists.
- `NEXT_PUBLIC_VERCEL_ANALYTICS_ID` (O).

## AI agent (`ai-agent/.env`, `ai-agent/.env.example`)

- `GEMINI_API_KEY` (R unless OpenRouter is set) — primary provider.
- `GEMINI_MODEL` (O, default `gemini-1.5-flash`).
- `OPENROUTER_API_KEY` (O, recommended) — first in the failover chain.
- `OPENROUTER_MODELS` (O, recommended) — comma-separated fallback chain. Free
  model IDs rot monthly — re-check https://openrouter.ai/models?q=free.
  (`OPENROUTER_MODEL` still works as a single-model override.)
- `OLLAMA_ENABLED` (default `true`), `OLLAMA_BASE_URL`, `OLLAMA_MODEL` — local,
  free, registered LAST in the chain.
- `AI_AGENT_ALLOWED_ORIGINS` — production: the NestJS backend URL ONLY. The app
  reads this name EXACTLY (not `ALLOWED_ORIGINS`).
- `HOST` (default `0.0.0.0`), `PORT` (default 8000), `LOG_LEVEL`.

## Removed / legacy keys

These appeared in old env files but are **not read by any code** and were
commented out (or dropped) during the consistency cleanup:
`SEED_SUPERADMIN`, `PAYSTACK_PUBLIC_KEY`, `REDIS_USER`, `REDIS_PASSWORD`,
`THROTTLE_TTL`, `THROTTLE_LIMIT`, `VALKEY_*`, and the ai-agent
`ALLOWED_ORIGINS` / `*_RATE_LIMIT` keys.

## Build-time variables (frontend)

`NEXT_PUBLIC_*` are inlined into the client bundle at **build** time, so they
must be present when the Next.js image is built (setting them only at runtime
has no effect). `frontend/Dockerfile` declares them as `ARG`s, and:

- **Render** automatically translates a Docker service's env vars into Docker
  build args (same keys/values) — so declaring the env var on the `sentinelfi-web`
  service is enough.
- **docker-compose** passes them under the frontend service's `build.args`.

## Environment files

All env files are aligned to the same per-service key set: `backend/.env*`
(48 keys), `frontend/.env*` (7 keys), `ai-agent/.env*` (12 keys). The combined
production file `.env.prod` (used by `docker-compose.yml` via `env_file`, and by
the ZAP workflow) and its `.env.prod.neon-backup` copy carry the union of all
three services and use the Neon **direct** host. The ZAP workflow generates its
own minimal `.env.prod` for CI and needs no changes.

## Render Blueprint

`render.yaml` declares every variable above with:

- `sync: false` — Render prompts for the value during Blueprint creation and
  stores it encrypted (secrets / environment-specific values).
- `generateValue: true` — Render generates the value (`JWT_SECRET`,
  `PDF_WORKER_TOKEN`).
- `value` — a fixed constant (e.g. `NODE_ENV`, timeouts).
- `fromService` / `fromGroup` — wired from the Key Value instance / shared group.

`DATABASE_URL` on the API service must be the Neon **direct (unpooled)** string.

