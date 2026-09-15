// ─── Interactive demo sandbox — fixture data & scenario definitions ──────────
// Static, deterministic fixtures (no backend, no PII) that mirror the real
// workspace: portfolio KPIs, a WBS tree, and an AI-forensics queue. Scripted
// scenarios drive the step-by-step "Try it" interactions on /landing/workflows.
// Numbers are internally consistent so the demo survives scrutiny from
// finance-savvy visitors.

export type DemoRole = 'CEO' | 'PM' | 'AUDIT';

export interface WbsNode {
  code: string;
  name: string;
  budget: number; // NGN millions
  spend: number;  // NGN millions
  children?: WbsNode[];
}

export const DEMO_PORTFOLIO = {
  tenant: 'Demo · Meridian Energy Program',
  currency: '₦',
  totalBudgetM: 4820,
  totalSpendM: 4695,
  variancePct: -2.4,
  efficiencyIndex: 94.2,
  projects: [
    { name: 'Transit Pipeline Phase II', budgetM: 2100, spendM: 2085, risk: 'on-track' },
    { name: 'Substation Expansion Grid', budgetM: 1420, spendM: 1480, risk: 'over' },
    { name: 'Terrain Access Roads', budgetM: 1300, spendM: 1130, risk: 'under' },
  ] as Array<{ name: string; budgetM: number; spendM: number; risk: 'under' | 'on-track' | 'over' }>,
};

export const DEMO_WBS_TREE: WbsNode[] = [
  {
    code: '2.0', name: 'Pipeline Civil Works', budget: 1450, spend: 1352,
    children: [
      { code: '2.1', name: 'Right-of-Way Clearing', budget: 380, spend: 371 },
      { code: '2.2', name: 'Trenching & Bedding', budget: 640, spend: 611 },
      { code: '2.3', name: 'Backfill & Reinstatement', budget: 430, spend: 370 },
    ],
  },
  {
    code: '3.0', name: 'Mechanical & Piping', budget: 980, spend: 1016,
    children: [
      { code: '3.1', name: 'Pipe stringing & welding', budget: 520, spend: 553 },
      { code: '3.2', name: 'Valve stations', budget: 460, spend: 463 },
    ],
  },
  {
    code: '4.0', name: 'Instrumentation & Control', budget: 620, spend: 512,
    children: [
      { code: '4.1', name: 'SCADA integration', budget: 340, spend: 268 },
      { code: '4.2', name: 'Flow metering skids', budget: 280, spend: 244 },
    ],
  },
];

export interface ForensicFinding {
  id: string;
  vendor: string;
  invoice: string;
  amountM: number;
  reason: string;
  confidence: number;
  status: 'quarantined' | 'released';
  detail: string;
}

export const DEMO_FORENSICS: ForensicFinding[] = [
  {
    id: 'inv-8841', vendor: 'Nordic Flow Services Ltd', invoice: 'INV-8841', amountM: 84,
    reason: 'Duplicate invoice', confidence: 98.2, status: 'quarantined',
    detail: 'Same vendor, same amount and PO reference as INV-8811 submitted 6 days earlier. Payment held before money moved.',
  },
  {
    id: 'inv-8897', vendor: 'Kaduna Steel Supply Co', invoice: 'INV-8897', amountM: 212,
    reason: 'Price variance vs contract', confidence: 91.4, status: 'quarantined',
    detail: 'Unit price for DN400 pipe is 18% above the framework contract ceiling. Escalated to procurement.',
  },
  {
    id: 'inv-8903', vendor: 'Lagos Industrial Electric', invoice: 'INV-8903', amountM: 37,
    reason: 'WBS mismatch', confidence: 88.7, status: 'quarantined',
    detail: 'Booked against 3.2 Valve stations but the goods receipt references 2.2 Trenching. Three-way match failed.',
  },
];

export interface DemoStep {
  id: string;
  instruction: string;
  outcome: string;
  panel: 'kpis' | 'wbs' | 'forensics' | 'audit';
}

export const DEMO_SCENARIOS: Record<DemoRole, DemoStep[]> = {
  CEO: [
    { id: 'ceo-1', panel: 'kpis', instruction: 'Look at the portfolio pulse. One project is bleeding.', outcome: 'Substation Expansion Grid is 4.2% over budget — flagged red in real time, traced to WBS 3.1.' },
    { id: 'ceo-2', panel: 'wbs', instruction: 'Drill into the WBS node behind the overrun.', outcome: 'Pipe stringing & welding (3.1) overran on a mid-project day-rate rise. Baseline untouched — variance visible, not hidden.' },
    { id: 'ceo-3', panel: 'audit', instruction: 'Check that governance caught the bad invoice.', outcome: 'The duplicate invoice (₦84M) was quarantined by AI before payment. Capital protected without an audit cycle.' },
  ],
  PM: [
    { id: 'pm-1', panel: 'wbs', instruction: 'Expand the Mechanical & Piping package.', outcome: 'Child budgets roll up automatically: 3.1 and 3.2 roll into 3.0, and any child change re-baselines the parent instantly.' },
    { id: 'pm-2', panel: 'forensics', instruction: 'Try to pay the invoice flagged as a duplicate.', outcome: 'Blocked. Sentinel-AI quarantined INV-8841 (98.2% confidence) — a ₦84M double-pay avoided.' },
    { id: 'pm-3', panel: 'kpis', instruction: 'Confirm your project is back inside tolerance.', outcome: 'With the duplicate held, Pipeline Phase II stays on-track at 99.3% utilisation — one corrective action, zero scope creep.' },
  ],
  AUDIT: [
    { id: 'audit-1', panel: 'forensics', instruction: 'Review the AI forensics queue.', outcome: 'Three findings quarantined today: a duplicate, a contract-price breach, and a WBS mismatch — each with an evidence trail.' },
    { id: 'audit-2', panel: 'audit', instruction: 'Open the audit trail for the quarantine decision.', outcome: 'Every action is tamper-evident: who, what, when, and the AI confidence attached. Exportable for regulators in one click.' },
    { id: 'audit-3', panel: 'kpis', instruction: 'Verify nothing moved without a record.', outcome: 'Portfolio variance reconciles to the ledgers — the ₦84M block shows in committed spend, not quietly absorbed.' },
  ],
};

export const DEMO_ROLE_META: Record<DemoRole, { label: string; blurb: string }> = {
  CEO: { label: 'Executive (CEO)', blurb: 'See portfolio risk, drill to the cause in two clicks.' },
  PM: { label: 'Project Manager', blurb: 'Run the WBS, get blocked from paying bad invoices.' },
  AUDIT: { label: 'Auditor', blurb: 'Evidence-first forensics and an exportable trail.' },
};

export interface AuditEntry {
  id: string;
  actor: string;
  action: string;
  at: string;
  confidence?: number;
}

export const DEMO_AUDIT_TRAIL: AuditEntry[] = [
  { id: 'a-1', actor: 'Sentinel-AI', action: 'Quarantined INV-8841 · duplicate of INV-8811', at: '09:41:07', confidence: 98.2 },
  { id: 'a-2', actor: 'A. Okafor (Auditor)', action: 'Reviewed quarantine evidence · upheld', at: '09:52:31' },
  { id: 'a-3', actor: 'Sentinel-AI', action: 'Flagged price variance on INV-8897 vs framework contract', at: '10:03:12', confidence: 91.4 },
  { id: 'a-4', actor: 'T. Bello (PM)', action: 'Requested release of INV-8903 with corrected WBS reference', at: '10:22:48' },
  { id: 'a-5', actor: 'System', action: 'Immutable audit entry sealed · hash chain verified', at: '10:23:00' },
];