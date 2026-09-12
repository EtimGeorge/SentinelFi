import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Megaphone, Play, ArrowRight, X } from 'lucide-react';
import { toast } from 'react-hot-toast';
import api from '../../lib/api';
import {
  getAdsConfig,
  startRewardedSession,
  completeRewardedSession,
  type AdsConfig,
} from '../../lib/ads';
import DisplayAd from './DisplayAd';
import RewardedAdModal from './RewardedAdModal';

interface MySubscription {
  plan: string;
  status: string;
  has_ads: boolean;
  max_tasks_per_day: number | null;
  ad_unlock_credits: number;
}

/**
 * FreeTierAdBanner — mounted in the secured layout for free-plan tenants.
 * - Renders nothing for paid/trial tenants (has_ads === false).
 * - Shows a passive DisplayAd unit + a "Watch ad · +1 task" rewarded action.
 * - Reward flow: start session → modal countdown → server-verified complete.
 */
const FreeTierAdBanner: React.FC = () => {
  const [sub, setSub] = useState<MySubscription | null>(null);
  const [adsConfig, setAdsConfig] = useState<AdsConfig | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [watching, setWatching] = useState(false);
  const [session, setSession] = useState<{ sessionId: string; requiredSeconds: number } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [{ data }, cfg] = await Promise.all([
          api.get('/billing/my-subscription'),
          getAdsConfig(),
        ]);
        if (!cancelled) {
          setSub(data);
          setAdsConfig(cfg);
        }
      } catch {
        // Guard handles access; stay silent
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!sub || !sub.has_ads || dismissed) return null;

  const handleWatch = async () => {
    setBusy(true);
    try {
      const s = await startRewardedSession();
      setSession({ sessionId: s.sessionId, requiredSeconds: s.requiredSeconds });
      setWatching(true);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Could not start ad. Try again.');
    } finally {
      setBusy(false);
    }
  };

  const handleClaim = async () => {
    if (!session) return;
    try {
      const result = await completeRewardedSession(session.sessionId);
      setWatching(false);
      setSession(null);
      setSub((prev) =>
        prev ? { ...prev, ad_unlock_credits: result.ad_unlock_credits } : prev,
      );
      toast.success(`+1 task unlocked (${result.tasks_available_today} available today)`);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Reward failed — watch the full ad.');
    }
  };

  return (
    <>
      <div className="mb-4 rounded-2xl border border-white/10 bg-white/[0.02] p-4 print:hidden">
        <div className="mb-3 flex items-center gap-2">
          <Megaphone className="h-4 w-4 text-brand-primary" />
          <span className="text-xs font-black uppercase tracking-[0.3em] text-gray-500">
            Free plan · ad-supported
          </span>
          <button
            onClick={() => setDismissed(true)}
            aria-label="Dismiss ad banner"
            className="ml-auto rounded p-1 text-gray-600 transition-colors hover:text-gray-300"
          >
            <X className="h-3 w-3" />
          </button>
        </div>

        <DisplayAd className="mb-3" />

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <button
            onClick={handleWatch}
            disabled={busy}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-primary px-4 py-2.5 text-xs font-black  text-white transition-all hover:bg-brand-primary/90 disabled:opacity-50"
          >
            <Play className="h-3 w-3" />
            {busy ? 'Loading…' : 'Watch ad · +1 task'}
          </button>
          <Link
            href="/landing/pricing"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-xs font-black  text-gray-300 transition-all hover:border-white/20 hover:text-white"
          >
            Remove ads — $500/mo <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </div>

      {watching && session && adsConfig && (
        <RewardedAdModal
          requiredSeconds={session.requiredSeconds}
          provider={adsConfig.provider}
          onComplete={handleClaim}
          onClose={() => {
            setWatching(false);
            setSession(null);
          }}
        />
      )}
    </>
  );
};

export default FreeTierAdBanner;
