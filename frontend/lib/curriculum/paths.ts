// ─── Persona learning paths — mapped from the documented DOA taxonomy ────────
// The product docs define six organisational roles. Each path sequences real
// lessons (video + guided) into a coherent first-week curriculum. 100% of a
// path => an Academy certificate (SF-<PATH>-<seq>-<hash8>).

import type { PersonaPath } from './types';
import { CURRICULUM_LESSONS } from './lessons';

export const PERSONA_PATHS: PersonaPath[] = [
  {
    id: 'tenant-admin',
    title: 'Tenant Admin',
    icon: '🛡',
    tag: 'Authority',
    description:
      'Own the workspace: provisioning, identity, fiscal setup, governance rules and platform control. Start here if you configured the tenant or will supervise others.',
    lessonSlugs: [
      'demo-sandbox-walkthrough',
      'sovereign-onboarding',
      'regulatory-compliance',
      'api-integration',
      'demo-sandbox-audit',
    ],
  },
  {
    id: 'executive',
    title: 'Executive',
    icon: '📊',
    tag: 'Decision',
    description:
      'See the portfolio the way the board does: risk at a glance, variance to tolerance, and board-ready narratives backed by the ledger.',
    lessonSlugs: [
      'demo-sandbox-walkthrough',
      'demo-sandbox-ceo',
      'strategic-reporting',
    ],
  },
  {
    id: 'finance-ops',
    title: 'Finance Ops',
    icon: '🧮',
    tag: 'Control',
    description:
      'Run the books: budgets, roll-ups, approvals, expenses, payroll and the reporting hub that turns them into decisions.',
    lessonSlugs: [
      'wbs-architecture',
      'strategic-reporting',
      'ai-audit-forensics',
      'demo-sandbox-audit',
    ],
  },
  {
    id: 'project-manager',
    title: 'Project Manager',
    icon: '📐',
    tag: 'Delivery',
    description:
      'Build the WBS and keep it honest: auto roll-ups, live expense logging, invoice blocks and variance that is always visible.',
    lessonSlugs: [
      'demo-sandbox-pm',
      'wbs-architecture',
      'demo-sandbox-walkthrough',
    ],
  },
  {
    id: 'auditor',
    title: 'Auditor & Governance',
    icon: '🔎',
    tag: 'Evidence',
    description:
      'Verify with evidence: the forensics queue, confidence-scored AI findings, the tamper-evident audit trail and regulator-ready bundles.',
    lessonSlugs: [
      'demo-sandbox-audit',
      'ai-audit-forensics',
      'regulatory-compliance',
    ],
  },
  {
    id: 'it-ops',
    title: 'IT Ops',
    icon: '⚙',
    tag: 'Integration',
    description:
      'Connect the platform: scoped credentials, ERP cost-centre mapping, webhook events and tenant-wide administration.',
    lessonSlugs: [
      'api-integration',
      'sovereign-onboarding',
    ],
  },
];

export function getPersonaPath(id: string): PersonaPath | undefined {
  return PERSONA_PATHS.find((p) => p.id === id);
}

/** Every path must reference existing lessons; used by the integrity test. */
export function validatePathReferences(): string[] {
  const lessons = new Set(CURRICULUM_LESSONS.map((l) => l.slug));
  const broken: string[] = [];
  for (const path of PERSONA_PATHS) {
    for (const slug of path.lessonSlugs) {
      if (!lessons.has(slug)) broken.push(`${path.id} -> ${slug}`);
    }
  }
  return broken;
}