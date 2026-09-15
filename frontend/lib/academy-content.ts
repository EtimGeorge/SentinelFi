// ─── Academy lessons — public-facing layer on top of the in-app tutorial
// registry. Each lesson maps to a pageKey in tutorial-content.ts where one
// exists, and carries its own video URL + checklist. Self-hosted MP4s in
// /public/demos are refreshed by the Playwright capture script
// (scripts/capture-demo-videos.mjs); see docs there.
export interface AcademyLesson {
  slug: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced' | 'Executive' | 'Governance' | 'IT Ops';
  title: string;
  duration: string;
  desc: string;
  videoUrl: string; // self-hosted first, embed fallback
  videoType: 'self-hosted' | 'embed';
  pageKey?: string; // links the lesson to the in-app guided tour content
  checklist: string[];
}

export const ACADEMY_LESSONS: AcademyLesson[] = [
  {
    slug: 'sovereign-onboarding',
    difficulty: 'Beginner',
    title: 'Sovereign Onboarding',
    duration: '45m',
    desc: 'Configuring your tenant instance, identity management, and initial schema settings.',
    videoUrl: '/demos/onboarding.mp4',
    videoType: 'self-hosted',
    checklist: [
      'Provision the tenant and pick your base currency',
      'Invite your team with magic links (no passwords)',
      'Set the fiscal calendar and approval roles',
      'Verify email delivery with the test-connectivity check',
    ],
  },
  {
    slug: 'wbs-architecture',
    difficulty: 'Intermediate',
    title: 'WBS Architecture',
    duration: '1.5h',
    desc: 'Constructing bulletproof work breakdown structures that enforce multi-billion dollar transparency.',
    videoUrl: '/demos/wbs-architecture.mp4',
    videoType: 'self-hosted',
    pageKey: 'wbs',
    checklist: [
      'Define the root packages for the project',
      'Break work into measurable cost centres with UOM',
      'Watch child budgets roll up to parents automatically',
      'Log a live expense against a WBS node',
    ],
  },
  {
    slug: 'ai-audit-forensics',
    difficulty: 'Advanced',
    title: 'AI-Audit Forensics',
    duration: '2h',
    desc: 'Deep dive into the Sentinel-AI layer. Training nodes on anomaly detection and risk thresholds.',
    videoUrl: '/demos/ai-forensics.mp4',
    videoType: 'self-hosted',
    checklist: [
      'Understand the duplicate-invoice detector',
      'Read confidence scores and evidence trails',
      'Quarantine, review, and release a finding',
      'Export the tamper-evident audit trail',
    ],
  },
  {
    slug: 'strategic-reporting',
    difficulty: 'Executive',
    title: 'Strategic Reporting',
    duration: '1h',
    desc: 'Optimizing high-level dashboards for board review and capital allocation decisions.',
    videoUrl: '/demos/strategic-reporting.mp4',
    videoType: 'self-hosted',
    pageKey: 'reporting',
    checklist: [
      'Configure the executive dashboard KPIs',
      'Generate a variance report with AI narrative',
      'Schedule recurring board-pack exports',
    ],
  },
  {
    slug: 'regulatory-compliance',
    difficulty: 'Governance',
    title: 'Regulatory Compliance',
    duration: '1.2h',
    desc: 'Exporting immutable audit trails and meeting international project finance standards.',
    videoUrl: '/demos/compliance.mp4',
    videoType: 'self-hosted',
    checklist: [
      'Understand the hash-chained audit log',
      'Run an expense audit for a funding period',
      'Export regulator-ready evidence bundles',
    ],
  },
  {
    slug: 'api-integration',
    difficulty: 'IT Ops',
    title: 'API & Integration',
    duration: '3h',
    desc: 'Connecting SentinelFi to your existing ERP and project management data streams.',
    videoUrl: '/demos/api-integration.mp4',
    videoType: 'self-hosted',
    checklist: [
      'Generate scoped API credentials',
      'Map ERP cost centres to WBS nodes',
      'Set up webhooks for approval events',
    ],
  },
];

export function getLesson(slug: string): AcademyLesson | undefined {
  return ACADEMY_LESSONS.find((l) => l.slug === slug);
}