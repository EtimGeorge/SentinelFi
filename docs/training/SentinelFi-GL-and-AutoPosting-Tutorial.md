# SentinelFi — The Money Diary (General Ledger & Auto-Posting)

**A trainer's tutorial for tenant staff.**
Written so you can teach it to a 12-year-old, and run a full training session with your team.

---

## Table of contents

1. [The big idea](#1-the-big-idea)
2. [The Chart of Accounts — our library of money boxes](#2-the-chart-of-accounts--our-library-of-money-boxes)
3. [Double-entry — the rule that keeps us honest](#3-double-entry--the-rule-that-keeps-us-honest)
4. [What happens automatically (the auto-posting)](#4-what-happens-automatically-the-auto-posting)
5. [A day in the life of a user](#5-a-day-in-the-life-of-a-user)
6. [Where to click — the screens](#6-where-to-click--the-screens)
7. [How it is wired against errors](#7-how-it-is-wired-against-errors)
8. [The technical picture (for the curious)](#8-the-technical-picture-for-the-curious)
9. [Trainer's session plan](#9-trainers-session-plan)
10. [Exercises](#10-exercises)
11. [Troubleshooting](#11-troubleshooting)
12. [Glossary](#12-glossary)

---

## 1. The big idea

Imagine your company has a **diary**, and every time money moves, someone writes a line in
the diary:

> "Today we bought 100 chairs for the office for $5,000."

SentinelFi's **General Ledger (GL)** is that diary — but smarter. Instead of one line, it
writes **two lines for every single money event**:

> - "Our money in the bank went **down** by $5,000."
> - "Our furniture pile went **up** by $5,000."

Why two lines? Because of a very old rule (500 years old!) called **double-entry
bookkeeping**. It means the two lines **always cancel each other out to zero**. If your
diary says the two lines don't balance, you know something went wrong — like a scale that
tells you immediately if one side is heavier.

**What we built in this project:**

1. **The diary itself** — a double-entry ledger that stores every money event in two
   balanced lines (debits and credits).
2. **The library of money boxes** — a Chart of Accounts (COA), the organized list of every
   "box" money can live in (Cash, Accounts Payable, Salaries, Rent, etc.).
3. **The automatic writers** — whenever you create an invoice, pay an invoice, or approve
   an expense, SentinelFi **automatically** writes the correct diary lines for you. You
   never have to do accounting by hand.
4. **The safety net** — the system is wired so that a ledger problem can **never** break
   your normal work, and can never write the same entry twice.

---

## 2. The Chart of Accounts — our library of money boxes

### What it is

Every business needs to answer: *"Where did the money go?"* and *"Where did the money come
from?"* To answer that, you need **boxes** — labeled places to put money.

The **Chart of Accounts (COA)** is the master list of all these boxes. In SentinelFi, each
box is called a **GL Account**, and the boxes are organized in a tidy tree:

```
1000s — Assets (things we OWN)
   1100  Current Assets
        1110  Cash and Bank          ← money in the bank
   ...
2000s — Liabilities (things we OWE)
   2100  Current Liabilities
        2110  Accounts Payable       ← money we owe suppliers
        2120  Payroll Payable        ← money we owe our staff
        2130  Tax Payable            ← money we owe the tax office
        2140  Benefits Payable       ← money we owe for staff benefits
        2150  Retention Payable      ← money we hold back from contractors
...
5000s — Expenses (money we SPENT)
   5200  Operating Expenses
        5290  General and Sundry     ← the "miscellaneous" box
```

Each level is a container:

- **Account Class** — the biggest bucket (Assets, Liabilities, Equity, Revenue, Expense)
- **Account Group** — a shelf inside the bucket (Current Liabilities, Operating Expenses)
- **GL Account** — the actual box with a number (Accounts Payable = 2110)

### The "magic" account codes

Some boxes are so important that the system knows them by heart. These are called
**system account codes**:

| Code  | Name                 | Used when…                              |
|-------|----------------------|-----------------------------------------|
| 1110  | Cash and Bank        | Money leaves or enters the bank         |
| 2110  | Accounts Payable     | We record a supplier's invoice          |
| 2120  | Payroll Payable      | We run payroll                          |
| 2130  | Tax Payable          | We set aside tax                        |
| 2140  | Benefits Payable     | We owe staff benefits                   |
| 2150  | Retention Payable    | We hold back payment from a contractor  |
| 5290  | General and Sundry   | An expense has no better home           |

If you never touch these, everything still works — the system uses them as sensible
defaults.

### Where to find it in the app

**Financials → Operations → Chart of Accounts**

Here you can:

- **Browse** the tree: click a class → see its groups → see the accounts inside.
- **Search** by name or code.
- **Create / edit / delete** classes, groups, and accounts.
- **Seed the Default Chart** — a button that fills in a standard set of accounts (with the
  magic codes above) so you are never starting from an empty page.

---

## 3. Double-entry — the rule that keeps us honest

### The rule

**Every money event must be recorded as at least two lines, and the total of the "debit"
lines must exactly equal the total of the "credit" lines.**

Think of a seesaw:

```
        DEBITS              CREDITS
   ┌────────────────┐  ┌────────────────┐
   │  Office Chairs │  │  Cash in Bank  │
   │    $5,000      │  │    $5,000      │
   └────────────────┘  └────────────────┘
            $5,000   =   $5,000   ✓ balanced
```

If someone later tries to write a diary entry where the two sides are **not** equal
(we spent $5,000 but only recorded $4,000 leaving the bank), the system **refuses to
save it**. It throws an error:

> "Unbalanced journal entry: debits ≠ credits."

This is the single most important safety rule in accounting, and SentinelFi enforces it
automatically.

### A real example

You approve an expense: *"Buy 10 chairs for $5,000 for the Operations category."*

SentinelFi writes **one journal entry with two lines**:

| Line | Account          | Debit  | Credit |
|------|------------------|--------|--------|
| 1    | Office Chairs (expense) | $5,000 | —      |
| 2    | Cash and Bank (1110)    | —      | $5,000 |

The entry is tagged as:

- **Source type:** `OPEX_EXPENSE`
- **Source ID:** the unique ID of that expense in the database

That tag is how the system knows this diary line came from *that specific* expense — and
is how it prevents writing the same line twice (more on that in the error-wiring section).

---

## 4. What happens automatically (the auto-posting)

Before this feature, users had to imagine doing all this by hand. Now the system does it
for you the moment a money event "counts." Here is the full map of what triggers what.

### The four automatic events

| What the user does              | What the system writes to the ledger           | Source type      |
|---------------------------------|------------------------------------------------|------------------|
| **Creates a vendor invoice**    | Debit the expense/asset, Credit **Accounts Payable (2110)** | `VENDOR_INVOICE` |
| **Pays a vendor invoice**       | Debit **Accounts Payable (2110)**, Credit **Cash and Bank (1110)** | `VENDOR_PAYMENT` |
| **Approves an OPEX expense**    | Debit the category's expense account, Credit **Cash and Bank** (or the mapped account) | `OPEX_EXPENSE` |
| **Reverses an OPEX expense**    | The exact mirror of the approval entry (undo)  | `REVERSAL`       |

Plus the one from the earlier payroll project:

| What the user does              | What the system writes to the ledger           | Source type      |
|---------------------------------|------------------------------------------------|------------------|
| **Runs payroll**                | Debit payroll expense, Credit **Payroll Payable (2120)**, **Tax Payable (2130)**, **Benefits Payable (2140)** | `PAYROLL`        |

### The mapping rule (which box does an expense go into?)

When you approve an expense, the system has to pick the right "expense box." It looks in
this order:

1. **Does the expense have a category?** Look up that category in the Budget Category
   Catalog.
2. **Does that catalog entry have a GL account assigned?** (This is the
   `gl_account_id` field — you set it in the Budget Categories screen.) If yes → use it.
3. **Otherwise**, fall back to **General and Sundry (5290)**.

So even if nobody ever configures anything, expenses still post somewhere sensible — they
never silently fail.

### The important exceptions (what we deliberately do NOT post)

- **Purchase Orders** — a PO is a *promise* to buy, not money moving yet. We already track
  it in the budget ("reserved"), so writing a ledger entry too would count it **twice**.
- **Goods Receipt** — receiving items is about *quantity and matching*, not money. We
  recognize the money when the **invoice** arrives.

This is called **accrual accounting**: we record the money event when it truly happens
(invoice / payment), not when a box arrives at the door.

---

## 5. A day in the life of a user

Meet **Amara**, an Accounts Payable clerk at a tenant company using SentinelFi.

### Morning — a supplier invoice arrives

1. Amara opens **Procure-to-Pay → Invoices** and clicks **New Invoice**.
2. She picks the vendor, enters $12,000 for "Annual software licenses," and saves.
3. **Behind the scenes (automatic):**
   - SentinelFi posts a journal entry:
     - Debit **Software Expense** $12,000
     - Credit **Accounts Payable (2110)** $12,000
   - Source type: `VENDOR_INVOICE`, tagged to this invoice's ID.
   - Amara sees nothing unusual — no extra button to press.

### Midday — Amara pays the invoice

4. Amara clicks **Pay** on that invoice and enters the payment.
5. **Behind the scenes (automatic):**
   - Debit **Accounts Payable (2110)** $12,000
   - Credit **Cash and Bank (1110)** $12,000
   - Source type: `VENDOR_PAYMENT`, tagged to this *payment's* ID (kept separate from the
     invoice's entry, so they never collide).

### Afternoon — a staff expense claim

6. A manager submits a claim: *"Team lunch, $300."* It is **pending**.
7. Amara (or a manager) clicks **Approve**.
8. **Behind the scenes (automatic):**
   - If the "Meals" category is mapped to a GL account → that account is debited.
   - If not → **General and Sundry (5290)** is debited.
   - Credit **Cash and Bank (1110)** $300.
   - Source type: `OPEX_EXPENSE`.
9. Later, if this expense was approved **by mistake**, a supervisor clicks **Reverse**.
   - SentinelFi writes a **mirror entry** (source type `REVERSAL`) that exactly undoes the
     approval. The original entry is not deleted — accounting history stays intact.

### End of day — Amara checks the books

10. Amara opens **Financials → Operations → Chart of Accounts** to browse, and (in the
    reporting area) can pull a **Trial Balance** — a one-page summary proving that total
    debits still equal total credits across the whole ledger.

Nothing Amara did required her to know what a "debit" is. The system handled the double-
entry rules for her.

---

## 6. Where to click — the screens

### 6.1 Chart of Accounts

**Path:** `Financials → Operations → Chart of Accounts`

- Left/top: the class → group → account tree (accordion).
- Search box: filter by name or code.
- Per level: **New**, **Edit**, **Delete** (with a confirmation step).
- **Seed Default Chart** button: populates a standard chart (including the magic codes
  1110, 2110, 2120, 2130, 2140, 2150, 5290) for a fresh tenant.

### 6.2 Budget Categories (where you map a category to a GL account)

**Path:** Budget Categories screen (managed via the API endpoints
`/operational-budgets/categories`).

- **Create category:** name, type (OPEX/CAPEX), description, and (optionally) a
  **GL account** to map it to.
- **Edit category:** change the mapping; pass `null` to unmap and return to the default
  account.
- The system refuses to map to a GL account that is **not active** or **not in this
  tenant's chart**.

### 6.3 Invoices & Payments

**Path:** Procure-to-Pay → Invoices

- Creating an invoice posts `VENDOR_INVOICE` automatically.
- Paying it posts `VENDOR_PAYMENT` automatically.
- No extra buttons; the ledger updates in the background.

### 6.4 OPEX Expenses

**Path:** Operational Expenses

- Submitting an expense → status **Pending** (no ledger entry yet — it is not approved).
- **Approve** → posts `OPEX_EXPENSE`.
- **Reverse** → posts `REVERSAL` (mirror).
- **Reject** → no ledger entry (nothing moved).

---

## 7. How it is wired against errors

This is the part that protects the company's books. Think of it as **five safety nets**.

### Safety Net 1 — Best-effort posting (the ledger never blocks your work)

The ledger posting runs **inside a guard**. If the ledger is unavailable, or the chart of
accounts has a problem, the system:

- **Logs** a clear error (`[GL] POSTING FAILED (continuing) | …`).
- **Continues** with the business action.

Why? Because **approving an expense or paying an invoice must not fail just because the
accounting subsystem is having a bad day.** The business keeps running; the ledger problem
is visible in the logs for an admin to fix.

### Safety Net 2 — Idempotency (never the same entry twice)

Every journal entry is tagged with:

- `source_type` (e.g. `OPEX_EXPENSE`)
- `source_id` (the unique ID of the invoice / payment / expense)

There is a **special unique index** in the database
(`UQ_gl_journal_entry_source_active`) that says:

> "For a given tenant, a given source document may appear **at most once** among entries
> that are not VOID."

So if someone double-clicks **Approve**, or the system retries a request, the second
attempt is caught. The user sees **one** clean entry, not two.

### Safety Net 3 — The balance check (debits must equal credits)

Before saving, the engine:

1. Rounds every line amount to **4 decimal places** (so tiny rounding differences cannot
   sneak in).
2. Adds up all the **credit** lines.
3. Sets the debit side to **exactly that total**.

If anything still does not balance to within one ten-thousandth, the entry is **rejected**
with a clear error. The ledger can never become "lopsided."

### Safety Net 4 — Validation and tenancy

- Every entry is scoped to a **tenant**. Your books are isolated from every other
  tenant's books.
- GL accounts used in postings must be **active** and belong to **this tenant's chart**.
  Deactivated or foreign accounts are refused.
- The actor (user who triggered the action) is recorded, taken from the secure session —
  not from anything the client could forge.

### Safety Net 5 — Migrations and rollbacks (the schema is safe to change)

The ledger tables, enums, and indexes are created by **versioned database migrations**:

- `20260204000000-CreateGeneralLedger` — creates the journal tables, status/source enums,
  and the idempotency index.
- `20260205000000-GlVendorPaymentAndCategoryAccount` — adds the `VENDOR_PAYMENT` type and
  the `gl_account_id` mapping column on budget categories.

Each migration is:

- **Idempotent** (safe to run again — uses `IF NOT EXISTS`).
- **Scoped to the tenant schema** (sets `search_path` first).
- **Reversible** where possible (`down()`), with one honest exception: dropping a value
  from a Postgres enum requires a very new database version, so the `VENDOR_PAYMENT` label
  is left in place on rollback (it is inert and harmless).

---

## 8. The technical picture (for the curious)

You can skip this section if you only need to use the feature — but trainers often get
asked these questions.

### The moving parts

- **Shared types** (`shared/types/general-ledger.ts`) — the single source of truth for the
  enums (`JournalSourceType`, including the new `VENDOR_PAYMENT`) used by both backend and
  frontend.
- **General Ledger module** (`backend/src/general-ledger/`) — owns the journal-entry
  engine (`postJournalEntry`), the journal entities, and — since this update — also owns
  the **Chart of Accounts service**, so the two can be used together without circular
  module imports.
- **Finance Core** (`backend/src/finance-core/`) — vendor invoices and payments; calls
  into the ledger to post `VENDOR_INVOICE` and `VENDOR_PAYMENT`.
- **Operational Budgets** (`backend/src/operational-budgets/`) — OPEX expenses; posts
  `OPEX_EXPENSE` on approval and `REVERSAL` on reversal, and resolves the category's GL
  account through the Budget Category Catalog.
- **Chart of Accounts service** — provides `requireAccountsByCode`, a shared helper that
  seeds the default chart if needed and resolves accounts by their magic code.

### The posting helper (one pattern, reused everywhere)

Both Finance Core and Operational Budgets use the same "best-effort" helper shape:

```
postToGeneralLedger(tenantId, context, buildTheEntry)
   try:
       entry = buildTheEntry()
       ledger.postJournalEntry(entry)
       log "[GL] POSTED | context"
   catch error:
       log "[GL] POSTING FAILED (continuing) | context | reason"
       // do NOT rethrow — business action continues
```

Account resolution happens **inside** the `try`, so even a broken chart of accounts is
caught by the guard.

### Money handling

- Base currency is **USD**; amounts are stored to 4 decimal places.
- The debit side is computed as the **sum of the rounded credit legs**, guaranteeing the
  entry balances exactly at the stored precision.

### Where the migrations live

There are two migration folders:

- `backend/src/migrations/tenant/` — the source of truth.
- `backend/src/database/migrations/tenant/` — the runtime path that
  `TenantMigrationService` actually loads and applies per tenant schema.

Both were synchronized for this feature so a fresh environment applies the same set.

---

## 9. Trainer's session plan

A ready-to-run 90-minute session for tenant staff.

**Audience:** finance staff, AP clerks, expense approvers, budget owners.
**Prior knowledge needed:** none (this is why we explain it like they are 12).

### Minute 0–10 — Hook

- Ask: *"If you bought 10 chairs for $5,000, how many things changed about your company's
  money?"* (Two: the chairs pile grew, the bank shrank.) Introduce the seesaw.

### Minute 10–25 — The Chart of Accounts

- Show the live tree. Have them find **Cash and Bank (1110)** and **Accounts Payable
  (2110)**.
- Demo **Seed Default Chart** on a test tenant.

### Minute 25–45 — Double-entry, hands-on

- Walk through the 10-chairs example. Show the two journal lines in the reports area.
- Have a trainee find the `OPEX_EXPENSE` source tag on the entry.

### Minute 45–65 — Auto-posting tour

- Live: create a vendor invoice → show the `VENDOR_INVOICE` entry appear.
- Live: pay it → show `VENDOR_PAYMENT`.
- Live: approve an expense → show `OPEX_EXPENSE`; reverse it → show `REVERSAL`.
- Emphasize: *"You pressed no accounting buttons. The system did the bookkeeping."*

### Minute 65–80 — Mapping and configuration

- Show the Budget Categories screen; map a category to a real GL account.
- Show what happens when a category is **unmapped** (falls back to 5290).

### Minute 80–90 — Q&A and troubleshooting

- Use the Troubleshooting section below.
- Hand out the Glossary.

---

## 10. Exercises

### Exercise 1 — Find the money box

Ask the trainee to locate these accounts in the Chart of Accounts and say what they mean
in plain words:

- 1110 Cash and Bank
- 2110 Accounts Payable
- 2150 Retention Payable
- 5290 General and Sundry

### Exercise 2 — Predict the entry

Before showing them, ask: *"We pay a supplier $2,000 in cash. What two lines will the
system write?"*

Expected answer:
- Debit **Accounts Payable (2110)** $2,000 (we owe less now)
- Credit **Cash and Bank (1110)** $2,000 (our bank went down)

### Exercise 3 — Catch the mistake

Show them an intentionally unbalanced entry (debits $500, credits $400) and ask what the
system will do. (It rejects it — "Unbalanced journal entry.")

### Exercise 4 — Map a category

Have them create a category called "Software Subscriptions," map it to an expense GL
account, then approve an expense in that category and confirm the correct account was
debited (not the fallback 5290).

### Exercise 5 — Reverse an expense

Have them approve an expense by mistake, then reverse it, and confirm a matching
`REVERSAL` entry exists that cancels the first one.

---

## 11. Troubleshooting

| Symptom | Likely cause | What to do |
|---------|--------------|------------|
| Approved an expense but no ledger entry appears | Best-effort guard caught a ledger error (chart problem, inactive account) | Check application logs for `[GL] POSTING FAILED`. Fix the chart issue; re-approve or re-run the posting. |
| Ledger entry posted to "General and Sundry (5290)" unexpectedly | The expense's category has no GL account mapped | Open Budget Categories, set the `gl_account_id` for that category, approve again (or map and re-run). |
| "Unbalanced journal entry" error | A bug or manual entry with unequal debits/credits | Report to admin — the system is protecting the books. Do not force-save. |
| Cannot delete a GL account | The account is referenced by existing journal lines or a category mapping | Clear the mapping and archive instead of delete; the system blocks destructive deletion. |
| Payroll posted but amounts look wrong | Mapping or rounding | Check the payroll run's line items and the default accounts (2120/2130/2140). Amounts are rounded to 4 decimals. |
| Migration seems not applied | Tenant schema not migrated | Confirm `TenantMigrationService` ran for that schema; migrations are idempotent and safe to re-run. |

---

## 12. Glossary

- **General Ledger (GL)** — the master diary of all money events, in double-entry form.
- **Double-entry** — the rule that every event is recorded as equal debits and credits.
- **Debit** — a value entry on the left side (in our seesaw, one side of the balance).
- **Credit** — a value entry on the right side (the other side of the balance).
- **Chart of Accounts (COA)** — the organized list of all "money boxes" (accounts).
- **Account Class** — top-level category (Assets, Liabilities, Equity, Revenue, Expense).
- **Account Group** — a shelf of related accounts inside a class.
- **GL Account** — a single numbered box (e.g. 2110 Accounts Payable).
- **Journal Entry** — one recorded money event, made of two or more journal lines.
- **Journal Line** — one row of a journal entry: account, debit amount, credit amount.
- **Source Type** — a tag saying where the entry came from (`VENDOR_INVOICE`, `OPEX_EXPENSE`,
  etc.).
- **Source ID** — the unique ID of the document that caused the entry; used to prevent
  duplicates.
- **Idempotency** — the guarantee that retrying something does not create a second copy.
- **Accrual accounting** — recording money events when they truly occur (invoice/payment),
  not when goods physically move.
- **Reversal** — a new entry that exactly undoes a previous one, without deleting history.
- **Best-effort posting** — posting that logs failures instead of blocking the business
  action.
- **Chart seeding** — filling in a standard set of default accounts for a new tenant.
- **Category mapping** — linking an expense category to a specific GL account.
- **Fallback account** — the default box (5290 General and Sundry) used when no mapping
  exists.

---

*SentinelFi — General Ledger & Auto-Posting. Trainer/tutorial edition.*
