import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Clock, X, AlertTriangle, RefreshCw } from 'lucide-react';
import api from '../../lib/api';

interface SubscriptionInfo {
  plan: string;
  status: string;
  days_remaining: number | null;
  is_expiring_soon: boolean;
  trial_ends_at: string | null;
  current_period_end: string | null;
}

/**
 * SubscriptionBanner — appears in the protected app header when subscription
 * is expiring within 30 days, trialing, or has expired.
 * Designed to be mounted inside LayoutNav.
 */
const SubscriptionBanner: React.FC = () => {
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [timeLeft, setTimeLeft] = useState<string>('');

  useEffect(() => {
    const fetch = async () => {
      try {
        const { data } = await api.get('/billing/my-subscription');
        setSubscription(data);
      } catch {
        // Silently ignore — guard will handle expired tenants with 402
      }
    };
    fetch();
  }, []);

  // Live countdown timer
  useEffect(() => {
    if (!subscription) return;

    const endDate = subscription.trial_ends_at || subscription.current_period_end;
    if (!endDate) return;

    const update = () => {
      const now = new Date();
      const end = new Date(endDate);
      const diff = end.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeLeft('Expired');
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hrs = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

      if (days > 0) {
        setTimeLeft(`${days}d ${hrs}h remaining`);
      } else {
        setTimeLeft(`${hrs}h ${mins}m remaining`);
      }
    };

    update();
    const interval = setInterval(update, 60000); // Update every minute
    return () => clearInterval(interval);
  }, [subscription]);

  if (!subscription || dismissed) return null;

  const { days_remaining, is_expiring_soon, status } = subscription;
  const isTrial = status === 'trialing';

  // Don't show banner if plenty of time left and not trial
  if (!isTrial && !is_expiring_soon) return null;

  const urgency =
    days_remaining !== null
      ? days_remaining <= 3
        ? 'critical'
        : days_remaining <= 15
        ? 'warning'
        : 'info'
      : 'info';

  const colors = {
    critical: 'bg-red-500/10 border-red-500/30 text-red-300',
    warning: 'bg-yellow-500/10 border-yellow-500/30 text-yellow-300',
    info: 'bg-brand-primary/10 border-brand-primary/30 text-brand-primary',
  };

  const icons = {
    critical: <AlertTriangle className="w-4 h-4 shrink-0" />,
    warning: <Clock className="w-4 h-4 shrink-0" />,
    info: <RefreshCw className="w-4 h-4 shrink-0" />,
  };

  return (
    <div className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border text-xs font-bold ${colors[urgency]}`}>
      {icons[urgency]}
      <span>
        {isTrial ? '🎯 Trial: ' : '⏱ Subscription: '}
        <span className="font-black">{timeLeft}</span>
      </span>
      <Link
        href="/settings/subscription"
        className="ml-1 underline hover:no-underline opacity-80 hover:opacity-100 transition-opacity"
      >
        {urgency === 'critical' ? 'Renew Now' : 'Manage →'}
      </Link>
      <button
        onClick={() => setDismissed(true)}
        className="ml-auto opacity-50 hover:opacity-100 transition-opacity"
        aria-label="Dismiss"
      >
        <X className="w-3 h-3" />
      </button>
    </div>
  );
};

export default SubscriptionBanner;
