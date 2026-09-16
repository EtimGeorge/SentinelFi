// ─── Academy lessons — the public learning catalog ───────────────────────────
// Every lesson must resolve to real content. `mode` decides delivery:
//   video  → a recorded MP4/WebM exists on disk (public/demos)
//   guided → interactive checklist + quiz + deep links + /docs guide
//   hybrid → video first, guided content as the fallback layer
//
// Six legacy lessons previously hard-coded video URLs for recordings that did
// not exist (sovereign-onboarding, wbs-architecture, ai-audit-forensics,
// strategic-reporting, regulatory-compliance, api-integration). They are now
// `guided`/`hybrid`: fully playable from their checklist + quiz + reference
// guide + in-app deep link, with zero dependency on a rendering. When a real
// recording is added, flip `mode` and set `videoUrl` — no UI change required.
// The walkthrough video (orphaned before) is now a real lesson.
//
// Integrity is enforced by __tests__/curriculum.test.ts (file existence,
// unique slugs, no dangling guide/pageKey refs).

import type { AcademyLesson } from './types';

export const CURRICULUM_LESSONS: AcademyLesson[] = [
  // ── Marketing sandbox walkthroughs (real WebM recordings on disk) ─────────
  {
    slug: 'demo-sandbox-walkthrough',
    title: 'Getting Started: The SentinelFi Tour',
    difficulty: 'Beginner',
    duration: '1m',
    desc: 'One take across all three demo scenarios — portfolio risk, WBS control, and evidence-first forensics. The fastest way to see the whole platform in action.',
    mode: 'hybrid',
    videoUrl: '/demos/demo-sandbox-walkthrough.webm',
    videoType: 'self-hosted',
    pageKey: 'workflows',
    checklist: [
      'Watch the CEO scenario: spot the over-budget project from the portfolio pulse',
      'Watch the PM scenario: WBS roll-ups and the duplicate-invoice block',
      'Watch the AUDIT scenario: forensics queue and the tamper-evident trail',
    ],
    quiz: [
      {
        question: 'Which AI outcome is demonstrated in the CEO scenario?',
        options: [
          'An invoice was auto-paid',
          'A duplicate invoice was quarantined before payment',
          'The ledger was manually reconciled',
        ],
        answer: 1,
      },
    ],
    pathIds: ['tenant-admin', 'executive'],
  },
  {
    slug: 'demo-sandbox-ceo',
    title: 'Executive Demo: Portfolio Risk at a Glance',
    difficulty: 'Executive',
    duration: '1m',
    desc: 'Walk through the CEO scenario in the SentinelFi sandbox: spot an over-budget project from the portfolio pulse, drill into the WBS node behind the variance, and confirm the AI caught the bad invoice before payment.',
    mode: 'video',
    videoUrl: '/demos/demo-sandbox-ceo.webm',
    videoType: 'self-hosted',
    pageKey: 'workflows',
    checklist: [
      'Scan the portfolio variance panel for red flags',
      'Drill into WBS 3.1 to see the root cause of the overrun',
      'Open the audit trail to confirm the duplicate invoice was quarantined',
      'Note that the scenario completes in under 12 seconds',
    ],
    pathIds: ['executive'],
  },
  {
    slug: 'demo-sandbox-pm',
    title: 'Project Manager Demo: WBS Control & Invoice Blocking',
    difficulty: 'Intermediate',
    duration: '1m',
    desc: 'Walk through the PM scenario: expand the Mechanical & Piping WBS package, see child budgets roll up automatically, try to pay a duplicate invoice and get blocked by Sentinel-AI, then confirm the project is back inside tolerance.',
    mode: 'video',
    videoUrl: '/demos/demo-sandbox-pm.webm',
    videoType: 'self-hosted',
    pageKey: 'workflows',
    checklist: [
      'Expand the Mechanical & Piping WBS node and watch roll-ups',
      'Attempt to release a duplicate invoice — see the quarantine block',
      'Confirm Pipeline Phase II stays on-track after the hold',
      'Understand why auto-roll-up means no scope creep is hidden',
    ],
    pathIds: ['project-manager'],
  },
  {
    slug: 'demo-sandbox-audit',
    title: 'Auditor Demo: Evidence-First Forensics',
    difficulty: 'Governance',
    duration: '1m',
    desc: 'Walk through the AUDIT scenario: review the AI forensics queue with three quarantined findings, open the tamper-evident audit trail for a quarantine decision, and verify portfolio variance reconciles to the ledgers.',
    mode: 'video',
    videoUrl: '/demos/demo-sandbox-audit.webm',
    videoType: 'self-hosted',
    pageKey: 'workflows',
    checklist: [
      'Review the three quarantined findings in the forensics queue',
      'Open the audit trail and read the who-what-when-confidence entry',
      'Confirm the ₦84M duplicate shows in committed spend, not absorbed',
      'See that every action is hash-chain sealed',
    ],
    pathIds: ['auditor'],
  },

  // ── Guided product lessons (no recording — fully playable today) ──────────
  {
    slug: 'sovereign-onboarding',
    difficulty: 'Beginner',
    title: 'Sovereign Onboarding',
    duration: '45m',
    desc: 'Configuring your tenant instance, identity management, and initial schema settings.',
    mode: 'guided',
    guideSlug: '00-quick-start',
    pageKey: '/settings',
    checklist: [
      'Provision the tenant and pick your base currency',
      'Invite your team with magic links (no passwords)',
      'Set the fiscal calendar and approval roles',
      'Verify email delivery with the test-connectivity check',
    ],
    quiz: [
      {
        question: 'How do team members sign in to SentinelFi?',
        options: ['Username and passphrase', 'Magic link only — no passwords', 'OAuth social login'],
        answer: 1,
      },
      {
        question: 'Where do you set the fiscal calendar and approval roles?',
        options: ['Tenant Settings', 'The Public Pricing page', 'The marketing sandbox'],
        answer: 0,
      },
    ],
    pathIds: ['tenant-admin'],
  },
  {
    slug: 'wbs-architecture',
    difficulty: 'Intermediate',
    title: 'WBS Architecture',
    duration: '1.5h',
    desc: 'Constructing bulletproof work breakdown structures that enforce multi-billion dollar transparency.',
    mode: 'guided',
    guideSlug: '07-wbs-designer',
    pageKey: '/financials/projects/wbs',
    checklist: [
      'Define the root packages for the project',
      'Break work into measurable cost centres with UOM',
      'Watch child budgets roll up to parents automatically',
      'Log a live expense against a WBS node',
    ],
    quiz: [
      {
        question: 'What happens to child budgets automatically?',
        options: [
          'They must be manually consolidated weekly',
          'They roll up into their parent category',
          'They are frozen after approval',
        ],
        answer: 1,
      },
    ],
    pathIds: ['project-manager', 'finance-ops'],
  },
  {
    slug: 'ai-audit-forensics',
    difficulty: 'Advanced',
    title: 'AI-Audit Forensics',
    duration: '2h',
    desc: 'Deep dive into the Sentinel-AI layer. Training nodes on anomaly detection and risk thresholds.',
    mode: 'guided',
    guideSlug: '03-financial-intelligence',
    pageKey: '/financials/projects/wbs',
    checklist: [
      'Understand the duplicate-invoice detector',
      'Read confidence scores and evidence trails',
      'Quarantine, review, and release a finding',
      'Export the tamper-evident audit trail',
    ],
    quiz: [
      {
        question: 'What does a higher confidence score indicate?',
        options: [
          'The finding is more likely to be a true anomaly',
          'The invoice is more likely to be approved',
          'The budget variance is smaller',
        ],
        answer: 0,
      },
    ],
    pathIds: ['auditor', 'finance-ops'],
  },
  {
    slug: 'strategic-reporting',
    difficulty: 'Executive',
    title: 'Strategic Reporting',
    duration: '1h',
    desc: 'Optimizing high-level dashboards for board review and capital allocation decisions.',
    mode: 'guided',
    guideSlug: '14-reporting-hub',
    pageKey: '/reporting',
    checklist: [
      'Configure the executive dashboard KPIs',
      'Generate a variance report with AI narrative',
      'Schedule recurring board-pack exports',
    ],
    quiz: [
      {
        question: 'What powers the board-ready narratives?',
        options: [
          'Hand-written monthly summaries',
          'The AI agent analyzing live ledger data',
          'Static PDF templates',
        ],
        answer: 1,
      },
    ],
    pathIds: ['executive', 'finance-ops'],
  },
  {
    slug: 'regulatory-compliance',
    difficulty: 'Governance',
    title: 'Regulatory Compliance',
    duration: '1.2h',
    desc: 'Exporting immutable audit trails and meeting international project finance standards.',
    mode: 'guided',
    guideSlug: '05-audit-trail',
    pageKey: '/admin/audit-log',
    checklist: [
      'Understand the hash-chained audit log',
      'Run an expense audit for a funding period',
      'Export regulator-ready evidence bundles',
    ],
    quiz: [
      {
        question: 'Why is the audit log hash-chained?',
        options: [
          'To compress storage size',
          'To make tampering detectable after the fact',
          'To improve query speed',
        ],
        answer: 1,
      },
    ],
    pathIds: ['auditor', 'tenant-admin'],
  },
  {
    slug: 'api-integration',
    difficulty: 'IT Ops',
    title: 'API & Integration',
    duration: '3h',
    desc: 'Connecting SentinelFi to your existing ERP and project management data streams.',
    mode: 'guided',
    guideSlug: '17-ai-communication',
    pageKey: '/settings',
    checklist: [
      'Generate scoped API credentials',
      'Map ERP cost centres to WBS nodes',
      'Set up webhooks for approval events',
    ],
    quiz: [
      {
        question: 'What is the recommended way to connect SentinelFi to an ERP?',
        options: [
          'Shared database credentials',
          'Scoped API credentials with read/write access to the needed stream',
          'Periodic manual file uploads',
        ],
        answer: 1,
      },
    ],
    pathIds: ['it-ops', 'tenant-admin'],
  },
];

export function getCurriculumLesson(slug: string): AcademyLesson | undefined {
  return CURRICULUM_LESSONS.find((l) => l.slug === slug);
}