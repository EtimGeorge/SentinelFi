import React, { useState, useEffect, useMemo } from 'react';
import MarketingLayout from '../../components/Landing/MarketingLayout';
import Link from 'next/link';
import { Check, ArrowRight, Zap, Shield, Crown, Globe, ChevronDown } from 'lucide-react';
import axios from 'axios';

// ─── Pricing Constants ────────────────────────────────────────────────────────
const MONTHLY_USD = 1500;
const ANNUAL_USD = MONTHLY_USD * 12 * (1 - 0.15); // $15,300 (15% off)

type BillingCycle = 'monthly' | 'annual';

interface CurrencyRate {
  code: string;
  symbol: string;
  name: string;
  rateToUSD: number;
}

// ─── Currency Selector ────────────────────────────────────────────────────────
const CurrencySelector: React.FC<{
  currencies: CurrencyRate[];
  selected: CurrencyRate;
  onSelect: (c: CurrencyRate) => void;
}> = ({ currencies, selected, onSelect }) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const filtered = currencies.filter(
    (c) =>
      c.code.toLowerCase().includes(search.toLowerCase()) ||
      c.name.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="relative inline-block">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm font-bold hover:border-brand-primary/50 transition-all"
      >
        <Globe className="w-4 h-4 text-brand-primary" />
        {selected.symbol} {selected.code}
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-2 w-64 bg-[#0a0e1a] border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden">
          <div className="p-3 border-b border-white/5">
            <input
              type="text"
              placeholder="Search currency..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 outline-none focus:border-brand-primary"
              autoFocus
            />
          </div>
          <div className="max-h-56 overflow-y-auto">
            {filtered.slice(0, 30).map((c) => (
              <button
                key={c.code}
                onClick={() => { onSelect(c); setOpen(false); setSearch(''); }}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left transition-colors hover:bg-white/5 ${
                  c.code === selected.code ? 'text-brand-primary font-bold' : 'text-gray-300'
                }`}
              >
                <span className="font-mono w-8 text-xs">{c.symbol}</span>
                <span className="font-bold">{c.code}</span>
                <span className="text-gray-500 text-xs truncate">{c.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Price formatter ──────────────────────────────────────────────────────────
const formatInCurrency = (usdAmount: number, currency: CurrencyRate) => {
  const converted = usdAmount * currency.rateToUSD;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.code,
    maximumFractionDigits: 0,
  }).format(converted);
};

// ─── Plan Data ────────────────────────────────────────────────────────────────
const PLANS = [
  {
    key: 'trial',
    name: 'Free Trial',
    icon: <Zap className="w-7 h-7" />,
    price_usd_monthly: 0,
    price_usd_annual: 0,
    badge: null,
    featured: false,
    color: 'teal',
    description: '14 days of full Professional access. No credit card required.',
    features: [
      'Full AI Forensics Engine',
      'WBS Structure Enforcement',
      'Multi-Tenant Access (up to 3)',
      'All Reporting Modules',
      'Priority Email Support',
      'Automatic expiry after 14 days',
    ],
    cta: 'Start Free Trial',
    ctaHref: (cycle: BillingCycle) => `/landing/checkout?plan=trial`,
    note: 'No credit card required',
  },
  {
    key: 'professional',
    name: 'Professional',
    icon: <Shield className="w-7 h-7" />,
    price_usd_monthly: MONTHLY_USD,
    price_usd_annual: ANNUAL_USD / 12, // Monthly equivalent when billed annually
    badge: 'Most Popular',
    featured: true,
    color: 'brand-primary',
    description: 'Full-power financial governance for serious infrastructure teams.',
    features: [
      'Everything in Free Trial',
      '3 Sovereign Tenant Instances',
      'Unlimited AI Forensic Scans',
      'Predictive Risk Modeling',
      'Automated Invoice Verification',
      'Custom Domain Mapping',
      'Paystack & PayPal Gateways',
      'Priority 24/7 Support',
    ],
    cta: 'Go Professional',
    ctaHref: (cycle: BillingCycle) => `/landing/checkout?plan=professional&cycle=${cycle}`,
    note: 'Charged in USD via secure gateway',
  },
  {
    key: 'enterprise',
    name: 'Enterprise',
    icon: <Crown className="w-7 h-7" />,
    price_usd_monthly: null, // Custom
    price_usd_annual: null,
    badge: null,
    featured: false,
    color: 'yellow-500',
    description: 'Unlimited power for global infrastructure boards and governments.',
    features: [
      'Unlimited Global Tenancies',
      'On-Premise Deployment Option',
      'Dedicated Governance Engineer',
      'Custom AI Model Training',
      'White-Label Intelligence Portal',
      'Full Audit Transparency Log',
      'SLA-backed 99.99% Uptime',
    ],
    cta: 'Contact Sales',
    ctaHref: () => '/contact',
    note: 'Custom pricing',
  },
];

import { NextPage } from 'next';

type NextPageWithLayout = NextPage & {
  getLayout?: (page: React.ReactElement) => React.ReactNode;
};

// ─── Main Component ───────────────────────────────────────────────────────────
const PricingPage: NextPageWithLayout = () => {
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('annual');
  const [currencies, setCurrencies] = useState<CurrencyRate[]>([]);
  const [selectedCurrency, setSelectedCurrency] = useState<CurrencyRate>({
    code: 'USD',
    symbol: '$',
    name: 'US Dollar',
    rateToUSD: 1,
  });
  const [ratesLoading, setRatesLoading] = useState(true);

  // Fetch live exchange rates — public endpoint, no auth required
  useEffect(() => {
    const fetchRates = async () => {
      try {
        const { data } = await axios.get('/api/proxy-currency-rates', { timeout: 5000 });
        if (data?.currencies?.length) {
          setCurrencies(data.currencies);
          // Try to auto-detect user's currency from timezone
          try {
            const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
            if (tz.includes('Lagos') || tz.includes('Africa/Lagos')) {
              const ngn = data.currencies.find((c: CurrencyRate) => c.code === 'NGN');
              if (ngn) setSelectedCurrency(ngn);
            }
          } catch (_) {}
        }
      } catch (err) {
        // Silently fall back to USD only — pricing still works
        console.warn('Could not fetch live currency rates for pricing page');
      } finally {
        setRatesLoading(false);
      }
    };
    fetchRates();
  }, []);

  const annualTotalUSD = useMemo(() => ANNUAL_USD, []);

  return (
    <section className="py-28">
        <div className="container mx-auto px-6 max-w-6xl">

          {/* Header */}
          <div className="text-center mb-16">
            <p className="text-xs font-black uppercase tracking-[0.4em] text-brand-primary mb-4">Transparent Pricing</p>
            <h1 className="text-5xl md:text-6xl font-black font-sora text-white mb-6">
              Simple. Sovereign. <span className="text-brand-primary">Scalable.</span>
            </h1>
            <p className="text-lg text-gray-400 max-w-2xl mx-auto mb-10">
              One professional plan, no seat fees, no hidden tiers. Start free, go live when you're confident.
            </p>

            {/* Controls Row */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              {/* Billing Toggle */}
              <div className="inline-flex items-center p-1 bg-white/5 border border-white/10 rounded-full">
                <button
                  onClick={() => setBillingCycle('monthly')}
                  className={`px-6 py-2 rounded-full text-sm font-bold transition-all ${
                    billingCycle === 'monthly' ? 'bg-brand-primary text-white' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Monthly
                </button>
                <button
                  onClick={() => setBillingCycle('annual')}
                  className={`px-6 py-2 rounded-full text-sm font-bold transition-all flex items-center gap-2 ${
                    billingCycle === 'annual' ? 'bg-brand-primary text-white' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Annual
                  <span className="bg-green-500/20 text-green-400 text-[10px] px-2 py-0.5 rounded-full font-black">SAVE 15%</span>
                </button>
              </div>

              {/* Currency Selector */}
              {!ratesLoading && currencies.length > 0 && (
                <CurrencySelector
                  currencies={currencies}
                  selected={selectedCurrency}
                  onSelect={setSelectedCurrency}
                />
              )}
            </div>

            {selectedCurrency.code !== 'USD' && (
              <p className="text-xs text-gray-500 mt-3">
                Prices shown in {selectedCurrency.code} at live exchange rate. All charges processed in USD.
              </p>
            )}
          </div>

          {/* Pricing Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch mb-20">
            {PLANS.map((plan) => {
              const isAnnual = billingCycle === 'annual';
              const priceUSD = isAnnual ? plan.price_usd_annual : plan.price_usd_monthly;

              return (
                <div
                  key={plan.key}
                  className={`glass-card p-8 flex flex-col relative group transition-all duration-300 hover:-translate-y-1 ${
                    plan.featured
                      ? 'border-brand-primary/50 ring-1 ring-brand-primary/30 scale-105 z-10'
                      : 'hover:border-white/20'
                  }`}
                >
                  {plan.badge && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-brand-primary text-white text-[10px] font-black uppercase tracking-widest px-6 py-1.5 rounded-full shadow-[0_4px_20px_rgba(13,148,136,0.4)]">
                      {plan.badge}
                    </div>
                  )}

                  {/* Icon + Name */}
                  <div className={`text-${plan.color} mb-6 p-3 bg-${plan.color}/10 rounded-2xl w-fit`}>
                    {plan.icon}
                  </div>
                  <h2 className="text-2xl font-black font-sora text-white mb-2">{plan.name}</h2>
                  <p className="text-sm text-gray-400 mb-8 leading-relaxed">{plan.description}</p>

                  {/* Price */}
                  <div className="mb-8">
                    {priceUSD === null ? (
                      <div>
                        <span className="text-4xl font-black font-sora text-white">Custom</span>
                      </div>
                    ) : priceUSD === 0 ? (
                      <div>
                        <span className="text-5xl font-black font-sora text-white">Free</span>
                        <span className="text-sm text-gray-500 ml-2">/ 14 days</span>
                      </div>
                    ) : (
                      <div>
                        <div className="flex items-baseline gap-2">
                          <span className="text-4xl font-black font-sora text-white">
                            {selectedCurrency.code === 'USD'
                              ? `$${priceUSD.toLocaleString()}`
                              : `≈ ${formatInCurrency(priceUSD, selectedCurrency)}`}
                          </span>
                          <span className="text-sm text-gray-500">/ month</span>
                        </div>
                        {selectedCurrency.code !== 'USD' && (
                          <p className="text-xs text-gray-600 mt-1">${priceUSD.toLocaleString()} USD / month</p>
                        )}
                        {isAnnual && (
                          <p className="text-xs text-green-400 mt-2 font-bold">
                            Billed as {selectedCurrency.code === 'USD'
                              ? `$${annualTotalUSD.toLocaleString()}/year`
                              : `≈ ${formatInCurrency(annualTotalUSD, selectedCurrency)}/year`}
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Features */}
                  <ul className="space-y-3 mb-10 flex-1">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-3 text-sm text-gray-300">
                        <Check className={`w-4 h-4 text-${plan.color} mt-0.5 shrink-0`} />
                        {f}
                      </li>
                    ))}
                  </ul>

                  {/* CTA */}
                  <div>
                    <Link
                      href={plan.ctaHref(billingCycle)}
                      className={`flex items-center justify-center gap-2 w-full py-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-all ${
                        plan.featured
                          ? 'bg-brand-primary text-white hover:bg-brand-primary/90 hover:shadow-[0_8px_30px_rgba(13,148,136,0.4)]'
                          : plan.key === 'enterprise'
                          ? 'bg-white/5 border border-white/10 text-gray-300 hover:border-white/30 hover:text-white'
                          : 'bg-white/10 border border-white/10 text-white hover:bg-white/15'
                      }`}
                    >
                      {plan.cta}
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                    <p className="text-xs text-gray-600 text-center mt-3">{plan.note}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Trust Row */}
          <div className="glass-card p-10 text-center">
            <p className="text-xs font-black uppercase tracking-[0.4em] text-gray-500 mb-8">Payment & Security Assurance</p>
            <div className="flex flex-col md:flex-row justify-center items-center gap-10">
              {[
                { icon: <Shield className="w-8 h-8" />, title: 'PCI-DSS Gateways', body: 'Via Paystack (Africa) and PayPal (International). Zero card data on SentinelFi servers.' },
                { icon: <Globe className="w-8 h-8" />, title: 'Global Currencies Displayed', body: 'Prices shown in your currency at live rates. All charges in USD.' },
                { icon: <Zap className="w-8 h-8" />, title: 'Instant Provisioning', body: 'Your sovereign workspace is live within minutes of payment confirmation.' },
              ].map((item) => (
                <div key={item.title} className="flex flex-col items-center gap-3 max-w-xs text-center">
                  <div className="text-brand-primary">{item.icon}</div>
                  <p className="font-black text-white text-sm">{item.title}</p>
                  <p className="text-xs text-gray-500 leading-relaxed">{item.body}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
  );
};

PricingPage.getLayout = (page: React.ReactElement) => {
  return <MarketingLayout title="Pricing | SentinelFi — Professional Financial Intelligence">{page}</MarketingLayout>;
};

export default PricingPage;
