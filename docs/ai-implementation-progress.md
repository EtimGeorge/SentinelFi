# Implementation progress (plain English)

Date: October 10, 2026 — production + security hardening complete.

## Done this pass

- Rate limits on all 10 Python AI endpoints. Before, only chat,
  fill-form and chat/stream were limited. Now analyze-dashboard,
  forecast, explain-section, generate-report, schedule-report,
  generate-report-narrative and explain-variance all have limits
  (30/min, 10/min for schedule-report). Without this, anyone with a
  token could burn unlimited LLM budget — now they cannot.
- Scheduler email delivery is real. When deliver_by_email is set, the
  worker validates addresses (regex, lowercase, max 20), sends via
  EmailService with per-recipient isolation (one bad address never
  blocks the rest), HTML-escapes the AI narrative (AI text raw in email
  HTML would be an XSS hole), and logs sent counts. Works even when
  EmailService is absent (logs + skips, never crashes). EmailModule
  imported into AiAssistantModule — verified no circular dependency.
- Audit trail closed: chatStream now logs success dispatches (metadata
  only, not full content, to bound PII) in addition to the existing
  block logging. Every stream is now traceable.
- Tests: scheduler suite grew to 7 (email escape, 20-cap, unwired
  mailer). All pass. Python 13/13 pass. Service 4/4, controller 4/4.
- Lint: frontend next lint has zero errors (only pre-existing warnings,
  including two in AI components untouched by this work).
- Smoke test 7/7 passed live (health, all 10 routes present, chat
  block, SSE block, forecast validation, .exe rejection, unknown form
  rejection) — see .workspace-temp/smoke_ai.py. No LLM keys needed
  because these paths short-circuit before any model call.
- Backend + frontend TypeScript: no errors.

## Migration note (report schedules)

- Canonical table is ai_report_schedule with new nullable columns
  (name, filters, last_error). If a legacy report_schedule table
  exists, copy rows across (name->name, filters->filters,
  is_active true->ACTIVE else PAUSED) then drop the old table.

## Honestly left (needs real infra, not code)

- Live LLM smoke (chat content, narrative quality) needs OPENROUTER or
  GEMINI keys configured — the code paths are tested with fakes.
- Real email send needs SMTP/Resend credentials — preview mode persists
  to EmailLog without sending, which is the safe default.
- Full production deploy check (migrations run, cron actually fires on
  schedule in staging) — the worker logic itself is unit-verified.
