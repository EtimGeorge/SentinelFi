# SentinelFi — UI/UX Implementation Brief

Use this as the design prompt for building out the SentinelFi frontend (Dashboard, Financial Intelligence, WBS & Budgets, Procurement, OPEX Planning, Reporting, and the global AI Assistant). It replaces the earlier static mockup with a fully interactive, animated, mobile-responsive spec.

> **Note:** this revision builds strictly on the project's existing `tailwind.config.js` — `brand-primary` teal, `brand-secondary` purple, `brand-dark`/`brand-darker`, the alert and WBS category colors, `Inter`/`Sora`, and the `pulse-slow`/`float` animations already defined. No new brand hues, fonts, or animation keyframes are introduced; new spacing/radius values are called out explicitly where the existing config doesn't yet cover them, so they can be added rather than conflicting.

---

## 1. Product framing

SentinelFi is a multi-tenant CAPEX/OPEX financial platform for engineering and construction firms in Nigeria. The audience is CFOs, finance managers, and project directors making real money decisions — the UI should feel precise, fast, and trustworthy, with warmth added through color, motion, and a genuinely conversational AI layer. Never let animation or iconography make the product feel like a toy; every motion and icon should support faster comprehension of financial data.

---

## 2. UX foundations — flows, roles, and states

Everything from §3 onward is the visual/interaction layer. This section is the layer underneath it: what the user is trying to do, what they're allowed to do, and what the product says when things are empty, wrong, or loading. Get this wrong and no amount of animation or color fixes it.

### Role-based experience, not just role-based permissions

The doc's five roles don't just need different *permissions* — they need different *home screens and defaults*, because they ask the system different questions:

| Role | Lands on | Defaults to seeing |
|---|---|---|
| CEO / AdminDirector | Dashboard | Portfolio-wide health, AI executive narrative, alerts — no line-item editing surfaces |
| CFO | Financial Intelligence | CAPEX/OPEX variance, forecasts, approval queue depth |
| Finance Manager / Officer | WBS & Budgets | Their assigned projects' WBS items, pending drafts awaiting their input |
| Operational / Technical Director | Procurement (P2P) | Project health, cost-to-complete, requisitions needing their sign-off |
| Assigned Project User | WBS & Budgets (expense logging view) | Only their project's WBS, an "Add expense" primary action front and center |

Don't ship one dashboard and hide widgets per role with CSS — structure the routing so each role's first screen after login is the one built for their actual first question. Sidebar items a role can't act on are hidden entirely, not shown-and-disabled — disabled nav items create confusion about whether it's a bug or a permission. Inside a page, an action a user can *see the result of* but not *perform* (e.g., a Finance Officer viewing an approval they can't approve) is shown but disabled with a tooltip explaining why ("Requires CFO approval").

### Core flows to design end-to-end, not just as isolated screens

1. **Budget lifecycle:** Draft WBS budget → submit for approval → approver reviews (sees AI-flagged anomalies inline, not just raw numbers) → approved/rejected-with-comment → becomes the baseline actuals are measured against. Design the approval step so the approver never has to leave the review screen to go look something up — pull in the AI's variance commentary right there.
2. **P2P cycle:** Requisition → PO → Invoice → Payment. Each transition is a status change with a visible timeline/stepper on the item's detail view (not just a kanban column move) so anyone can answer "where is this and who's it waiting on" without asking in Slack.
3. **Document-to-form:** Upload a budget/invoice PDF → AI extracts line items → user reviews a **side-by-side** view (original document on one side, extracted fields on the other) → confirms or corrects before it's saved — never auto-save extracted data without this review step, since it's financial data.
4. **First-time tenant setup:** Org creation → invite team by role → confirm currency/region defaults → land on a dashboard with sample or empty-state guidance rather than a blank grid of zeros.

### Empty, loading, and error states are content, not afterthoughts

- **Empty states** explain what's missing and offer the one action that fixes it — e.g., a tenant with no WBS items yet shows "No budget items yet — create your first WBS draft or auto-fill from a document," not a bare table header. Never show a chart with no data as a blank card; show a specific empty illustration + the action.
- **Loading states** use skeleton shapes matching the real layout (skeleton KPI cards, skeleton table rows), not a generic spinner over the whole page — this is what makes the "generating report" and "AI thinking" moments feel considered rather than stalled.
- **Error states** say what happened and what to do next, in the system's own voice, never apologetic or vague: "Couldn't reach the AI service — your data is unaffected. Retry" rather than "Something went wrong." A failed document upload names the actual problem ("This file is a scanned image with no readable text — try a text-based PDF") instead of a generic upload-failed message.
- **Permission-denied** is a distinct state from "empty" or "error" — it explains who to ask, not just that access is blocked.

### Findability

- One global search (already in the topbar) searches across projects, WBS codes, vendors, and PO/invoice numbers, with results grouped by type, not a flat list.
- Every table gets persistent filter/sort state per user per view (e.g., a Finance Officer's WBS filter to "My projects, Pending" stays set when they come back), rather than resetting to default on every visit.
- The AI is a findability shortcut, not just an analysis tool — "Where is PO-4471" or "Show me overdue requisitions for Enugu" should resolve as reliably as typing it into search.

### Notifications

- An in-app notification center (bell icon, already in the topbar) covers: items awaiting the user's approval, AI-flagged anomalies above a threshold, and P2P items overdue past SLA — not a firehose of every system event.
- Notification density is role-aware: a CFO gets portfolio-level alerts, a Project User gets only their project's.
- Critical items (budget about to exceed, approval SLA breach) can additionally go to email/digest per the scheduled-report mechanism already planned in Reporting — don't build a second, separate notification-preferences system for this.

---

## 3. Visual system (tokens)

**Palette — pulled directly from the existing `DESIGN_SYSTEM.md` / Tailwind config. Do not introduce new brand hues; the AI layer and charts must be built from this set, not a new one.**

| Token | Hex | Use |
|---|---|---|
| `brand-dark` | `#0B0F1A` | App background |
| `brand-darker` | `#05070A` | Deepest surfaces (modals, chat panel backdrop) |
| `gray-800` | `#1F2937` | Card/panel base surface |
| `brand-primary` | `#0D9488` | Primary accent — primary buttons, active nav, links, CAPEX series |
| `brand-secondary` | `#6B46C1` | Secondary accent — reserved for the AI/Intelligence layer specifically, so "purple = AI-generated" becomes a learned convention across the app |
| `m-accent` | `#0891B2` | Cyan accent — OPEX series, secondary data series in charts |
| `alert-positive` | `#059669` | Positive variance, approved status, under-budget |
| `alert-critical` | `#EA580C` | Negative variance, overdue, risk insights |
| `m-text-muted` | `#CBD5E1` | Secondary/muted text on dark surfaces |

**WBS category palette** (`wbs-green` `#059669`, `wbs-blue` `#2563EB`, `wbs-yellow` `#FBBF24`, `wbs-magenta` `#DB2777`, `wbs-cyan` `#06B6D4`, `wbs-red` `#DC2626`, `wbs-violet` `#7C3AED`, `wbs-orange` `#EA580C`) is used **only** to color-code WBS categories (Materials, Labour, Equipment, etc.) in the WBS table, category breakdowns, and budget charts — it is a data-categorization palette, not a general UI accent set. Don't reuse it for buttons or nav.

**Typography**
- Display/headings: `Sora` (600/700) — page titles, big KPI numbers, card headers.
- Body/UI/data: `Inter` (400/500/600) — everything else, with `font-variant-numeric: tabular-nums` on all financial figures so columns align.
- Codes only (WBS codes, PO numbers, reference IDs): a monospace face (add one to the config if not already present, e.g. `JetBrains Mono`).
- Base size 14px, scale in 1.15–1.25 ratio steps. Line length under 80 characters for narrative/AI text.

**Spacing & shape**
- 4px base unit (config already defines `20`/`64` for collapsed/expanded sidebar width — reuse these rather than introducing new spacing values). Card padding 20px desktop / 16px mobile.
- Card radius follows the existing scale; use the new `4xl` (2rem) token for the AI chat sheet on mobile only. Pills/badges fully rounded.
- The AI panel gets a distinct 1px gradient border (`brand-secondary` → transparent) so it never reads as "just another card" and reinforces purple = AI.
- One consistent elevation: cards sit flat on `gray-800` with a border, not a shadow — reserve shadow for genuinely floating elements (the AI chat window, dropdowns, modals, toasts).
- Dark mode is class-based (`darkMode: 'class'`) per the existing config — build all of the above as the default (and for now, only) theme rather than assuming a light mode exists.

---

## 4. Iconography — solid, colored, real icons (not line/stroke SVGs)

Replace all outline/stroke icon usage with a **solid, filled, colored icon system**. Rules:

- Every icon is a **filled shape**, not a 1.5–2px stroke outline. No line-art icons anywhere in the product.
- Icons carry **real color**, not the surrounding text color, drawn from the existing brand tokens only. Each domain gets a fixed hue so users learn to scan by color:
  - Financial Intelligence → `m-accent` cyan `#0891B2`
  - Procurement / P2P → `brand-primary` teal `#0D9488`
  - Budgets & WBS → the WBS category palette (per-category color, not a single fixed hue — see §2)
  - Positive/approved states → `alert-positive` green `#059669`
  - Risk/overdue/negative → `alert-critical` orange `#EA580C`
  - AI / SentinelFi Intelligence → `brand-secondary` purple `#6B46C1`, reserved exclusively for AI-generated content so purple becomes the learned signal for "this came from the model," never used elsewhere in the UI.
- Recommended source libraries: **Solar Icons (Bold set)**, **Phosphor (Fill)**, or **Fluent System Icons (Filled)** — pick one family and use it exclusively; do not mix filled styles from multiple families.
- Sidebar nav icons sit inside a soft 32px rounded-square tile tinted at 12% opacity of their domain color; the active item's tile goes to full color with a white/near-white glyph.
- Avoid emoji as functional icons; if a friendlier register is wanted for empty states or onboarding, use a small set of custom colored illustrations instead, not emoji.

---

## 5. Motion system — animate with intent, not decoration

Use animation only where it communicates state change, hierarchy, or system feedback. Respect `prefers-reduced-motion` everywhere (fall back to instant/opacity-only transitions).

| Moment | Animation |
|---|---|
| Page/tab switch (sidebar nav) | Cross-fade + 4px slide, 180ms, outgoing page fades out first |
| KPI numbers on load | Count up from 0 to final value over 600–900ms, eased out, staggered 60ms per KPI |
| Charts on load | Bars grow from baseline, lines draw left-to-right along their path (stroke-dashoffset), 500–800ms |
| Funnel/progress bars | Fill animates width from 0 → target once, on scroll-into-view |
| AI insight cards appearing | Each insight card fades + slides up 8px, staggered 80ms, only on first load per session (not on every tab switch) |
| AI "thinking" state | Three-dot typing indicator, soft pulsing opacity loop |
| AI response streaming | Text reveals token-by-token or in short chunks, not all at once |
| Card/row hover | Border color shifts to domain accent over 120ms, no scale/shadow pop |
| Button press | 96% scale down, 80ms, spring back |
| Toggle switches | Knob slides with a slight overshoot spring, 200ms |
| Toast / confirmation | Slides in from top-right, auto-dismiss with a shrinking progress bar |
| Modal / sheet open | Backdrop fades in, sheet slides up (mobile) or scales from 96%→100% (desktop), 220ms |
| Sidebar collapse (desktop) | Width animates 220ms, labels fade out before width finishes collapsing |
| Live "Updated Xm ago" pulse dot on AI panel | Continuous soft pulse — use the existing `animate-pulse-slow` utility rather than a new keyframe |
| Marketing/landing hero elements (if any) | Use the existing `animate-float` utility already defined in the config; don't duplicate it with a new one |

One deliberate flourish per screen, not one per element — e.g., the KPI count-up is the "hero moment" on Dashboard; don't also add entrance animation to every card on the same screen.

---

## 6. Mobile responsiveness

Breakpoints: `<640px` (mobile), `640–1024px` (tablet), `>1024px` (desktop).

- **Sidebar** → becomes a bottom tab bar on mobile (5 primary destinations + a "More" tab for Reporting/Settings), or a slide-in drawer triggered by a hamburger icon in the top bar. Bottom tab bar preferred for a finance app used in the field.
- **Topbar** → search collapses into an icon that expands to a full-width overlay input when tapped; notification bell and avatar remain visible.
- **KPI strip** → horizontal scroll-snap carousel of cards instead of a grid, one and a half cards visible to hint more content.
- **Tables** (WBS, Variance, OPEX by Region) → collapse into a stacked card list per row: label/value pairs, with the status badge and variance badge in the top-right of each card.
- **Kanban (Procurement)** → horizontal scroll with snap-per-column, or a segmented control to switch between the four stages one at a time.
- **AI Narrative panel** → stays full-width, insight cards stack vertically, action chips wrap and become horizontally scrollable if needed.
- **Floating AI chat widget** → collapses to a single circular FAB bottom-right; tapping it opens the chat as a **full-screen sheet** (not a small popover) with its own header and back action, since financial conversations need room.
- Touch targets minimum 44×44px; no hover-only affordances — anything revealed on hover (e.g., the "Ask AI" icon per WBS row) must also be reachable via a visible tap target on mobile (e.g., shown by default on the card).

---

## 7. The AI Assistant — a real, interactive chat, not a static mock

This is the most important interaction in the product and should be built as an actual conversational UI, not a preview bubble.

**Structure**
- Persistent floating action button, bottom-right, showing a subtle pulsing ring when the AI has a new proactive insight to surface.
- Opens into a chat panel (desktop: 380px docked panel; mobile: full-screen sheet) with:
  - Header: SentinelFi AI branding, a live "scope" badge showing what page/entity context it currently has (e.g., "Analyzing: Lekki Mast Rehab"), and a close/minimize control.
  - Scrollable message thread, oldest to newest, auto-scrolls to bottom on new messages.
  - Composer at the bottom: text input, attach/upload button (for document-to-form), send button that becomes active only when there's text.

**Conversational behavior**
- User messages: right-aligned bubbles, blueprint-tinted background.
- AI messages: left-aligned bubbles with the AI glyph avatar, dark surface background.
- Typing indicator (animated three dots) appears immediately after send, before the response streams in.
- AI responses stream in progressively (token/chunk reveal), not pasted instantly — this is what makes it read as "real."
- AI messages can contain **rich inline content**, not just text: a small embedded chart, a mini table, or action buttons like "Apply to form," "Download report," "Schedule this." These render inside the message bubble, sized to the panel width.
- Quick-reply suggestion chips appear below the latest AI message when relevant (e.g., after an insight, offer "Explain further," "Show the WBS breakdown," "Draft an email about this").
- Document upload flow: dragging a file onto the composer (or tapping the attach button) shows a file chip with a progress bar, then the AI's next message reflects on the parsed content.
- Session history persists per tenant user; reopening the widget on a different page keeps the conversation but updates the scope badge, and the AI acknowledges the context change in its next message rather than silently switching topics.
- Empty state (first open): a short greeting from the AI plus 3–4 suggested starter prompts as tappable chips, not a blank input.

**Contextual entry points**
- "Ask AI" icons inline on WBS rows, chart cards, and OPEX regions open the same chat panel pre-filled with a relevant question and scoped to that entity, rather than opening a separate UI.
- The AI Narrative panels on Dashboard/Financial Intelligence/OPEX are not just static text blocks — their action chips ("Forecast runway," "Draft reallocation memo") open the chat with that prompt already sent, so the panel and the chat feel like one system.

---

## 8. Real, interactive charts

Replace static SVG mockups with a real charting approach (e.g., a library such as Recharts, Chart.js, or D3 depending on stack):

- All charts animate their entrance once per session (draw-in / grow), not on every re-render.
- Hover/tap on any data point shows a tooltip with the exact figure in Naira, formatted with thousands separators.
- Bar and line charts support toggling a series on/off by tapping its legend item (e.g., hide CAPEX to isolate OPEX).
- The Budget vs Actual trend chart supports a time-range control (This Quarter / FY2026 / Custom) that re-animates the lines on change rather than hard-cutting.
- Category/funnel bars animate their width on first render and on data refresh (not on every parent re-render), using an eased transition so a value change is visibly "read" by the user rather than snapping.

---

## 9. Per-page interactive notes

- **Dashboard**: KPI count-up on load; AI panel insight cards stagger in; funnel bars animate; clicking a KPI scrolls/deep-links to the relevant detail page.
- **Financial Intelligence**: filter chips animate their active-state pill with a sliding background rather than an abrupt color swap; changing a filter re-animates the trend chart and category bars.
- **WBS & Budgets**: "Ask AI" icon expands an inline answer with a smooth height transition (not an abrupt reflow); "Auto-fill from Document" opens a real upload modal with drag-and-drop, a progress state, and a review step before fields are applied.
- **Procurement**: kanban cards support drag-to-reorder/advance between stages (with a snap-back if dropped outside a valid column), and overdue cards get a subtle persistent amber/red edge glow, not just a text label.
- **OPEX Planning**: the schedule frequency chips and the narrative toggle give immediate visual confirmation (toast: "Report schedule updated") rather than silent state changes.
- **Reporting**: clicking a report-type card shows a brief generating state (skeleton/progress) before revealing a preview, rather than an instant static result — this sells that a real AI-authored narrative is being produced.

---

## 10. Row actions, buttons, and overlays

This covers the interaction layer that was missing above: table row actions, buttons, modals, dropdowns, and toasts.

### Table row actions (view / edit / duplicate / delete / download)

- Every actionable table (WBS & Budgets, Scheduled Reports, future user/vendor lists) reserves a fixed-width trailing column for row actions so the table never reflows when icons appear.
- **Desktop:** icons are invisible at rest (`opacity: 0`) and fade in (`opacity: 1`, 120ms) on row hover, together with a subtle background tint on the whole row (one step lighter than `gray-800`) so the row reads as interactive before the cursor even reaches the icons.
- **Touch/mobile:** hover doesn't exist, so row actions must never be hover-only. Use a single, always-visible **kebab (⋮) icon** at the end of each card/row that opens an action sheet from the bottom with full-width, icon+label rows. Optionally support swipe-left-to-reveal edit/delete on card rows as a secondary affordance, but the kebab is the reliable primary one.
- **Icon coloring stays semantic, not decorative:**
  - View / expand → `m-text-muted` neutral
  - Edit → `brand-primary` teal
  - Duplicate → `m-text-muted` neutral
  - Download / export → `brand-primary` teal
  - Delete → `alert-critical` orange, and delete is the only row icon allowed to sit visually apart (extra 8px gap) from the others so it's never mis-tapped.
- If a row has more than 3 actions, collapse into a kebab menu even on desktop rather than cramming icons — the menu lists icon+label pairs, with destructive items separated by a divider.
- Icon-only buttons always get a tooltip on hover (desktop) after a ~400ms delay, showing the plain-language action name ("Edit budget draft," not "Edit").

### Buttons

- **Primary** — filled `brand-primary`, white text, used for the one main action per screen (e.g., "New Budget Draft," "Send").
- **Secondary/Ghost** — `gray-800` surface with a border, used for lower-emphasis actions ("Cancel," "Auto-fill from Document").
- **Destructive** — filled `alert-critical`, white text. Reserved exclusively for the confirm step of a delete/remove action inside a dialog — never used as a toolbar button, so orange consistently means "this is about to remove something."
- **Icon-only** — minimum 44×44px touch target regardless of visual icon size, with the tooltip behavior above.
- **Loading state** — label is replaced by a small spinner in the button's existing color (not a layout-shifting skeleton); button becomes non-interactive and slightly dimmed until the action resolves.
- **Disabled** — 40% opacity, no hover/press animation, cursor `not-allowed`.

### Pop-ups: modals, dropdowns, tooltips, toasts

- **Confirmation dialogs (delete/remove):** centered modal on desktop, full-screen sheet sliding up on mobile. Title names exactly what will be deleted ("Delete WBS-2.3.1 — Mast structural reinforcement?"), body states the consequence in one sentence, footer has Ghost "Cancel" + Destructive "Delete" in that order (cancel on the left/first, so the safe action is closest to the thumb on mobile).
- **Dropdown / context menus** (kebab menus, filter selects): anchor to the trigger element, close on outside click or Escape, items are icon+label rows using the same coloring rules as row actions above.
- **Tooltips:** dark surface, small, appear after a short delay on hover only — never the only way to understand an icon-only control; pair with an accessible label regardless.
- **Toasts:** slide in top-right (already covered in §4's motion table) for confirmations like "Budget draft saved" or "WBS-2.3.1 deleted." Destructive actions get an **"Undo"** affordance in the toast itself where the action is reversible (e.g., a 5-second undo window before a delete is final), rather than a separate confirmation-only flow — use one or the other per action, not both, to avoid double friction.

## 11. Accessibility & performance floor

- Visible keyboard focus states on every interactive element, styled in the domain accent color.
- Color is never the only signal — variance badges, status badges, and kanban delay flags always pair color with text/label.
- Respect `prefers-reduced-motion`: disable count-ups, staggers, and streaming text in favor of instant states.
- Contrast-check all text/background pairs at the dark theme's actual opacity values, not just the base tokens.
- Chat streaming and chart animation must not block input — the composer and nav stay interactive while a response streams.
