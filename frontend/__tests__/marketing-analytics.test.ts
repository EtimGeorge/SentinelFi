import { HEADLINE_VARIANTS, MARKETING_NAV_LINKS, POSITIONING } from '../components/Landing/marketingContent';
import {
  getMarketingEvents,
  getStoredHeadlineVariant,
  onMarketingEvent,
  resolveHeadlineVariant,
  trackMarketingEvent,
} from '../components/Landing/marketingAnalytics';
import {
  DEMO_FORENSICS, DEMO_PORTFOLIO, DEMO_SCENARIOS, DEMO_WBS_TREE,
} from '../components/Landing/demoSandboxData';
import { ACADEMY_LESSONS, getLesson } from '../lib/academy-content';

describe('marketing analytics bus', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('resolves headline variant from query param and persists it', () => {
    expect(resolveHeadlineVariant('?headline=b')).toBe('b');
    expect(getStoredHeadlineVariant()).toBe('b');
    // Persisted choice wins when no param is present.
    expect(resolveHeadlineVariant('')).toBe('b');
  });

  it('falls back to control variant for unknown input', () => {
    expect(resolveHeadlineVariant('?headline=z')).toBe('a');
    expect(resolveHeadlineVariant('')).toBe('a');
    expect(getStoredHeadlineVariant()).toBeNull();
  });

  it('buffers CTA clicks with variant context and notifies listeners', () => {
    const seen: string[] = [];
    const off = onMarketingEvent((e) => seen.push(`${e.name}:${e.cta}`));
    trackMarketingEvent('marketing.cta_click', {
      cta: 'hero-start-trial',
      destination: '/landing/pricing',
      variant: 'headline-b',
    });
    off();
    expect(seen).toEqual(['marketing.cta_click:hero-start-trial']);
    const stored = getMarketingEvents();
    expect(stored).toHaveLength(1);
    expect(stored[0]).toMatchObject({ variant: 'headline-b', destination: '/landing/pricing' });
  });

  it('keeps headline copy and nav links internally consistent', () => {
    expect(HEADLINE_VARIANTS.a.headlineA).not.toEqual(HEADLINE_VARIANTS.b.headlineA);
    expect(POSITIONING.subhead.length).toBeGreaterThan(80);
    const hrefs = MARKETING_NAV_LINKS.map((l) => l.href);
    expect(new Set(hrefs).size).toBe(hrefs.length);
  });
});

describe('demo sandbox fixtures', () => {
  it('gives every role a 3-step scenario with valid panels', () => {
    const panels = ['kpis', 'wbs', 'forensics', 'audit'];
    for (const role of ['CEO', 'PM', 'AUDIT'] as const) {
      const steps = DEMO_SCENARIOS[role];
      expect(steps).toHaveLength(3);
      for (const s of steps) {
        expect(panels).toContain(s.panel);
        expect(s.outcome.length).toBeGreaterThan(20);
      }
    }
  });

  it('keeps portfolio figures internally consistent (spend within budget totals)', () => {
    const totalSpend = DEMO_PORTFOLIO.projects.reduce((sum, p) => sum + p.spendM, 0);
    expect(totalSpend).toBeLessThanOrEqual(DEMO_PORTFOLIO.totalBudgetM);
    const overProjects = DEMO_PORTFOLIO.projects.filter((p) => p.spendM > p.budgetM);
    expect(overProjects.length).toBeGreaterThan(0); // demo needs a visible overrun
  });

  it('keeps WBS roll-ups consistent (children sum <= parent budget)', () => {
    for (const node of DEMO_WBS_TREE) {
      if (!node.children) continue;
      const childBudget = node.children.reduce((sum, c) => sum + c.budget, 0);
      expect(childBudget).toBeLessThanOrEqual(node.budget * 1.05); // small tolerance for rounding
    }
  });

  it('quarantines the duplicate invoice before payment', () => {
    const dup = DEMO_FORENSICS.find((f) => f.id === 'inv-8841');
    expect(dup).toBeDefined();
    expect(dup?.status).toBe('quarantined');
    expect(dup?.confidence).toBeGreaterThan(90);
  });
});

describe('academy lessons', () => {
  it('has a unique slug and checklist for every lesson', () => {
    const slugs = ACADEMY_LESSONS.map((l) => l.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const lesson of ACADEMY_LESSONS) {
      expect(lesson.checklist.length).toBeGreaterThan(0);
      expect(lesson.videoUrl).toMatch(/^\/demos\/.+.mp4$|^https:\/\//);
      expect(getLesson(lesson.slug)).toBe(lesson);
    }
  });

  it('returns undefined for unknown slugs', () => {
    expect(getLesson('nope')).toBeUndefined();
  });
});
