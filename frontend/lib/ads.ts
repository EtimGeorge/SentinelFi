import api from './api';

export interface AdsConfig {
  provider: 'test' | 'adsense' | 'admanager';
  adsenseClientId: string | null;
  adsenseBannerSlot: string | null;
  rewardRequiredSeconds: number;
  maxRewardsPerDay: number;
  adsEnabled: boolean;
}

let cachedConfig: AdsConfig | null = null;

export async function getAdsConfig(): Promise<AdsConfig> {
  if (cachedConfig) return cachedConfig;
  try {
    const { data } = await api.get('/ads/config');
    cachedConfig = data as AdsConfig;
  } catch {
    cachedConfig = {
      provider: 'test',
      adsenseClientId: null,
      adsenseBannerSlot: null,
      rewardRequiredSeconds: 15,
      maxRewardsPerDay: 5,
      adsEnabled: true,
    };
  }
  return cachedConfig;
}

export function clearAdsConfigCache() {
  cachedConfig = null;
}

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

/**
 * Loads the AdSense script once and pushes a banner slot.
 * No-op when no client ID is configured (dev/test) — callers render
 * a placeholder instead so layouts never break.
 */
export function loadAdsenseBanner(): boolean {
  if (typeof window === 'undefined') return false;
  const clientId = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID;
  if (!clientId) return false;
  if (!document.querySelector('script[data-adsense]')) {
    const s = document.createElement('script');
    s.async = true;
    s.setAttribute('data-adsense', 'true');
    s.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${clientId}`;
    s.crossOrigin = 'anonymous';
    document.head.appendChild(s);
  }
  try {
    (window.adsbygoogle = window.adsbygoogle || []).push({});
    return true;
  } catch {
    return false;
  }
}

// ─── Verified rewarded flow (server is source of truth) ──────────────────────

export interface RewardSession {
  sessionId: string;
  requiredSeconds: number;
  expiresInSeconds: number;
  rewardDate: string;
}

export async function startRewardedSession(): Promise<RewardSession> {
  const { data } = await api.post('/ads/rewarded/start');
  return data as RewardSession;
}

export interface RewardResult {
  message: string;
  ad_unlock_credits: number;
  tasks_available_today: number;
}

export async function completeRewardedSession(
  sessionId: string,
  providerReceipt?: string,
): Promise<RewardResult> {
  const { data } = await api.post('/ads/rewarded/complete', {
    sessionId,
    providerReceipt,
  });
  return data as RewardResult;
}
