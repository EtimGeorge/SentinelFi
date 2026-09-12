# Table Architecture Blueprint
### Standard architecture for every table in the financial app — desktop + mobile

This is a standing engineering standard, not a one-time design. Every table built in this app, now or in the future, must conform to it. It exists to guarantee two things that are easy to promise and easy to accidentally violate one PR at a time:

> **Guarantee 1 — No horizontal scroll, ever, on a row or a table, at any container width.**
> **Guarantee 2 — Nothing is ever hidden without a persistent, one-tap/one-click, keyboard-reachable path to it. Nothing disappears silently.**

These two guarantees are in tension with finite screen width, which is why they need an actual algorithm behind them, not just intent. The rest of this document is that algorithm.

---

## 1. The Core Architectural Move: Reserve, Then Allocate

Most tables that end up scrolling horizontally or losing action buttons made the same mistake: they laid out data columns and action buttons as if they're competing for the same space, then let whichever one runs out of room lose. The fix is to **stop them from competing at all.**

Every table row is architecturally split into two zones that never negotiate with each other for width:

```
┌─────────────────────────────────────────────┬──────────────┐
│           FLEXIBLE DATA ZONE                 │ RESERVED     │
│  (columns collapse/stack/truncate here)      │ ACTION ZONE  │
│                                               │ (fixed width,│
│                                               │ never shrinks│
│                                               │ never hides) │
└─────────────────────────────────────────────┴──────────────┘
```

- **Reserved Action Zone**: a fixed-width slot (e.g. 40px for a single icon button, 44–56px for an icon + overflow trigger) pinned to the trailing edge of every row. It is computed **first**, subtracted from the container width **before** any data-column layout happens, and it is exempt from the responsive collapse logic in §2 entirely. It does not shrink. It does not hide. It is not a column competing for priority — it is off-budget.
- **Flexible Data Zone**: gets whatever width is left after the reserved zone is subtracted. All column-hiding, stacking, and truncation logic in §2 operates only inside this zone.

**Rule: an action button is never placed inside the flexible data zone.** The moment a "delete" or "mark paid" button lives in the same flex row as data columns, it will eventually get squeezed off-screen or into a horizontal scroll. This is the single most common cause of the exact bug you're trying to prevent.

---

## 2. The Column Collapse Algorithm (deterministic, not ad hoc)

Every data column is assigned a priority tier at design time — not adjusted per-screen-size later, decided once, in this order:

> **Clarification: the tier cap below applies only to P0, not to how many columns a table may have in total.** A table can have five, eight, or more columns. What's capped is how many of them are allowed to make the "never collapses, visible even at 320px" promise. Everything else is still fully present in the table — it just collapses to a second line (P1) or behind a one-tap expansion (P2/P3) before it's ever forced into a horizontal scroll or silently dropped. See the worked example at the end of this section.

| Tier | Contents | Behavior under space pressure |
|---|---|---|
| **P0 — Always visible** | Identity (who/what) + primary value (amount/status). Max 2 columns. | Never collapses. If this doesn't fit at 320px, truncate the text with ellipsis + full value on tap — never scroll. |
| **P1 — Collapses to second line** | Secondary state/date. | Moves under P0 in a stacked two-line row (Stack, from the design brief) before it's ever fully hidden. |
| **P2 — Collapses to expansion** | Supporting metadata. | Hidden from the row, but a persistent indicator (§3) shows it's one tap away. |
| **P3 — Expansion only** | Rarely-needed detail. | Never shown in the row at any width. Always available in the expansion. |

**Design-time constraint: P0 may never contain more than 2 columns.** This is what makes the 320px case tractable. If a table "needs" 3 identity-level columns always visible, that's a sign the table needs a redesign (probably one of the 3 is actually P1), not a sign the algorithm should bend.

**Worked example — a 5-column Expenses table, showing that 5 columns and a 2-column P0 cap are not in conflict:**

| Column | Tier | What happens as width shrinks |
|---|---|---|
| Merchant | P0 | Visible at every width, 1440px down to 320px |
| Amount | P0 | Visible at every width, 1440px down to 320px |
| Category | P1 | Own column down to ~600px, then drops to line 2 under Merchant/Amount |
| Date | P1 | Same — moves to line 2 with Category rather than disappearing |
| Status | P2 | Own column at desktop widths; collapses into the row expansion (with a "+1" indicator) only at narrow/mobile widths |

At 1440px, all 5 render as individual columns. At 700px, Category and Date stack onto a second line. At 375px, Status collapses behind the expansion indicator. **All 5 columns exist in the table at every width — none are removed from the schema or the export — only 2 of them (Merchant, Amount) are contractually guaranteed to render as their own on-screen column at 320px.** If a specific table genuinely needs more than 2 columns simultaneously scannable with zero taps even on a phone, that's a real design tension worth flagging explicitly (usually resolved by widening that table's minimum supported container, not by breaking the cap).

**The collapse sequence as width shrinks**, computed against the flexible data zone width only:

1. **Full width**: P0 + P1 + P2 all render as individual columns.
2. **Width drops below P0+P1+P2 combined min-width**: P3 was never shown — no change; P2 columns move from "rendered as columns" to "collapsed into indicator" (§3), one at a time in ascending priority order, until the remaining columns fit.
3. **Width drops below a defined container-query threshold** (e.g. 700px, per the design brief's Breakpoint principle): switch from grid-row mode to stacked-card mode. P0 stays on line 1, P1 moves to line 2, P2/P3 move fully into the expansion.
4. **This sequence never has a "give up and scroll" step.** If you hit a container width where P0 content plus the reserved action zone don't fit even after every optional column is collapsed, the failure mode is text truncation with an ellipsis and a tap-to-see-full-value affordance — not `overflow-x: scroll`.

This is deterministic specifically so that "which columns show at width X" is computable and testable (§5), not a matter of how a flexbox happens to wrap that day.

---

## 3. Discoverability Requirement (this is what makes hiding not the same as losing)

Anything collapsed by §2 step 2/3, and any action beyond the single primary one in the Reserved Action Zone, must be reachable through exactly one of these two persistent affordances — never anything else:

- **A collapsed-columns indicator**: a small, fixed-position chip or chevron at a consistent location in the row (recommend: leading edge of the Reserved Action Zone) reading e.g. "+2" or showing a chevron, that expands the row on tap/click/Enter.
- **An overflow action menu**: a kebab (⋮) icon living inside the Reserved Action Zone itself, opening a menu with every action beyond the one primary action.

**Explicitly forbidden discovery mechanisms** (each of these has shipped in a real product as an accidental "hidden and lost" bug):
- Hover-only reveal (fails on touch devices and for keyboard users entirely).
- Swipe-to-reveal with no visual hint that swiping does anything.
- Long-press with no visual hint.
- Truncating an action label to nothing at narrow widths with no icon/tooltip fallback.
- A "..." that isn't actually a button (unstyled text that looks interactive but has no handler — this happens more than it should when a designer's mockup gets implemented literally).

**Rule: the indicator/trigger itself must never be one of the things that can be hidden by §2.** It lives in the Reserved Action Zone or at a fixed position exempted from the collapse algorithm, same as action buttons.

---

## 4. Explicit Anti-Patterns (forbidden in code review)

| Anti-pattern | Why it's forbidden |
|---|---|
| `overflow-x: auto` or `scroll` on a table, row, or row-container | This is the exact failure mode this blueprint exists to prevent. If you find yourself reaching for this, the collapse algorithm (§2) wasn't applied — fix that instead. |
| Action buttons rendered inside the same flex/grid track as data columns | They will eventually be squeezed out. Actions live only in the Reserved Action Zone (§1). |
| `min-width` set on the table wider than the smallest supported container | This is a scroll bug wearing a "responsive" costume — a table that "responsively" scrolls is not responsive. |
| Column visibility computed from `window.innerWidth` | Breaks inside any container narrower than the viewport (a modal, a split view, a sidebar). Must be a container query (see design brief §3.6). |
| Any action reachable only via hover | Fails touch and keyboard. Every action needs a click/tap/Enter path. |
| Silent column drop with no indicator | A column that's gone with zero trace is data loss from the user's perspective even though the data still exists server-side. Every collapse must leave a visible trace (§3). |

---

## 5. Enforcement — this has to be tested, not just designed

A blueprint nobody checks decays within a few sprints. Build these as automated gates, not documentation:

1. **Width-sweep test** (run per table, in CI): render the table at a fixed set of container widths — 320, 375, 428, 600, 700, 768, 1024, 1440px — and assert `row.scrollWidth <= row.clientWidth` at every width. Any failure is a build-blocking regression, not a visual nitpick.
2. **Action-reachability test**: at every width in the sweep, assert the DOM contains at least one focusable, enabled control per row that either performs the primary action or opens the overflow menu. This catches the case where an action technically exists in the DOM but is `display: none`d with no trigger to bring it back.
3. **Keyboard-only pass** (manual, part of PR checklist): tab through a row at the narrowest supported width; confirm every action and every collapsed column is reachable without a mouse and without hovering.
4. **Visual regression snapshots** at each width in the sweep, so a passing width-sweep test doesn't mask an ugly-but-technically-compliant layout (e.g., truncated-to-nothing text that "fits" but is unreadable).
5. **Lint rule**: flag `overflow-x` on any component under the table/row directory tree at PR time, forcing a human decision rather than letting it merge silently.

---

## 6. Print & Export Architecture — PDF and Excel Get a Professional Ledger Treatment

A table's on-screen responsive behavior (collapsing, stacking, expansion) is a screen-space optimization. Paper and spreadsheets don't have that constraint, and printing/exporting "what the screen currently shows" — collapsed columns, hover states, kebab menus and all — is how you end up with an export that looks like a browser printed a webpage instead of a document an accountant would trust. Exports are a different rendering target with their own rules.

### 6.1 Exports render from the schema, not from the screen
PDF and Excel exports pull from the same canonical column schema (§2 of the design brief) but **ignore the on-screen collapse state entirely** — every column configured for that table appears in the export, regardless of what's currently collapsed, stacked, or hidden behind an expansion on the screen the user exported from. Paper has no "tap to reveal." This is the export equivalent of the Reveal principle: nothing collapsed on screen is actually gone, and the export is the proof.

Permission-based redaction (§3.7 in the design brief) still applies to exports — a restricted-role user's export must mask the same `sensitive` columns their screen view masks. An export is not a backdoor around on-screen permissions.

### 6.2 PDF — professional ledger conventions
- **Typography**: tabular (lining) numerals, right-aligned amounts, consistent decimal alignment down the column — the same numerals discipline as the on-screen Slot principle (§3.3 of the design brief), carried onto paper.
- **Negative values**: parentheses, e.g. `(1,204.00)`, as the primary signal — not color alone, since printed output is frequently monochrome and color can't be relied on (this is the print-specific application of the existing "never color alone" accessibility rule).
- **Rules, not shading**: a horizontal rule under the column header row; a single rule above any subtotal row; a **double rule above the grand total** — the traditional accounting convention for "this number is final." Avoid heavy background shading, which photocopies/scans poorly and reads as a screen-UI habit rather than a document convention.
- **Repeating header row** on every printed page for multi-page exports; footer shows page X of Y.
- **No interactive chrome**: sort arrows, checkboxes, hover states, kebab menus, and buttons are stripped entirely from the print render — none of them mean anything on paper.
- **No split rows across a page break** — a row's full content (including its stacked P1 line, if applicable) must stay on one page.
- **Draft/void watermark**: records in a non-final state (draft invoice, voided transaction) get a diagonal watermark on the printed page — paper has no status chip, so the state has to be encoded visually another way, and this keeps the append-only/void-not-delete principle (design brief §0.3) visible even off-screen.
- **Audit footer on every export**: "Generated by {user} · {timestamp} · Export ID {id}" printed at the bottom of the document. Since a printed/exported ledger can leave the system and circulate independently, the export itself needs to be traceable back to who pulled it and when — treat this as an extension of the audit-trail requirement (design brief §6.7), not a separate feature.

### 6.3 Excel — a real spreadsheet, not a screenshot in a grid
- **Real cell types**: currency columns are numeric cells with a currency number format applied — never text strings with a "$" concatenated in. This is what lets an accountant re-sum, re-filter, or build a pivot table from the export without cleaning the data first.
- **Live formulas for totals**, e.g. `=SUM(D2:D48)`, not hardcoded totals — so the export is auditable and recalculates if a user edits a value inside Excel.
- **Frozen header row** (and frozen leading identity column for wide tables) so the sheet stays readable while scrolling.
- **No merged cells inside the data region** — merged cells break Excel's own sort/filter/pivot-table features, which defeats the point of exporting to Excel in the first place. If a title block is needed, merge cells only in a header block above the table, never within it.
- **Two-sheet pattern**: ship a `Data` sheet (one row per record, every column, unformatted, pivot-table-ready) alongside a `Ledger View` sheet (formatted, subtotaled, print-styled per §6.2 conventions) — this covers both the "I need to analyze this" use case and the "I need to hand this to someone as a document" use case from a single export action, rather than forcing the user to pick one and manually rebuild the other.
- **Export metadata** (generated-by, timestamp, export ID, filter/view applied) lives on its own `Export Info` sheet rather than inline in the data sheet, so it doesn't interfere with sorting or pivoting the actual data.

### 6.4 Shared requirement: the export action itself is audited
Exporting data is a security-relevant event, not a passive read. Log who exported what table, with which filter/view applied, in what format, at what time — as its own audit-trail entry (design brief §6.7). Filenames should encode enough context to stay traceable on their own once they leave the app: `{table}_{viewOrFilter}_{ISO-date}_{exportId}.pdf` — not `Invoices (3) (1).xlsx`.

---

## 7. How this fits the wider table system

This blueprint is the enforcement layer for two specific guarantees inside the larger table system already scoped (schema-driven columns, capability modules, audit trail, etc. — see the companion design brief). Concretely:

- The `Column.priority` field in the shared schema **is** the P0/P1/P2/P3 tier from §2 — don't invent a second priority system.
- The `mobileVisibility: "always" | "reveal" | "never"` field maps directly to this blueprint's zones: `"always"` = P0/reserved zone, `"reveal"` = P1/P2, `"never"` = P3.
- The Reserved Action Zone is a new, explicit addition this blueprint requires that the original schema didn't call out by name — add an `actionZone` config (primary action + overflow menu contents) alongside the column array for every table, exempt from the `Column` priority system entirely since it's off-budget by design (§1).

Any table that can't satisfy §1–§5 with the existing schema is a signal the schema needs a fix — not a signal to make an exception for that one table.
