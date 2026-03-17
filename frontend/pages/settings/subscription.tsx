import React, { useState, useEffect } from 'react';
import SecuredLayout from '../../components/Layout/SecuredLayout';
import { useAuth } from '../../components/context/AuthContext';
import { CreditCard, AlertTriangle, CheckCircle, Clock, Zap, ArrowRight, XCircle } from 'lucide-react';
import api from '../../lib/api';
import { toast } from 'react-hot-toast';
import { useRouter } from 'next/router';

interface SubscriptionData {
  plan: string;
  status: string;
  billing_cycle: string;
  amount_usd: number;
  gateway: string;
  current_period_start: string;
  current_period_end: string;
  trial_ends_at: string | null;
  cancelled_at: string | null;
  days_remaining: number | null;
}

const SubscriptionSettingsPage: React.FC = () => {
  const { user } = useAuth();
  const router = useRouter();
  const [sub, setSub] = useState<SubscriptionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [renewing, setRenewing] = useState(false);
  const isExpiredQuery = router.query.expired === 'true';

  useEffect(() => {
    const fetchSub = async () => {
      try {
        const { data } = await api.get('/billing/my-subscription');
        setSub(data);
      } catch (err: any) {
        toast.error('Could not load subscription details');
      } finally {
        setLoading(false);
      }
    };
    fetchSub();
  }, []);

  const handleRenew = async () => {
    if (!sub) return;
    setRenewing(true);
    try {
      // Create a pending subscription matching current plan/cycle and go to gateway
      const { data } = await api.post('/billing/process-public-subscription', {
        companyName: user?.tenant_name || 'My Company', // Fallback if missing
        email: user?.email,
        firstName: user?.first_name || '',
        lastName: user?.last_name || '',
        plan: sub.plan,
        billingCycle: sub.billing_cycle,
        gateway: sub.gateway || 'paystack', // Default to Paystack if null (like in trial)
      });
      if (data.authorization_url) {
        window.location.href = data.authorization_url;
      }
    } catch (err: any) {
      toast.error('Failed to initiate renewal. Please try again.');
    } finally {
      setRenewing(false);
    }
  };

  if (loading) {
    return (
      <SecuredLayout title="Subscription & Billing">
        <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-brand-primary"></div></div>
      </SecuredLayout>
    );
  }

  // If we couldn't load subscription (maybe they are SuperAdmin or something broke)
  if (!sub) {
    return (
      <SecuredLayout title="Subscription & Billing">
        <div className="p-8 text-center text-gray-400">No subscription record found.</div>
      </SecuredLayout>
    );
  }

  const isExpired = sub.status === 'expired' || (sub.days_remaining !== null && sub.days_remaining <= 0);
  const isTrial = sub.status === 'trialing';

  return (
    <SecuredLayout title="Subscription & Billing">
      <div className="max-w-4xl mx-auto space-y-8 pb-20">
        
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-black text-white font-sora">Billing & Subscription</h1>
          {sub.status === 'active' && (
            <span className="flex items-center gap-2 text-sm font-bold text-green-400 bg-green-500/10 px-4 py-1.5 rounded-full border border-green-500/20">
              <CheckCircle className="w-4 h-4" /> Active Workspace
            </span>
          )}
        </div>

        {/* Expiry Warning from 402 Interceptor */}
        {isExpiredQuery && isExpired && (
          <div className="p-6 bg-red-500/10 border border-red-500/30 rounded-2xl flex items-start gap-4">
            <AlertTriangle className="w-8 h-8 text-red-500 shrink-0 mt-1" />
            <div>
              <h3 className="text-red-500 font-bold mb-1">Your access has been suspended due to an expired subscription.</h3>
              <p className="text-red-400 text-sm leading-relaxed mb-4">
                To restore full access for you and your team, please renew your subscription below. Your data is safe and will be immediately available upon successful payment.
              </p>
              <button onClick={handleRenew} disabled={renewing} className="bg-red-500 text-white px-6 py-2 rounded-xl text-sm font-bold shadow-lg shadow-red-500/20 hover:bg-red-600 transition-colors disabled:opacity-50">
                {renewing ? 'Redirecting...' : 'Renew Subscription Now'}
              </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Current Plan Card */}
          <div className="md:col-span-2 glass-card p-8 border-brand-primary/20 bg-gradient-to-br from-brand-primary/10 to-transparent">
            <div className="flex justify-between items-start mb-8">
              <div>
                <p className="text-xs font-black text-brand-primary uppercase tracking-widest mb-1">Current Plan</p>
                <h2 className="text-3xl font-black text-white font-sora capitalize">{sub.plan}</h2>
              </div>
              <div className="text-right">
                <span className="text-3xl font-black text-white">${sub.amount_usd}</span>
                <span className="text-gray-500 text-sm"> / {sub.billing_cycle === 'annual' ? 'yr' : 'mo'}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-y-6">
              <div>
                <p className="text-xs text-gray-500 uppercase font-black tracking-widest mb-1">Status</p>
                <div className="flex items-center gap-2">
                  {isTrial ? <Zap className="w-4 h-4 text-brand-primary" /> : <CreditCard className="w-4 h-4 text-gray-400" />}
                  <span className="font-bold text-white capitalize">{sub.status}</span>
                </div>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase font-black tracking-widest mb-1">Gateway</p>
                <p className="font-bold text-white uppercase">{sub.gateway || 'None (Trial)'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase font-black tracking-widest mb-1">Period Ends</p>
                <p className="font-bold text-white">
                  {new Date(sub.trial_ends_at || sub.current_period_end).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase font-black tracking-widest mb-1">Time Remaining</p>
                <p className={`font-bold ${sub.days_remaining !== null && sub.days_remaining <= 5 ? 'text-red-400' : 'text-white'}`}>
                  {sub.days_remaining !== null ? (sub.days_remaining > 0 ? `${sub.days_remaining} days` : 'Expired') : 'Lifetime'}
                </p>
              </div>
            </div>
          </div>

          {/* Action Card */}
          <div className="glass-card p-8 flex flex-col justify-between">
            <div>
              <h3 className="text-lg font-black text-white mb-4">Manage Access</h3>
              <p className="text-sm text-gray-400 mb-6 leading-relaxed">
                {isTrial ? 'You are currently on a free trial. Upgrade to a paid plan to lock in uninterrupted access.' : 'Ensure uninterrupted access for your entire organization by keeping your subscription active.'}
              </p>
            </div>
            
            <div className="space-y-3">
              <button 
                onClick={handleRenew} 
                disabled={renewing}
                className="w-full flex items-center justify-between px-4 py-3 bg-brand-primary text-white font-bold rounded-xl hover:bg-brand-primary/90 transition-all shadow-[0_4px_15px_rgba(13,148,136,0.3)] disabled:opacity-50"
              >
                {renewing ? 'Processing...' : (isTrial ? 'Upgrade Now' : (isExpired ? 'Renew Now' : 'Renew Early'))}
                <ArrowRight className="w-4 h-4" />
              </button>

              {sub.status === 'active' && !sub.cancelled_at && (
                <button className="w-full flex items-center justify-between px-4 py-3 bg-white/5 border border-white/10 text-gray-400 font-bold rounded-xl hover:text-red-400 hover:border-red-400/30 transition-all">
                  Cancel Subscription
                  <XCircle className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Billing History (Placeholder for now) */}
        <div className="glass-card p-8 mt-8 opacity-50 cursor-not-allowed">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-black text-white">Billing History</h3>
            <span className="text-[10px] font-black uppercase tracking-widest bg-white/10 px-3 py-1 rounded-full">Coming Soon</span>
          </div>
          <div className="text-center py-8">
            <Clock className="w-8 h-8 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">Your invoice history will appear here.</p>
          </div>
        </div>

      </div>
    </SecuredLayout>
  );
};

export default SubscriptionSettingsPage;
