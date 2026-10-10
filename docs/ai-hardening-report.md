# AI Hardening Report (Plain English)

**Date:** October 8, 2026
**Where we stopped:** I finished adding the backend streaming endpoint wiring (controller now exposes POST /api/v1/ai/chat/stream) and started working on ReportSchedule consolidation/scheduler. Python agent was already patched (streaming endpoint in Python, improved forecast risk levels, normalized narrative sections for the UI). Python tests: 8 passed (see .workspace-temp/pytest_results_20261008.txt).

## What was done
- **Python agent (ai-agent/main.py):**
  - Added SSE streaming chat endpoint (/api/v1/ai/chat/stream) returning 	ext/event-stream with data: {"content":...}\n\n and data: [DONE]\n\n. Blocks harmful messages safely.
  - Fixed forecast risk: now returns UNKNOWN when days remaining can't be computed, uses CRITICAL/HIGH/MEDIUM/LOW bands (safer, less overconfident).
  - Normalized narrative parsing: maps section titles to executive_summary, key_insights, nomalies, ecommendations, isks, conclusion so the UI can render them correctly.
  - Cleaned up financial context formatting (smarter currency vs numeric formatting) and kept secrets sanitization.
  - Python compiles and existing Python tests still pass.

- **Backend controller (backend/src/ai-assistant/ai-assistant.controller.ts):**
  - Added POST /api/v1/ai/chat/stream endpoint (JWT + role guards) that delegates to iService.chatStream(...). This lets the frontend's streaming hook talk to the backend, which can proxy to Python SSE.

- **Setup:**
  - Pytest/httpx installed in ai-agent venv. Test results saved to .workspace-temp/pytest_results_20261008.txt.

## What still needs to be done (next steps)
1. **Backend service streaming proxy:** Implement AiAssistantService.chatStream() to call Python agent's /api/v1/ai/chat/stream and return/pipe the SSE response (or stream through backend). Right now only controller method exists.
2. **Scheduler worker (@Cron):** Create an AiReportSchedulerService (or add to existing module) that runs on a schedule (e.g., every 5 minutes). It should find due report schedules (ACTIVE with 
ext_run_at <= now), run them, update last_run_at, 
ext_run_at, un_count, store last narrative preview, and optionally send emails. Register in AiAssistantModule.
3. **Consolidate ReportScheduleEntity:** Pick a single authoritative entity (AI schema is what service/controller use: has un_count, last_ai_narrative_preview, deliver_by_email, project_id, etc.). Update eporting.module.ts, common/config/database.config.ts, pp.module.ts, and any other imports to use the same entity. Remove/replace the duplicate to avoid TypeORM conflicts. Plan migration if schema differs.
4. **Upload security hardening:** Add MIME/extension allowlist, explicit max upload size enforcement on Python path, stronger filename sanitization, and ensure temp files are always cleaned up. Align backend interceptor limits.
5. **Fix forecast/narrative/context fully:** Ensure all missing fields in context are included sensibly, and UI mapping is robust (already improved; may need panel tweaks). 
6. **Add all .spec.ts files:** Create comprehensive backend specs for i-assistant.service, i-assistant.controller, guardrails.service, inancial-context.service (and related) with full coverage. Add/extend Python tests as needed.
7. **Verify end-to-end:** Run 	sc --noEmit (backend/frontend), lint, jest, pytest. Smoke test chat (streaming), analyze/forecast/explain/fill-form, and scheduled reports.

## Notes
- Tests are in place for Python agent basics (8 passed). Backend has some existing specs for guardrails/financial-context; need AI service/controller specs.
- All changes so far are minimal and focused (controller + Python agent). The bigger pieces (scheduler + consolidation + service streaming) are the next logical steps.
