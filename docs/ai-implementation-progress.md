# Implementation progress (plain English)

Date: October 8, 2026

## Done

- Backend streaming that actually streams: the controller for
  POST /api/v1/ai/chat/stream now sets SSE headers and pipes the
  Python response to the browser. It handles blocked messages,
  normal streams, and failures without hanging the client.
- Service chatStream(): checks guardrails first, logs blocked attempts,
  builds tenant-scoped financial context, forwards to the Python agent,
  and falls back to a safe SSE message if Python is down.
- Scheduler worker: AiReportSchedulerService runs every 5 minutes,
  picks due ACTIVE schedules oldest-first (max 25 per tick), claims each
  one upfront so crashes cannot double-run it, records run counts and
  narrative previews, stores last_error on failure, and never lets one
  bad schedule kill the batch. Overlap guard skips ticks while busy.
- Single schedule table: backend/src/ai-assistant/report-schedule.entity.ts
  is now the only real entity (table ai_report_schedule). It gained
  name, filters, last_error, and indexes for fast scheduler queries.
  The old common/entities/report-schedule.entity.ts is now only a
  deprecated re-export so old imports do not break. reporting.module.ts
  and database.config.ts now import the canonical entity. Removed the
  unused import in app.module.ts.
- Upload security: Python fill-form now enforces an extension allowlist
  (pdf/png/jpg/jpeg/tiff/bmp), a MIME allowlist, a 200-char project_name
  limit, rate limiting, and uses only the validated extension for temp
  files. Backend fill-form adds a matching fileFilter, size checks,
  and projectName length checks before forwarding.
- Forecast honesty: risk is now UNKNOWN when days remaining cannot be
  computed, with CRITICAL/HIGH/MEDIUM/LOW bands otherwise.
- Tests: 3 new backend suites (service 4 tests, scheduler 4 tests,
  controller 4 tests) plus 5 new Python tests (bad extension, bad MIME,
  long project name, UNKNOWN forecast, SSE block). Python: 13 passed.
  Backend scheduler/service/controller suites pass. Guardrails suite
  passes. Backend and frontend TypeScript compile with no errors.

## Migration note (report schedules)

- If a legacy `report_schedule` table exists, copy its rows into
  `ai_report_schedule` mapping name->name, filters->filters,
  is_active true->status ACTIVE else PAUSED, then drop the old table.
- New columns on ai_report_schedule (name, filters, last_error) are
  nullable so existing rows keep working.

## What is left

- End-to-end smoke test with real services running (Python agent +
  backend + frontend) for chat streaming, scheduled runs, and uploads.
- Optional: wire scheduler email handoff to the notification service
  (currently logged + persisted for pickup).
- Full lint pass (next lint) when time allows; tsc/jest/pytest are done.
