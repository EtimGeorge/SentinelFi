// Central marketing source-of-truth — single place to audit nav, CTAs and positioning.
// Eliminates copy drift across landing pages and keeps header/footer in sync.
export interface NavLink {
  label: string;
  href: string;
  description: string;
}

export const MARKETING_NAV_LINKS: NavLink[] = [
  { label: 'Platform', href: '/landing/features', description: 'CAPEX, OPEX, procurement, approvals and AI forensics' },
  { label: 'Workflows', href: '/landing/workflows', description: 'How CEOs, PMs and auditors each work in SentinelFi' },
  { label: 'Customers', href: '/landing/testimonials', description: 'Measured outcomes from live tenancies' },
  { label: 'Pricing', href: '/landing/pricing', description: 'Trial, Professional and Enterprise plans' },
  { label: 'Academy', href: '/training', description: 'Guided lessons from onboarding to forensics' },
  { label: 'Company', href: '/about', description: 'Mission, ownership and trust model' },
];

export const MARKETING_ACTIONS = {
  primary: { label: 'Start free trial', href: '/landing/pricing' },
  secondary: { label: 'Explore live tour', href: '/landing/workflows' },
  tertiary: { label: 'Talk to us', href: '/contact' },
  signIn: { label: 'Sign in', href: '/login' },
  workspace: { label: 'Open workspace', href: '/dashboard' },
} as const;

// One-sentence positioning — reused by hero, SEO meta and footer so a new
// visitor hears the same definition everywhere.
export const POSITIONING = {
  eyebrow: 'What is SentinelFi?',
  subhead:
    'SentinelFi is the financial control tower for capital projects: it locks every dollar to a work-breakdown structure, verifies every invoice with AI, and gives CEOs, project managers and auditors one shared source of truth.',
  proofLine: '14-day trial · No credit card · Live demo workspace in under 5 minutes',
} as const;

// Headline A/B variants — switch via `?headline=b` (persisted in localStorage).
// Variant A (control): loss-aversion framing. Variant B (challenger):
// outcome/certainty framing. Instrumentation decides the winner.
export const HEADLINE_VARIANTS = {
  a: { headlineA: 'Stop capital leakage', headlineB: 'before it happens.' },
  b: { headlineA: 'Every capital dollar,', headlineB: 'accounted for.' },
} as const;

export type HeadlineVariantKey = keyof typeof HEADLINE_VARIANTS;

export const EXPLORE_STEPS = [
  {
    step: '01',
    title: 'See it',
    body: 'Tour a live demo workspace — real WBS budgets, variance heatmaps and a quarantined duplicate invoice.',
    href: '/landing/workflows',
    cta: 'Take the tour',
  },
  {
    step: '02',
    title: 'Try it',
    body: 'Launch your own isolated tenant with sample energy-infrastructure data. Invite your team with magic links.',
    href: '/landing/pricing',
    cta: 'Start free trial',
  },
  {
    step: '03',
    title: 'Trust it',
    body: 'Export the tamper-evident audit trail and show your auditors every approval, match and AI decision.',
    href: '/landing/features#approvals',
    cta: 'How assurance works',
  },
] as const;
