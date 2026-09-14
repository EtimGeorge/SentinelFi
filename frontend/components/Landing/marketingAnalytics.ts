// ─── Marketing analytics (zero-dependency, privacy-first) ─────────────
// No PostHog/Mixpanel/Segment in this codebase, so this is a tiny local-first
// event bus: same-tab listeners + localStorage ring buffer (auditable, capped
// at 200 events). If a backend /marketing/events endpoint or a vendor SDK is
// added later, flushMarketingEvents() is the single seam to wire it to.
import type { HeadlineVariantKey } from './marketingContent';

export type { HeadlineVariantKey };

export type MarketingEventName =
  | 'marketing.hero_view'
  | 'marketing.headline_variant'
  | 'marketing.cta_click';

export interface MarketingEvent {
  name: MarketingEventName;
  at: string;
  path: string;
  variant?: string;
  cta?: string;
  destination?: string;
}

type MarketingEventListener = (e: MarketingEvent) => void;

const MARKETING_EVENTS_KEY = 'sfi.marketing.events.v1';
const MARKETING_EVENTS_MAX = 200;
const listeners = new Set<MarketingEventListener>();

function readStoredEvents(): MarketingEvent[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(MARKETING_EVENTS_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as MarketingEvent[]) : [];
  } catch {
    return [];
  }
}

export function trackMarketingEvent(
  name: MarketingEventName,
  fields: Partial<Pick<MarketingEvent, 'variant' | 'cta' | 'destination'>> = {},
): void {
  if (typeof window === 'undefined') return;
  const event: MarketingEvent = {
    name,
    at: new Date().toISOString(),
    path: window.location.pathname,
    ...fields,
  };
  try {
    const next = [...readStoredEvents(), event].slice(-MARKETING_EVENTS_MAX);
    window.localStorage.setItem(MARKETING_EVENTS_KEY, JSON.stringify(next));
  } catch {
    // Storage full or blocked (private mode) — event bus still notifies.
  }
  listeners.forEach((fn) => {
    try {
      fn(event);
    } catch {
      // Listener errors must never break navigation.
    }
  });
}

export function onMarketingEvent(fn: MarketingEventListener): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export function getMarketingEvents(): MarketingEvent[] {
  return readStoredEvents();
}

/** Single future seam: POST the buffered events to the backend/vendor, then clear. */
export async function flushMarketingEvents(
  send: (events: MarketingEvent[]) => Promise<void>,
): Promise<void> {
  const events = readStoredEvents();
  if (events.length === 0) return;
  await send(events);
  try {
    window.localStorage.removeItem(MARKETING_EVENTS_KEY);
  } catch {
    // Non-fatal — buffer is capped and will rotate.
  }
}

// ─── Headline variant resolution ────────────────────────────────────
// Priority: explicit `?headline=a|b` (shareable test links) → persisted
// choice → control. Never throws during SSR.
const HEADLINE_VARIANT_KEY = 'sfi.marketing.headline.v1';

export function resolveHeadlineVariant(search = ''): HeadlineVariantKey {
  const params = new URLSearchParams(search);
  const param = params.get('headline');
  if (param === 'a' || param === 'b') {
    try {
      window.localStorage.setItem(HEADLINE_VARIANT_KEY, param);
    } catch {
      // Ignore persistence failures; the param still wins for this view.
    }
    return param;
  }
  try {
    const stored = window.localStorage.getItem(HEADLINE_VARIANT_KEY);
    if (stored === 'a' || stored === 'b') return stored;
  } catch {
    // Storage unavailable — fall through to control.
  }
  return 'a';
}

export function getStoredHeadlineVariant(): HeadlineVariantKey | null {
  try {
    const stored = window.localStorage.getItem(HEADLINE_VARIANT_KEY);
    if (stored === 'a' || stored === 'b') return stored;
  } catch {
    // Storage unavailable.
  }
  return null;
}

