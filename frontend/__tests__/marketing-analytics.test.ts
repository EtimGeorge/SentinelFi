import { HEADLINE_VARIANTS, MARKETING_NAV_LINKS, POSITIONING } from '../components/Landing/marketingContent';
import {
  getMarketingEvents,
  getStoredHeadlineVariant,
  onMarketingEvent,
  resolveHeadlineVariant,
  trackMarketingEvent,
} from '../components/Landing/marketingAnalytics';

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
