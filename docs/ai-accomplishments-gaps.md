# What was accomplished and what gaps remain (plain English)

**Date:** October 8, 2026

## What we've accomplished

### Python agent (ai-agent/main.py)
- Added SSE streaming chat endpoint: POST /api/v1/ai/chat/stream that returns 	ext/event-stream. It safely blocks harmful messages and streams responses.
- Improved forecast risk logic: returns UNKNOWN when days remaining can't be calculated, and now uses CRITICAL, HIGH, MEDIUM, LOW bands (safer, less overconfident).
- Normalized narrative section parsing: maps section titles to executive_summary, key_insights, nomalies, ecommendations, isks, conclusion so the UI can render them correctly.
- Smarter financial context formatting: avoids incorrectly prefixing non-monetary numbers with currency symbols.
- Python compiles cleanly. Python tests: **8 passed** (results saved in .workspace-temp/pytest_results_20261008.txt).

### Backend (NestJS)
- Added streaming proxy in controller: POST /api/v1/ai/chat/stream (JWT protected, role-gated) that delegates to service.
- Implemented AiAssistantService.chatStream() to proxy SSE between backend and Python agent with guardrails evaluation, audit logging on blocks, and graceful fallback on errors.
- Backend TypeScript compiles with **no errors**.
- Controller/service wiring is in place so frontend's streaming hook can talk through backend.

### Frontend
- Frontend TypeScript compiles with **no errors**.

### Docs
- Reports written: docs/ai-hardening-report.md and docs/ai-hardening-status.md.

## Gaps that still need to be filled

1. **ReportSchedule entity consolidation (critical)**
   - Two different ReportScheduleEntity classes exist: one in ackend/src/ai-assistant/report-schedule.entity.ts (AI schema: has un_count, last_ai_narrative_preview, deliver_by_email, project_id, status, requency as AI enums) and one in ackend/src/common/entities/report-schedule.entity.ts (common schema: different fields like 
ame, is_active, ilters, uses ReportType from document-control). 
   - They're registered in different places (pp.module.ts imports AI entity; eporting.module.ts and common/config/database.config.ts import common entity). This causes duplication/confusion. We need to pick a single authoritative entity, update all imports/registrations, and handle migrations if schema differs.

2. **Scheduler worker (@Cron) - make scheduled reports actually run**
   - Service has calculateNextRun() and schedule CRUD, but no background worker. Need AiReportSchedulerService with @Cron (e.g., every 5 minutes) to find due schedules (status=ACTIVE and 
ext_run_at <= now), generate narratives via generateReportNarrative, update last_run_at, 
ext_run_at, un_count, store last_ai_narrative_preview, optionally send emails if deliver_by_email/recipients configured. Must be idempotent, have logging, and be registered in AiAssistantModule.

3. **Backend streaming fully wired end-to-end**
   - chatStream() method exists in service and controller exposes endpoint. Need to confirm frontend useAIChat receives proper SSE format through backend (backend just pipes Python stream). Should verify with integration test/smoke.

4. **Upload security hardening**
   - Python ill_form: need MIME/type allowlist, extension allowlist, max size enforced (already partially), stronger filename sanitization, ensure temp files always cleaned up. Backend FileInterceptor has size limit; should also validate MIME if needed.

5. **Comprehensive tests (.spec.ts)**
   - Need to add full backend specs for i-assistant.service.ts, i-assistant.controller.ts, and extend guardrails.service.spec.ts/inancial-context.service.spec.ts coverage. Also add Python tests as needed beyond the existing 8.

6. **End-to-end verification**
   - Run lint, full jest, pytest. Smoke test chat (streaming), analyze/forecast/explain/fill-form, and scheduled reports after scheduler is added.
