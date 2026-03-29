import React, { useState, useEffect } from 'react';
import MarketingLayout from '../../components/Landing/MarketingLayout';
import { useRouter } from 'next/router';
import { CreditCard, ArrowRight, ShieldCheck, Globe, CheckCircle2, AlertCircle, Zap } from 'lucide-react';
import api from '../../lib/api';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { isCorporateEmail } from '@shared/utils/validation';

type BillingCycle = 'monthly' | 'annual';

interface Rate {
  code: string;
  symbol: string;
  rateToUSD: number;
}

const PLAN_CONFIG: Record<string, { name: string; monthly_usd: number; annual_usd: number; description: string }> = {
  trial: {
    name: 'Free 14-Day Trial',
    monthly_usd: 0,
    annual_usd: 0,
    description: 'Full Professional access. No credit card required.',
  },
  professional: {
    name: 'Professional',
    monthly_usd: 1500,
    annual_usd: 1500 * 12 * 0.85,
    description: 'Billed securely via Paystack or PayPal.',
  },
};

const CheckoutPage: React.FC = () => {
  const router = useRouter();
  const { plan, cycle } = router.query;
  const billingCycle: BillingCycle = (cycle as BillingCycle) || 'monthly';

  const [gateway, setGateway] = useState<'paystack' | 'paypal'>('paystack');
  const [loading, setLoading] = useState(false);
  const [localRate, setLocalRate] = useState<Rate>({ code: 'USD', symbol: '$', rateToUSD: 1 });
  const [supportedCurrencies, setSupportedCurrencies] = useState<Rate[]>([]);
  const [formData, setFormData] = useState({
    companyName: '',
    email: '',
    firstName: '',
    lastName: '',
    baseCurrency: 'USD',
  });

  const planConfig = PLAN_CONFIG[plan as string] || null;
  const isTrial = plan === 'trial';
  const amountUSD = isTrial ? 0 : (billingCycle === 'annual' ? planConfig?.annual_usd : planConfig?.monthly_usd) || 0;

  // Fetch local currency for display
  useEffect(() => {
    const fetchRate = async () => {
      try {
        const { data } = await axios.get('/api/proxy-currency-rates');
        if (data?.currencies) {
           setSupportedCurrencies(data.currencies);
        }
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
        if (tz.includes('Lagos') || tz.includes('Africa')) {
          const ngn = data?.currencies?.find((c: Rate) => c.code === 'NGN');
          if (ngn) setLocalRate(ngn);
        }
      } catch (_) {}
    };
    fetchRate();
  }, []);

  const localEquivalent = amountUSD > 0 && localRate.code !== 'USD'
    ? new Intl.NumberFormat('en', { style: 'currency', currency: localRate.code, maximumFractionDigits: 0 })
        .format(amountUSD * localRate.rateToUSD)
    : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!plan || !planConfig) return toast.error('No plan selected.');
    if (!formData.email || !formData.companyName) return toast.error('Please complete all required fields.');
    
    if (!isCorporateEmail(formData.email)) {
      return toast.error('SentinelFi requires a corporate email address to proceed with provisioning.');
    }

    setLoading(true);
    try {
      if (isTrial) {
        // Trial flow — no gateway redirect
        await api.post('/billing/start-trial', formData);
        router.push('/auth/check-email?reason=trial');
        return;
      }

      // Paid flow
      const response = await api.post('/billing/process-public-subscription', {
        ...formData,
        plan,
        billingCycle,
        gateway,
      });

      if (response.data.authorization_url) {
        window.location.href = response.data.authorization_url;
      } else {
        router.push('/auth/check-email?reason=paid');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Checkout failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!router.isReady) return null;
  if (!planConfig) {
    return (
      <MarketingLayout title="Checkout | SentinelFi">
        <div className="py-40 text-center text-gray-400">
          <p>No plan selected. <a href="/landing/pricing" className="text-brand-primary underline">View Pricing →</a></p>
        </div>
      </MarketingLayout>
    );
  }

  return (
    <MarketingLayout title={`Checkout — ${planConfig.name} | SentinelFi`}>
      <section className="py-24 container mx-auto px-6 max-w-6xl">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">

          {/* ── Form Side ──────────────────────────────────────────── */}
          <div className="lg:col-span-7 space-y-8">
            <div>
              {isTrial ? (
                <>
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-500/10 border border-green-500/20 rounded-full text-green-400 text-xs font-black uppercase tracking-widest mb-4">
                    <Zap className="w-3 h-3" /> Free Trial — No Credit Card Required
                  </div>
                  <h1 className="text-4xl font-black font-sora text-white mb-2">Start Your 14-Day Trial</h1>
                  <p className="text-gray-400">Full Professional access. Magic-link dispatched to your inbox within 60 seconds.</p>
                </>
              ) : (
                <>
                  <h1 className="text-4xl font-black font-sora text-white mb-2">Initialize Your Workspace</h1>
                  <p className="text-gray-400">Complete payment to provision your sovereign instance.</p>
                </>
              )}
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Admin details */}
              <div className="p-8 glass-card space-y-4">
                <h3 className="text-sm font-black uppercase tracking-widest text-gray-400 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-brand-primary" /> Primary Administrator
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <input type="text" placeholder="First Name" required
                    className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-brand-primary transition-colors"
                    value={formData.firstName}
                    onChange={e => setFormData({ ...formData, firstName: e.target.value })}
                  />
                  <input type="text" placeholder="Last Name" required
                    className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-brand-primary transition-colors"
                    value={formData.lastName}
                    onChange={e => setFormData({ ...formData, lastName: e.target.value })}
                  />
                </div>
                <input type="email" placeholder="Professional Email Address" required
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-brand-primary transition-colors"
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                />
              </div>

              {/* Tenant identity */}
              <div className="p-8 glass-card space-y-4">
                <h3 className="text-sm font-black uppercase tracking-widest text-gray-400 flex items-center gap-2">
                  <Globe className="w-4 h-4 text-brand-primary" /> Organization Identity
                </h3>
                <input type="text" placeholder="Company / Organization Name" required
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-brand-primary transition-colors"
                  value={formData.companyName}
                  onChange={e => setFormData({ ...formData, companyName: e.target.value })}
                />
                
                {/* Base Reporting Currency Dropdown */}
                <div className="pt-2">
                  <label className="block text-xs font-black uppercase tracking-widest text-brand-primary mb-2">Base Reporting Currency</label>
                  <select
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-brand-primary transition-colors appearance-none cursor-pointer"
                    value={formData.baseCurrency}
                    onChange={e => setFormData({ ...formData, baseCurrency: e.target.value })}
                    required
                  >
                    <option value="USD" className="text-black">US Dollar (USD)</option>
                    {supportedCurrencies.filter(c => c.code !== 'USD').map(c => (
                      <option key={c.code} value={c.code} className="text-black">
                        {c.code} - {c.symbol}
                      </option>
                    ))}
                  </select>
                  <p className="text-[10px] text-gray-500 mt-3 uppercase tracking-wide leading-relaxed">
                    This is the permanent base currency for your ledger and financial reporting. All foreign transactions will be continuously reconciled back to this metric.<br />
                    <span className="text-brand-primary font-bold">Note: All SentinelFi platform subscription billing is processed exclusively in USD.</span>
                  </p>
                </div>
              </div>

              {/* Gateway selection — paid only */}
              {!isTrial && (
                <div className="p-8 glass-card space-y-4">
                  <h3 className="text-sm font-black uppercase tracking-widest text-gray-400">Payment Gateway</h3>
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { key: 'paystack', label: 'Paystack', sub: 'Africa & Nigeria', icon: <CreditCard className="w-5 h-5" /> },
                      { key: 'paypal', label: 'PayPal', sub: 'International', icon: <Globe className="w-5 h-5" /> },
                    ].map((gw) => (
                      <button key={gw.key} type="button"
                        onClick={() => setGateway(gw.key as any)}
                        className={`p-4 rounded-xl border flex flex-col items-center gap-2 transition-all ${
                          gateway === gw.key
                            ? 'bg-brand-primary/10 border-brand-primary text-brand-primary'
                            : 'bg-white/5 border-white/10 text-gray-400 hover:border-white/20'
                        }`}
                      >
                        {gw.icon}
                        <span className="text-xs font-black uppercase tracking-widest">{gw.label}</span>
                        <span className="text-[10px] opacity-60">{gw.sub}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <button type="submit" disabled={loading}
                className="w-full flex items-center justify-center gap-3 py-5 bg-brand-primary text-white font-black rounded-2xl uppercase tracking-widest hover:bg-brand-primary/90 hover:shadow-[0_8px_30px_rgba(13,148,136,0.4)] transition-all disabled:opacity-50 disabled:cursor-not-allowed font-sora"
              >
                {loading
                  ? 'Processing...'
                  : isTrial
                  ? 'Launch My Free Trial →'
                  : `Complete ${planConfig.name} Setup`}
                {!loading && <ArrowRight className="w-5 h-5" />}
              </button>
            </form>
          </div>

          {/* ── Summary Side ──────────────────────────────────────── */}
          <div className="lg:col-span-5">
            <div className="sticky top-32 space-y-6">
              <div className="glass-card p-8 border-brand-primary/20 bg-brand-primary/5">
                <h3 className="text-lg font-black font-sora mb-6 text-white">Order Summary</h3>

                {[
                  ['Plan', planConfig.name],
                  ['Billing', isTrial ? '14-day trial' : `${billingCycle === 'annual' ? 'Annual' : 'Monthly'}`],
                  ['Workspace Type', 'Sovereign Instance'],
                ].map(([label, value]) => (
                  <div key={label} className="flex justify-between items-center py-3 border-b border-white/5 text-xs font-mono uppercase tracking-wider">
                    <span className="text-gray-500">{label}</span>
                    <span className="text-white font-bold">{value}</span>
                  </div>
                ))}

                <div className="flex justify-between items-center pt-6">
                  <span className="font-black text-white">Total</span>
                  <div className="text-right">
                    {isTrial ? (
                      <span className="text-2xl font-black text-green-400 font-sora">Free</span>
                    ) : (
                      <>
                        <span className="text-2xl font-black text-brand-primary font-sora">
                          ${amountUSD.toLocaleString()}
                        </span>
                        <span className="text-xs text-gray-500 ml-1">USD</span>
                        {localEquivalent && (
                          <p className="text-xs text-gray-600 mt-1">≈ {localEquivalent} ({localRate.code})</p>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-4 px-2">
                {[
                  { icon: <CheckCircle2 className="w-5 h-5 text-green-400" />, text: isTrial ? 'Magic-link access dispatched within 60 seconds of submission.' : 'Magic-link dispatched after payment confirmation.' },
                  { icon: <AlertCircle className="w-5 h-5 text-brand-primary" />, text: 'Zero card data stored on SentinelFi. All processing via PCI-DSS gateways.' },
                  { icon: <ShieldCheck className="w-5 h-5 text-yellow-400" />, text: 'Your tenant schema is provisioned in an isolated PostgreSQL instance.' },
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-3">
                    {item.icon}
                    <p className="text-xs text-gray-400 leading-relaxed">{item.text}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </MarketingLayout>
  );
};

export default CheckoutPage;
