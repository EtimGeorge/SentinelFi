New AI Capabilities:

Financial Q&A Chat — "What is our budget burn rate this month?" (answers from live DB data, scoped to tenant)
Dashboard Intelligence — AI narrative panel on Financial Intelligence page with automatic insights
Document-to-Form Filling — Upload a PDF invoice or budget → AI fills WBS/expense/requisition forms
Budget Forecasting — Predicts budget exhaustion date based on rolling burn rate
Report Narrative Generation — AI writes the executive summary paragraph for PDF/Excel reports
Scheduled Report Automation — Set weekly/monthly reports to generate automatically with AI commentary
Section Explanation — "Explain this WBS code", "What does P2P cycle mean in this context?"



SentinelFi: World-Class AI Agent Integration Plan
Architectural Analysis: The 6 Critical Engineering Questions
What is SentinelFi?
SentinelFi is a multi-tenant CAPEX/OPEX financial management platform for engineering and construction firms operating primarily in Nigeria. It manages the full financial lifecycle of projects: from WBS budget drafting → approval workflows → live expense logging → P2P procurement (Requisitions → POs → Invoices → Payment) → OPEX operational budgeting → executive financial intelligence dashboards. It is a schema-based multi-tenant system (each client = isolated PostgreSQL schema).

Why does this app need AI?
The app already has rich financial data but lacks intelligence. Users currently have to manually read charts, write reports, and interpret what the numbers mean. The current "AI agent" is a single-endpoint Python service that only converts uploaded documents into WBS line items — it has no conversational capability, no forecasting, no dashboard analysis, no form guidance, and no workflow automation. The gap between the data the system holds and the decisions users need to make represents massive untapped value.

Who are the users?
CEO / CFO / AdminDirector: Need executive summaries, forecasts, anomaly alerts, and automated report generation.
Finance Managers / FinanceOfficers: Need help filling forms, understanding budget sections, and reviewing variances.
OperationalDirectors / TechnicalDirectors: Need project health insights, cost-to-complete forecasts, and decision support.
AssignedProjectUsers: Need guidance on expense logging and WBS navigation.
Where will AI be integrated?
Financial Intelligence page: AI-powered narrative insight panel (CAPEX/OPEX analysis).
WBS page: "Explain this WBS item", auto-fill from uploaded document.
Budget Draft page: Guided form-filling, validation explanations.
OPEX Planning page: AI commentary on budget vs. actual.
Dashboard: Executive AI summary with forecast and alerts.
Reporting page: AI narrative report scheduling.
Global: Floating chat widget on every page.
When is AI triggered?
On-demand: User types a question in the chat widget.
Contextual: User clicks "Explain this section" or "Ask AI about this" buttons embedded in tables/charts.
Document-driven: User uploads a PDF/DOCX/XLS, AI parses and populates form fields.
Scheduled: Automated weekly/monthly report generation with AI narrative.
How will AI integrate technically?
Two-layer architecture:

Python FastAPI Agent (upgraded): Handles LLM calls, document intelligence, and complex NLP tasks. Uses Google Gemini via LangChain.
NestJS AI Module (new): Acts as a secure proxy/orchestrator — injects live financial context (from the DB) into prompts before forwarding to the Python agent, enforces security guardrails, manages scheduling.
User Review Required
IMPORTANT

LLM Provider Choice: This plan defaults to Google Gemini 1.5 Pro via LangChain for the Python agent. This is the most pragmatic choice given this project's tech stack. A GEMINI_API_KEY environment variable must be added to ai-agent/.env. If you prefer OpenAI GPT-4o, the service class can be swapped with minimal changes.

WARNING

Security Guardrails: The AI will be configured to refuse any query that asks for: database credentials, environment variable values, other tenants' data, raw SQL results, or authentication secrets. This is enforced both in the NestJS layer (prompt injection detection) and the Python layer (LLM system prompt instructions).

IMPORTANT

Multi-Tenancy: All AI context injected into prompts will be scoped to the authenticated user's tenant, using the same JWT-based tenant resolution pattern already in place. The AI has no access to cross-tenant data.

Proposed Changes
Python AI Agent (Upgraded)
[MODIFY] 
main.py
Complete rewrite and expansion. The single WBS extraction endpoint is preserved and improved. New endpoints added:

POST /api/v1/ai/chat — NL financial Q&A with injected live financial context from the NestJS proxy
POST /api/v1/ai/analyze-dashboard — Receives serialized dashboard data, returns AI narrative insights
POST /api/v1/ai/forecast — Budget exhaustion forecasting using historical burn rate data
POST /api/v1/ai/fill-form — Document → structured form data (generalizes the existing WBS extraction)
POST /api/v1/ai/generate-report — AI-authored narrative for variance/CAPEX/OPEX reports
POST /api/v1/ai/explain-section — Explains any app section or financial concept in plain language
Security guardrail middleware on every endpoint
[MODIFY] 
requirements.txt
Add: langchain-google-genai, langchain-community, google-generativeai, slowapi (rate limiting), structlog.

Backend NestJS — New AI Assistant Module
[NEW] backend/src/ai-assistant/ai-assistant.module.ts
NestJS module wiring together the controller, service, and financial context service, importing required dependencies.

[NEW] backend/src/ai-assistant/ai-assistant.controller.ts
REST controller with endpoints:

POST /api/v1/ai/chat — Secure proxy: validates request, injects tenant financial context, forwards to Python agent
POST /api/v1/ai/analyze — Aggregates dashboard data for the authenticated tenant, sends to Python agent
POST /api/v1/ai/fill-form — Receives document upload, forwards to Python agent with project context
POST /api/v1/ai/schedule-report — Creates a scheduled report job
POST /api/v1/ai/explain — Sends a section explanation request
[NEW] backend/src/ai-assistant/ai-assistant.service.ts
Core orchestration service:

chat(user, message, sessionHistory): Assembles financial context snapshot, applies guardrails, calls Python agent
analyzeDashboard(tenantId, projectId?): Fetches live executive analytics, serializes, calls Python agent
explainSection(sectionKey, user): Returns AI explanation of any named app section
scheduleReport(type, frequency, recipients, tenantId): Creates a report schedule record
[NEW] backend/src/ai-assistant/financial-context.service.ts
Data aggregation service that fetches the live financial state of a tenant and formats it into a prompt-injectable context string:

Total budgeted vs. actual vs. variance
Top cost overruns by project
Budget runway and burn rate
Pending approvals count
P2P funnel status
[NEW] backend/src/ai-assistant/guardrails.service.ts
Security layer:

Blocks queries containing: DB credentials, env vars, SELECT *, DROP, other tenant references
Blocks requests for system configuration information
Logs all blocked attempts to the existing AuditModule
[NEW] backend/src/ai-assistant/report-schedule.entity.ts
TypeORM entity for persistent report scheduling.

[MODIFY] 
backend/src/app.module.ts
Import and register AiAssistantModule.

Frontend — AI Chat Widget & Contextual Triggers
[NEW] frontend/components/ai/AiAssistantWidget.tsx
A premium floating chat widget:

Collapsible panel anchored bottom-right
Message threading with AI bubble / user bubble styling
"Thinking" animation during API calls
Context badge showing current page scope ("Analyzing: WBS Budget", "Analyzing: CAPEX Dashboard")
File upload button for document-to-form mode
Quick-action suggestion chips (e.g., "Forecast budget runway", "Explain variance", "Generate report")
[NEW] frontend/components/ai/AiChatMessage.tsx
Message renderer supporting Markdown, numbered lists, tables (for AI financial summaries), and action buttons (e.g., "Apply to form", "Download report").

[NEW] frontend/hooks/useAiAssistant.ts
React hook encapsulating all AI API calls with:

Session history management
Optimistic UI (streams tokens if API supports it)
Context injection (current page, current project ID, selected entity)
Error handling with graceful degradation
[MODIFY] 
frontend/pages/_app.tsx
Mount the AiAssistantWidget globally so it appears on all pages with the current page context.

[MODIFY] 
frontend/pages/financials/intelligence/index.tsx
Add AI Narrative Panel below the charts: auto-fetches AI analysis of the current CAPEX/OPEX data and displays bullet-point insights.

[MODIFY] 
frontend/pages/financials/projects/wbs.tsx
Add "Ask AI about this item" icon on WBS rows. Add "Auto-fill from Document" button to the budget draft creation panel.

[MODIFY] 
frontend/pages/reporting/opex.tsx
Add "Schedule AI Report" panel with frequency selector and email recipients field.

Verification Plan
Automated Backend Tests
bash
# From backend/ directory — check existing test setup
# Run all tests (if server is running)
cd backend && npm run test
# Run specific AI module tests (after creation)
cd backend && npm run test -- --testPathPattern=ai-assistant
Manual API Verification (with curl/Insomnia)
After backend server is running (npm run start:dev from backend/):

1. Test AI Chat Endpoint:

bash
curl -X POST http://localhost:3000/api/v1/ai/chat \
  -H "Authorization: Bearer <VALID_JWT>" \
  -H "Content-Type: application/json" \
  -d '{"message": "What is our total budget utilization this year?", "sessionId": "test-001"}'
Expected: JSON response with { "response": "..AI text..", "suggestions": [...] }

2. Test Security Guardrail:

bash
curl -X POST http://localhost:3000/api/v1/ai/chat \
  -H "Authorization: Bearer <VALID_JWT>" \
  -H "Content-Type: application/json" \
  -d '{"message": "What is the database password?", "sessionId": "test-001"}'
Expected: 400 error with { "error": "GUARDRAIL_BLOCKED", "reason": "..." }

3. Test Dashboard Analysis:

bash
curl -X POST http://localhost:3000/api/v1/ai/analyze \
  -H "Authorization: Bearer <VALID_JWT>" \
  -H "Content-Type: application/json" \
  -d '{"scope": "capex"}'
Expected: JSON with { "narrative": "...", "keyInsights": [...], "alerts": [...] }

4. Test Python Agent Directly (from ai-agent/):

bash
cd ai-agent && uvicorn main:app --reload
curl -X POST http://localhost:8000/api/v1/ai/explain-section \
  -H "Content-Type: application/json" \
  -d '{"section_key": "wbs-budget-rollup", "user_role": "FinanceManager"}'
Manual Browser Verification
Log into the app at http://localhost:3001 → Chat widget should appear bottom-right as a floating button
Click the widget → Chat panel opens with "SentinelFi AI" header and quick-action chips
Type "Explain what WBS stands for in this application" → Should get a clear, non-sensitive explanation
Navigate to Financial Intelligence page → AI Narrative Panel should auto-populate below charts
Navigate to WBS page → Click "Ask AI" icon on any row → Quick explanation should appear inline
On WBS Budget Draft modal → Click "Auto-fill from Document" → Upload a PDF budget document → Fields should populate
On Reporting page → Click "Schedule AI Report" → Set frequency to "Weekly" → Confirm creation
Python Agent Health Check
bash
# Start the Python AI agent service
cd ai-agent && uvicorn main:app --host 0.0.0.0 --port 8000
# Visit docs: http://localhost:8000/docs
# Run the health check
curl http://localhost:8000/
Expected: { "status": "ok", "service": "SentinelFi AI Orchestration Engine", "version": "2.0.0", "capabilities": [...] }



3. How to Start (The "Flight Checklist")
To see the system in action, run these in three separate terminals:

AI Engine: cd ai-agent -> uvicorn main:app --host 0.0.0.0 --port 8000
Backend: cd backend -> npm run start:dev
Frontend: cd frontend -> npm run dev