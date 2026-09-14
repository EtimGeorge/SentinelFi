# SentinelFi - UI/UX Redesign Plan

**Date Created**: 2026-09-05  
**Status**: Active - Implementation Phase  
**Based On**: `sentinelfi-ui-design-brief.md` (2026-09-05 revision)

---

## Executive Summary

This document outlines the comprehensive UI/UX redesign for SentinelFi, a multi-tenant CAPEX/OPEX financial platform for engineering and construction firms in Nigeria. The plan addresses gaps identified in a full audit against the design brief, prioritizing role-based experience, core financial flows, AI Assistant as a conversational interface, and systematic visual/motion/accessibility standards.

**Guiding Principle**: Do not change what is already working. Build missing pages, enhance placeholders, add advanced functionality. Test after every implementation. Zero regressions.

---

## 1. FULL UI/UX AUDIT CHECKLIST (Baseline)

| Category | Requirement | Current Status | Action Required |
|---|---|---|---|
| **Role-Based Experience** | Distinct home screens per role | ❌ Generic dashboard | Implement role-config + route guard |
| | Sidebar items show only actionable | ⚠️ Disabled not hidden | Filter by role, hide non-actionable |
| | CFO → Financial Intelligence | ❌ Missing route | Build `/financial-intelligence` |
| | Finance Manager → WBS filtered | ⚠️ Basic WBS only | Add filter params + role routing |
| | Operational Director → Procurement | ❌ Missing route | Build `/procurement` P2P kanban |
| | Project User → Expense logging | ⚠️ Partial | Enhance project-scoped view |
| **Core Flows** | Budget lifecycle with AI approval | ❌ Missing | Build approval flow with AI anomalies |
| | P2P cycle (Req→PO→Inv→Pay) | ❌ Missing | Build stepper + kanban |
| | Document-to-form (PDF→AI→Review) | ❌ Missing | Build upload modal + review step |
| | First-time tenant setup | ⚠️ Partial | Guided onboarding flow |
| **Empty/Loading/Error** | Empty states with primary action | ❌ Bare tables | Create EmptyState component |
| | Loading skeletons matching layout | ⚠️ Spinners only | Skeleton cards/rows/tables |
| | Error states with actionable voice | ❌ Generic errors | "Couldn't reach AI - retry" pattern |
| | Permission-denied distinct state | ⚠️ Some tooltips | Unified PermissionDenied component |
| **Findability** | Global search grouped by type | ⚠️ Limited scope | Expand search index |
| | Persistent filter/sort per user | ❌ Resets every visit | localStorage + CLS persistence |
| | AI as findability shortcut | ❌ Not implemented | "Where is PO-4471" → chat |
| **Notifications** | In-app notification center | ⚠️ Bell exists | Role-aware density + email digest |
| | P2P overdue SLA alerts | ❌ Missing | Build notification types |
| **Visual System** | Purple = AI-only (never reused) | ❌ Violated | Audit all `brand-secondary` usage |
| | Cyan = OPEX series | ❓ Unknown | Audit charts |
| | Financial figures: tabular-nums | ⚠️ Inconsistent | Enforce globally |
| | 4xl radius for AI chat mobile | ❌ Missing | Add to tailwind config |
| | Dark mode class-based | ✅ Config exists | Maintain |
| **Motion System** | 18 moments defined in brief | ❌ Most missing | Implement systematically |
| | prefers-reduced-motion | ⚠️ Media query only | Systemic application |
| **Mobile** | Sidebar → bottom tabs <640px | ❌ Desktop only | Build BottomTabBar |
| | Tables collapse to cards | ❌ Full tables | Responsive table component |
| | FAB → full-screen sheet | ⚠️ FAB basic | Full chat sheet on mobile |
| | Touch targets 44×44px | ⚠️ Partial | Audit all interactive |
| | No hover-only affordances | ❌ Many exist | Mobile-first affordances |
| **AI Assistant** | Persistent FAB + pulsing ring | ❌ Missing | Build FAB component |
| | Chat panel (desktop/mobile) | ❌ Missing | Build ChatPanel + ChatSheet |
| | Scope badge per page | ❌ Missing | Context provider |
| | Streaming response | ❌ Missing | Token/chunk streaming |
| | Rich inline (charts/tables/chips) | ❌ Missing | Message content types |
| | Quick-reply chips | ❌ Missing | Suggestions below AI msg |
| | Document upload + progress | ❌ Missing | Composer attachment |
| | Session history per tenant | ❌ Missing | Persist conversation |
| | Contextual "Ask AI" icons | ❌ Missing | Inline on rows/charts |
| **Charts** | Real charting library | ❌ Static SVGs | Integrate Recharts/Chart.js |
| | Entrance animations | ❌ Missing | Grow/draw animations |
| | Series toggle via legend | ❌ Missing | Interactive legends |
| | Time-range re-animation | ❌ Missing | Range selector |
| **Row Actions/Buttons** | Kebab column fixed width | ⚠️ Partial | Standardize |
| | Desktop hover-reveal | ❌ Missing | Opacity fade-in |
| | Mobile always-visible kebab | ⚠️ Partial | ActionSheet component |
| | Semantic icon coloring | ❌ Not enforced | Color system enforcement |
| | Icon-only tooltips (400ms) | ❌ Missing | Tooltip component |
| | Button loading = color spinner | ❓ Unknown | Standardize Button |
| **Accessibility** | Keyboard focus in domain accent | ❌ Missing | Focus-visible styles |
| | Color + text pairing | ⚠️ Partial | Badge/flag components |
| | Contrast at dark opacity | ❓ Unknown | Audit all text/background |
| | Chat not blocking input | ❓ Unknown | Verify |

---

## 2. ROLE-BASED ROUTING ARCHITECTURE

### 2.1 Route Mapping

| Role | Default Route | Visible Sidebar Routes |
|---|---|---|
| **CEO / AdminDirector** | `/dashboard` | Dashboard, Financial Intelligence, Reports, Settings |
| **CFO** | `/financial-intelligence` | Financial Intelligence, Dashboard, Reports |
| **Finance Manager / Officer** | `/wbs?filter=pending&assigned=true` | WBS & Budgets, Projects, Dashboard |
| **Operational / Technical Director** | `/procurement` | Procurement, P2P, Requisitions, Projects |
| **Assigned Project User** | `/project/:projectId?mode=expense` | WBS (own project), Expense Logging |

### 2.2 Route Guard Enhancement

```typescript
// src/guards/RoleBasedRouteGuard.tsx
const ROLE_CONFIG: Record<string, RoleConfig> = {
  CEO: { defaultRoute: '/dashboard', visible: ['/dashboard', '/financial-intelligence', '/reports', '/settings'] }, CFO: { defaultRoute: '/financial-intelligence', visible: ['/financial-intelligence', '/dashboard', '/reports'] }, FinanceManager: { defaultRoute: '/wbs?filter=pending&assigned=true', visible: ['/wbs', '/projects', '/dashboard'] }, OperationalDirector: { defaultRoute: '/procurement', visible: ['/procurement', '/p2p', '/projects'] }, ProjectUser: { defaultRoute: '/project/:projectId?mode=expense', visible: ['/project'] },
};
```

### 2.3 Mobile Bottom Tab Bar (<640px)

```typescript
// 5 primary destinations + "More" tab
const BOTTOM_TABS = [
  { path: '/dashboard', icon: Home, label: 'Dashboard' },
  { path: '/financial-intelligence', icon: TrendingUp, label: 'Finance' },
  { path: '/wbs', icon: BarChart, label: 'WBS' },
  { path: '/procurement', icon: ShoppingBag, label: 'Procurement' },
  { path: '/reports', icon: FileText, label: 'Reports' },
  { path: '/more', icon: MoreHorizontal, label: 'More' },
];
```

---

## 3. AI ASSISTANT CHAT COMPONENT SPECIFICATION

### 3.1 Component Hierarchy

```
AIChatFAB (persistent, bottom-right, pulsing ring on insight)
  └─► AIChatPanel (desktop: 380px docked, right)
      └─► AIChatSheet (mobile: full-screen, slides up)
```

### 3.2 Props & Types

```typescript
// src/components/ai-chat/types.ts
interface AIChatScope {
  page: string;
  entityType?: string;
  entityId?: string;
}

interface AIMessage {
  id: string;
  role: 'user' | 'ai';
  content: string | RichContent;
  timestamp: Date;
  streaming?: boolean;
}

type RichContent = 
  | { type: 'text'; value: string }
  | { type: 'chart'; data: ChartData; config: ChartConfig }
  | { type: 'table'; headers: string[]; rows: string[][] }
  | { type: 'actions'; chips: ActionChip[] };

interface ActionChip {
  label: string;
  onSelect: (prompt: string) => void;
  variant: 'primary' | 'secondary' | 'destructive';
}

interface SuggestionChip {
  label: string;
  prompt: string;
  relevance: 'fresh' | 'contextual' | 'related';
}
```

### 3.3 State Management

```typescript
// useAIChat.ts
const useAIChat = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [scope, setScope] = useState<AIChatScope>({ page: 'Dashboard' });
  const [inputValue, setInputValue] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [proactiveInsight, setProactiveInsight] = useState<string | null>(null);

  // Persist per tenant user
  useEffect(() => {
    localStorage.setItem(`sentinelfi:chat:${tenantId}:${userId}`, JSON.stringify(messages));
  }, [messages]);
};
```

### 3.3 Conversational Flow

1. **Open**: FAB click → panel opens with scope badge "Analyzing: [Current Page]"
2. **Greeting**: AI sends welcome + 3-4 starter chips (first session only)
3. **User input**: Type or select chip → typing indicator (3 dots) → streaming response
4. **Rich content**: AI message may include chart/table/action chips inline
5. **Quick-replies**: Chips appear below latest AI message when relevant
6. **Document upload**: Drag/drop → file chip + progress → AI reflects parsed content
7. **Context change**: Navigate → scope badge updates → AI acknowledges shift next message
8. **History**: Reopen panel → conversation persists, scope updated

---

## 4. BUDGET LIFECYCLE APPROVAL FLOW

### 4.1 State Machine

```
DRAFT_WBS_BUDGET
  │
  ├─ Submit for Approval → PENDING_APPROVAL
  │     │
  │     ├─ Approver View: AI anomalies inline + raw numbers
  │     │     │
  │     │     ├─ Approve (with comment) → APPROVED_BASELINE
  │     │     │     └─ Toast with Undo (5s) → reverts to PENDING_APPROVAL
  │     │     │
  │     │     └─ Reject (with comment) → DRAFT_WBS_BUDGET (feedback attached)
  │     │
  │     └─ Cancel → DRAFT_WBS_BUDGET
  │
  └─ Delete (destructive) → DELETED
```

### 4.2 Approval View Components

| Component | Props | Behavior |
|---|---|---|
| `ApprovalPanel` | `budgetId`, `onApprove`, `onReject` | Shows AI flagged anomalies beside KPIs |
| `AnomalyBadge` | `variance`, `aiCommentary` | Red/orange for negative, green for positive |
| `ConfirmationDialog` | `title`, `body`, `onConfirm`, `destructive` | Desktop modal / Mobile sheet |
| `ToastWithUndo` | `message`, `onUndo`, `duration` | 5000ms, auto-dismiss with progress bar |

### 4.3 P2P Stepper (Detail View)

```typescript
// Stages: REQUISITION → PURCHASE_ORDER → INVOICE → PAYMENT
<P2PStepper currentStage={stage} stages={['REQUISITION', 'PO', 'INVOICE', 'PAYMENT']}>
  <StageItem completed={true} timestamp={...} actor={...} />
  <StageItem current={true} />
  <StageItem pending={true} />
  <StageItem pending={true} />
</P2PStepper>
```

---

## 5. SIDEBAR/NAVIGATION AUDIT & SPEC

### 5.1 Current Working (Preserve)
- ✅ Tailwind config tokens
- ✅ Dark mode class-based
- ✅ Basic routing structure
- ✅ Topbar with search/avatar
- ✅ Existing pages: Dashboard, Projects, WBS, Settings, Super Admin

### 5.2 Required Changes

| Change | Implementation |
|---|---|
| Role-filtered sidebar | `SidebarItems.filter(item => roleConfig.visible.includes(item.path))` |
| Hidden not disabled | Remove `disabled` items entirely from DOM |
| Persistent filter/sort | `localStorage.setItem('sentinelfi:filters:${route}', JSON.stringify(state))` |
| KPI scroll-snap carousel | `overflow-x-auto snap-x snap-mandatory` with 1.5 cards visible |
| Table → card list mobile | CSS grid at >640px, flex-col card at <640px |
| FAB chat widget | Fixed bottom-right, `z-[9999]`, pulsing ring on insight |
| Bottom tab bar | `<BottomTabBar>` at `<640px`, hides sidebar |

---

## 6. IMPLEMENTATION STATUS & ROADMAP

### Phase 1: Role-Based Foundation (Sprints 1-2)
| # | Feature | Status | Owner | Test Criteria |
|---|---|---|---|---|
| 1 | Role-config constants | ✅ Spec complete | - | Config validates |
| 2 | RouteGuard role-aware | ⏳ Pending | - | Redirects by role |
| 3 | Sidebar role filtering | ⏳ Pending | - | Items hidden per role |
| 4 | Mobile bottom tabs | ⏳ Pending | - | <640px shows tabs |
| 5 | Persistent filters | ⏳ Pending | - | Survives refresh |

### Phase 2: Core Flows (Sprints 3-4)
| # | Feature | Status | Owner | Test Criteria |
|---|---|---|---|---|
| 6 | Budget submit action | ⏳ Pending | - | POST /budgets/:id/submit |
| 7 | AI inline anomalies | ⏳ Pending | - | Badges show in approval |
| 8 | Approval modal | ⏳ Pending | - | Desktop modal / Mobile sheet |
| 9 | P2P stepper | ⏳ Pending | - | Timeline visible |
| 10 | Document-to-form modal | ⏳ Pending | - | Upload → extract → review |
| 11 | Toast with Undo | ⏳ Pending | - | 5s undo works |

### Phase 3: AI Assistant (Sprints 5-6)
| # | Feature | Status | Owner | Test Criteria |
|---|---|---|---|---|
| 12 | AI FAB + pulsing | ⏳ Pending | - | Ring on proactive insight |
| 13 | ChatPanel / ChatSheet | ⏳ Pending | - | Opens/closes correctly |
| 14 | Scope badge | ⏳ Pending | - | Updates per route |
| 15 | Streaming response | ⏳ Pending | - | Token-by-token visible |
| 16 | Rich inline content | ⏳ Pending | - | Chart/table in message |
| 17 | Quick-reply chips | ⏳ Pending | - | Below latest AI msg |
| 18 | Document upload | ⏳ Pending | - | Progress + review step |
| 19 | Session history | ⏳ Pending | - | Persists per tenant |
| 20 | Contextual "Ask AI" | ⏳ Pending | - | Icons on rows/charts |

### Phase 4: Visual & Motion (Sprints 7-8)
| # | Feature | Status | Owner | Test Criteria |
|---|---|---|---|---|
| 21 | Semantic coloring | ⏳ Pending | - | Purple=AI only |
| 22 | Motion 18 moments | ⏳ Pending | - | All animations work |
| 23 | Reduced motion respect | ⏳ Pending | - | Disables count-ups |
| 24 | Contrast verification | ⏳ Pending | - | AA/AAA at opacity |
| 25 | KPI count-up | ⏳ Pending | - | Staggered 60ms |

### Phase 5: Polish & Accessibility (Sprints 9-10)
| # | Feature | Status | Owner | Test Criteria |
|---|---|---|---|---|
| 26 | Keyboard focus | ⏳ Pending | - | Visible in domain accent |
| 27 | Color + text pairing | ⏳ Pending | - | All badges accessible |
| 28 | Global search upgrade | ⏳ Pending | - | Grouped results |
| 29 | Loading skeleton system | ⏳ Pending | - | Layout-matching |
| 30 | Performance audit | ⏳ Pending | - | Metrics pass |

### Missing Pages to Build

| Page | Current | Required |
|---|---|---|
| `/financial-intelligence` | ❌ Missing | Variance charts, forecast, approval queue |
| `/procurement` | ❌ Missing | P2P kanban with stepper |
| `/project/:id?mode=expense` | ⚠️ Partial | Expense logging focus |
| `/wbs?filter=pending&assigned` | ⚠️ Partial | Role-filtered view |
| `/project/:id/budget/:id/edit` | ⚠️ Basic | Approval flow + AI anomalies |
| AI Chat (FAB-driven) | ❌ Missing | Full conversational panel |
| Empty states per route | ❌ Not systematic | Per-route EmptyState |

---

## 7. ADVANCED FUNCTIONALITIES TO ADD

1. **AI Proactive Insights**: FAB pulses when new analysis ready (e.g., "Budget variance detected for Lekki")
2. **Cross-Page Context**: Scope badge updates on navigation; AI acknowledges context shift
3. **Undo/Redo System**: 5-second toast undo for delete/approval revert
4. **Report Scheduling**: Narrative toggle → scheduled reports → email digest
5. **Persisted Search State**: Global search remembers terms across visits
6. **Filter Persistence**: WBS Finance Officer's "My projects, Pending" stays set

---

## 8. POST-IMPLEMENTATION TEST CHECKLIST

After each feature:

- [ ] No 500 errors in `scripts/tmp/backend_boot.log`
- [ ] Health endpoints: `/health/live` 200, `/health/metrics` 200
- [ ] Login flow: tenant isolation verified (`saencrystal.global` → SOLUTION_ENERGY)
- [ ] Projects/Dashboard/WBS return 200 via curl
- [ ] Role-specific routes load for each user type
- [ ] Mobile <640px renders bottom tabs correctly
- [ ] `prefers-reduced-motion` disables count-ups/staggers
- [ ] Keyboard focus visible in domain accent color
- [ ] TypeScript: `npm run typecheck-all` passes
- [ ] Lint: `npm run lint-all` passes
- [ ] Git: no CRLF warnings on critical files (`core.autocrlf=false`)

---

## 9. IMPLEMENTATION GUIDELINES

1. **Do not change working code** - extend, don't rewrite
2. **Build missing pages** - placeholders become full implementations
3. **Add advanced functionality** - exceed brief where genuine capability gaps exist
4. **Test after every change** - zero regressions
5. **Document deviations** - if brief conflicts with technical reality, record decision
6. **Use existing tokens** - no new brand hues, fonts, or animation keyframes
7. **Mobile-first** - every component must work at <640px

---

*This document will be updated as implementation progresses. See `IMPLEMENTATION_STATUS.md` for real-time tracking.*