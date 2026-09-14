import React, { useState, useEffect, useRef } from 'react';
import MarketingLayout from '../components/Landing/MarketingLayout';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { POSITIONING, EXPLORE_STEPS, MARKETING_ACTIONS, HEADLINE_VARIANTS } from '../components/Landing/marketingContent';
import { getMarketingEvents, resolveHeadlineVariant, trackMarketingEvent } from '../components/Landing/marketingAnalytics';
import { 
  ArrowRight, ShieldCheck, Zap, Cpu, BarChart3, Users, Lock, ChevronRight, Globe, Database, CreditCard, Mail, Receipt, KeyRound, CheckCircle2, FileText, TrendingUp, Activity, Play,
} from 'lucide-react';
import { NextPage } from 'next';

type NextPageWithLayout = NextPage & {
  getLayout?: (page: React.ReactElement) => React.ReactNode;
};

const LandingPage: NextPageWithLayout = () => {
  const [activeRole, setActiveRole] = useState('CEO');
  const router = useRouter();
  // Headline A/B: ?headline=a|b → persisted; defaults to control 'a'.
  // SSR-safe: resolve after mount so server markup always matches control.
  const [headlineKey, setHeadlineKey] = useState<'a' | 'b'>('a');
  const heroTrackedRef = useRef<string | null>(null);
  useEffect(() => {
    const query = router.asPath.includes('?') ? `?${router.asPath.split('?')[1]}` : window.location.search;
    const key = resolveHeadlineVariant(query);
    setHeadlineKey(key);
    // Guard against React StrictMode double-mount double-counting.
    if (heroTrackedRef.current !== router.asPath) {
      heroTrackedRef.current = router.asPath;
      trackMarketingEvent('marketing.hero_view', { variant: `headline-${key}` });
      trackMarketingEvent('marketing.headline_variant', { variant: `headline-${key}` });
    }
  }, [router.asPath]);
  const headline = HEADLINE_VARIANTS[headlineKey];

  const trackCta = (cta: string, destination: string) => () => {
    trackMarketingEvent('marketing.cta_click', { cta, destination, variant: `headline-${headlineKey}` });
  };

  // Debug console: `window.__sfiMarketing()` prints buffered events for the
  // A/B readout (auditable without a vendor dashboard).
  useEffect(() => {
    (window as unknown as { __sfiMarketing?: () => void }).__sfiMarketing = () => {
      // eslint-disable-next-line no-console
      console.table(getMarketingEvents());
    };
  }, []);
  const roles = [
    { id: 'CEO', label: 'Executive (CEO)', icon: <ShieldCheck />, desc: 'High-level risk aggregation and strategic assurance.' },
    { id: 'PM', label: 'Tactical (PM)', icon: <Zap />, desc: 'WBS granularity and operational baseline management.' },
    { id: 'AUDIT', label: 'Governance (Audit)', icon: <Lock />, desc: 'Real-time compliance monitoring and expense verification.' },
  ];

  const modules = [
    {
      icon: <TrendingUp className="w-7 h-7" />, color: 'text-brand-primary', bg: 'bg-brand-primary/10 border-brand-primary/20', title: 'CAPEX & Revenue Engine', desc: 'Multi-billion dollar capital projects with WBS-enforced budgets, live variance tracking, and income reconciliation.', href: '/landing/features#capex',
    },
    {
      icon: <FileText className="w-7 h-7" />, color: 'text-alert-critical', bg: 'bg-alert-critical/10 border-alert-critical/20', title: 'OPEX, Payroll & Recurring', desc: 'Operational budgets, payroll batches, and recurring cost lines with absolute line-item traceability.', href: '/landing/features#opex',
    },
    {
      icon: <Receipt className="w-7 h-7" />, color: 'text-brand-secondary', bg: 'bg-brand-secondary/10 border-brand-secondary/20', title: 'Procurement & P2P', desc: 'Purchase-to-pay workflow: requisitions, purchase orders, goods receipt, three-way matching, and payment.', href: '/landing/features#procurement',
    },
    {
      icon: <ShieldCheck className="w-7 h-7" />, color: 'text-brand-primary', bg: 'bg-brand-primary/10 border-brand-primary/20', title: 'Approvals & Governance', desc: 'Document-to-form flows, configurable approval chains, and a tamper-resistant audit trail on every action.', href: '/landing/features#approvals',
    },
    {
      icon: <Activity className="w-7 h-7" />, color: 'text-alert-critical', bg: 'bg-alert-critical/10 border-alert-critical/20', title: 'AI Forensics & Intelligence', desc: 'Sentinel-AI scans every document and transaction, surfacing anomalies and duplicate invoices in real time.', href: '/landing/features#ai',
    },
    {
      icon: <Database className="w-7 h-7" />, color: 'text-brand-secondary', bg: 'bg-brand-secondary/10 border-brand-secondary/20', title: 'Reporting & Tenant Sovereignty', desc: 'CAPEX/OPEX variance reports, currency-aware ledgers, and physically isolated multi-tenant databases.', href: '/landing/features#reporting',
    },
  ];

  const businessModules = [
    {
      icon: <KeyRound className="w-6 h-6" />, color: 'text-brand-primary', label: 'Subscriptions', title: 'Plans, cycles & trials', desc: '14-day full-feature trial, single Professional plan with monthly or annual billing (15% annual saving), and enterprise custom contracts â€” all managed from one Billing console.', href: '/landing/features#subscriptions',
    },
    {
      icon: <CreditCard className="w-6 h-6" />, color: 'text-brand-secondary', label: 'Payments', title: 'Paystack & PayPal', desc: 'Instant provisioning via PCI-DSS gateways. Paystack for Africa and Nigeria, PayPal for international teams. Zero card data ever touches SentinelFi servers.', href: '/landing/features#payments',
    },
    {
      icon: <Receipt className="w-6 h-6" />, color: 'text-alert-critical', label: 'Billing', title: 'Invoices, renewals & history', desc: 'Secure invoice records, downloadable PDF receipts, auto-expiry enforcement, and one-click renewal when a workspace lapses.', href: '/landing/features#billing',
    },
    {
      icon: <Mail className="w-6 h-6" />, color: 'text-alert-positive', label: 'Email', title: 'Magic links & alerts', desc: 'Passwordless magic-link onboarding dispatched in under 60 seconds, plus transactional alerts for approvals, anomalies, and subscription events.', href: '/landing/features#email',
    },
  ];

  return (
    <>
      {/* Hero Section */}
      <section className="relative min-h-[92vh] flex items-center overflow-hidden pt-32 pb-32">
        <div className="absolute inset-0 z-0">
          <img 
            src="/AI-DEGITAL-WALLPAPER.jpeg" 
            alt="SentinelFi Core Background" 
            className="w-full h-full object-cover opacity-50"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-brand-dark/95 via-brand-dark/85 to-brand-dark" />
          <div className="absolute inset-0 bg-brand-primary/10 mix-blend-overlay" />
        </div>

        <div className="container mx-auto px-6 relative z-10 text-center">
          <p className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-brand-primary/30 bg-brand-primary/10 text-brand-primary text-xs font-bold uppercase mb-8">
            <span className="w-2 h-2 rounded-full bg-brand-primary animate-pulse" aria-hidden />
            {POSITIONING.eyebrow} Financial control tower for capital projects
          </p>

          <h1 className="text-5xl md:text-7xl lg:text-8xl font-black m-heading mb-8 leading-[1.02] tracking-tighter">
            <span className="block text-white drop-shadow-[0_2px_18px_rgba(0,0,0,0.6)]">{headline.headlineA}</span>
            <span className="block gradient-text">{headline.headlineB}</span>
          </h1>

          <p className="text-lg md:text-xl text-slate-200/90 max-w-3xl mx-auto mb-10 leading-relaxed font-medium drop-shadow-[0_1px_10px_rgba(0,0,0,0.6)]">
            {POSITIONING.subhead}
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-6">
            <Link href={MARKETING_ACTIONS.primary.href} onClick={trackCta('hero-start-trial', MARKETING_ACTIONS.primary.href)} data-cta="hero-start-trial" className="m-button-primary text-lg px-10 py-5 w-full sm:w-auto justify-center">
              {MARKETING_ACTIONS.primary.label} <ArrowRight className="w-5 h-5 ml-2" aria-hidden />
            </Link>
            <Link href={MARKETING_ACTIONS.secondary.href} onClick={trackCta('hero-live-tour', MARKETING_ACTIONS.secondary.href)} data-cta="hero-live-tour" className="inline-flex w-full sm:w-auto min-h-[56px] items-center justify-center gap-2 rounded-full border border-white/20 px-10 text-lg font-bold text-white transition-colors hover:border-brand-primary/60 hover:text-brand-primary">
              <Play className="w-5 h-5" aria-hidden /> {MARKETING_ACTIONS.secondary.label}
            </Link>
          </div>
          <p className="text-sm text-slate-400 font-semibold mb-12">{POSITIONING.proofLine}</p>

          {/* Curiosity hook — concrete AI catch, not abstract claims */}
          <div className="mx-auto max-w-3xl rounded-2xl border border-white/10 bg-brand-darker/80 backdrop-blur-xl p-5 text-left" role="status" aria-label="Live example of an AI fraud catch">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <p className="text-xs font-bold uppercase text-slate-400">Live catch · Sentinel-AI forensics</p>
              <p className="text-xs font-mono text-brand-primary">confidence 98.2%</p>
            </div>
            <p className="mt-3 text-base md:text-lg text-white font-semibold leading-relaxed">
              Duplicate invoice <span className="font-mono text-alert-warning">INV-8841</span> quarantined — same vendor, same amount, 6 days apart.
              <span className="text-slate-300"> Payment held before money moved.</span>
            </p>
            <Link href="/landing/features#ai" onClick={trackCta('hero-ai-catch', '/landing/features#ai')} data-cta="hero-ai-catch" className="mt-3 inline-flex items-center gap-1 text-sm font-bold text-brand-primary hover:underline">
              How the AI catch works <ChevronRight className="w-4 h-4" aria-hidden />
            </Link>
          </div>
        </div>
      </section>

      {/* New-here orientation — answers "what is this, how do I explore it" in 60s */}
      <section aria-label="How to explore SentinelFi" className="relative border-y border-white/5 bg-white/[0.02]">
        <div className="container mx-auto px-6 py-16">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-10">
            <div>
              <p className="text-xs font-bold uppercase text-brand-primary mb-3">New here? Start here - 60 seconds</p>
              <h2 className="text-3xl md:text-4xl font-black m-heading text-white tracking-tight">What SentinelFi is, in three steps.</h2>
            </div>
            <Link href={MARKETING_ACTIONS.secondary.href} onClick={trackCta('orientation-tour', MARKETING_ACTIONS.secondary.href)} data-cta="orientation-tour" className="inline-flex items-center gap-1 text-sm font-bold text-slate-300 hover:text-brand-primary transition-colors">
              Open the full interactive tour <ArrowRight className="w-4 h-4" aria-hidden />
            </Link>
          </div>
          <ol className="grid grid-cols-1 md:grid-cols-3 gap-6" role="list">
            {EXPLORE_STEPS.map((s) => (
              <li key={s.step} className="glass-card p-8 flex flex-col">
                <span className="font-mono text-sm font-bold text-brand-primary mb-4">{s.step}</span>
                <h3 className="text-xl font-black m-heading text-white mb-3">{s.title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed mb-6 flex-1">{s.body}</p>
                <Link href={s.href} onClick={trackCta(`orientation-${s.step}`, typeof s.href === 'string' ? s.href : '/')} data-cta={`orientation-${s.step}`} className="inline-flex items-center gap-1 text-sm font-bold text-brand-primary hover:underline">
                  {s.cta} <ArrowRight className="w-4 h-4" aria-hidden />
                </Link>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Hero Dashboard Mockup - CSS-built, no broken file paths */}
      <section className="pb-24 -mt-20 relative z-20">
        <div className="container mx-auto px-6">
          <div className="glass-card p-3 max-w-6xl mx-auto overflow-hidden shadow-2xl shadow-black/50 border-white/10">
            <div className="rounded-xl bg-brand-darker/80 backdrop-blur-sm overflow-hidden relative">
              <div className="flex items-center gap-2 px-6 py-4 border-b border-white/5">
                <div className="w-3 h-3 rounded-full bg-red-500/60" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
                <div className="w-3 h-3 rounded-full bg-green-500/60" />
                <div className="ml-6 flex-1 max-w-md bg-white/5 border border-white/10 rounded-lg px-4 py-1.5 text-xs text-slate-400 font-mono">
                  app.sentinelfi.io Â· sovereign workspace console
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 p-6 lg:p-10">
                {/* Left KPI column */}
                <div className="md:col-span-4 space-y-4">
                  <div className="p-6 bg-white/5 border border-white/10 rounded-2xl">
                    <p className="text-[10px] text-brand-primary font-black uppercase tracking-widest mb-2">Total Project Revenue</p>
                    <p className="text-3xl font-black font-mono text-white">$1.24B</p>
                    <p className="text-[10px] text-alert-positive font-bold mt-1">â-² 8.2% vs prior quarter</p>
                  </div>
                  <div className="p-6 bg-white/5 border border-white/10 rounded-2xl">
                    <p className="text-[10px] text-alert-critical font-black uppercase tracking-widest mb-2">Global Variance</p>
                    <p className="text-3xl font-black font-mono text-alert-critical">-2.4%</p>
                    <p className="text-[10px] text-slate-400 font-bold mt-1">3 projects flagged, 1 critical</p>
                  </div>
                  <div className="p-6 bg-white/5 border border-white/10 rounded-2xl">
                    <p className="text-[10px] text-brand-secondary font-black uppercase tracking-widest mb-2">Sentinel-AI Scans</p>
                    <p className="text-3xl font-black font-mono text-white">1,284,091</p>
                    <p className="text-[10px] text-slate-400 font-bold mt-1">2 anomalies quarantined today</p>
                  </div>
                </div>

                {/* Right chart column */}
                <div className="md:col-span-8 space-y-4">
                  <div className="p-6 bg-white/5 border border-white/10 rounded-2xl">
                    <div className="flex items-center justify-between mb-6">
                      <p className="text-xs font-black text-slate-300 uppercase tracking-widest">WBS Variance Heatmap â€” Project S7</p>
                      <span className="text-[10px] bg-brand-primary/20 text-brand-primary px-3 py-1 rounded-full font-black border border-brand-primary/30">TRACKING NOMINAL</span>
                    </div>
                    <div className="flex items-end gap-2 h-32">
                      {[40, 70, 45, 90, 65, 80, 50, 60, 75, 55, 88, 62].map((h, i) => (
                        <div key={i} className="flex-1 bg-brand-primary/60 rounded-md transition-all" style={{ height: `${h}%` }} />
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-6 bg-white/5 border border-white/10 rounded-2xl flex items-center gap-4">
                      <div className="p-3 bg-alert-critical/15 border border-alert-critical/25 rounded-xl">
                        <ShieldCheck className="w-6 h-6 text-alert-critical" />
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400 uppercase tracking-widest font-black">Duplicate Invoice</p>
                        <p className="text-sm font-black text-white">#92-K vs #91-J Â· 98.4%</p>
                        <p className="text-[10px] text-alert-critical font-bold">QUARANTINED BY SENTINEL-AI</p>
                      </div>
                    </div>
                    <div className="p-6 bg-white/5 border border-white/10 rounded-2xl flex items-center gap-4">
                      <div className="p-3 bg-brand-primary/15 border border-brand-primary/25 rounded-xl">
                        <Users className="w-6 h-6 text-brand-primary" />
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400 uppercase tracking-widest font-black">Tenant Isolation</p>
                        <p className="text-sm font-black text-white">Sovereign RDS Schema</p>
                        <p className="text-[10px] text-brand-primary font-bold">PHYSICAL SEPARATION ACTIVE</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive Workbench - High Contrast Section */}
      <section className="py-32 bg-brand-dark relative overflow-hidden ring-1 ring-white/5 shadow-inner">
        <div className="absolute top-0 left-0 w-full h-px bg-white/5" />
        <div className="container mx-auto px-6">
          <div className="text-center mb-20 max-w-3xl mx-auto">
            <h2 className="text-5xl md:text-6xl font-black m-heading mb-6 tracking-tight text-white">Unified <span className="gradient-text">Strategic Control</span></h2>
            <p className="text-xl text-slate-300 leading-relaxed">A single data stream, optimized for every stakeholder. Precision insights delivered at scale.</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-center">
            {/* Sidebar Toggle */}
            <div className="lg:col-span-4 space-y-6">
              {roles.map((role) => (
                <button
                  key={role.id}
                  onClick={() => setActiveRole(role.id)}
                  className={`w-full text-left p-8 rounded-3xl border transition-all duration-500 flex items-start gap-6 group ${
                    activeRole === role.id 
                    ? 'bg-brand-primary/10 border-brand-primary/40 shadow-xl shadow-brand-primary/5' 
                    : 'bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/20'
                  }`}
                >
                  <div className={`p-4 rounded-2xl transition-all duration-500 ${
                    activeRole === role.id 
                    ? 'bg-brand-primary text-brand-dark scale-110' 
                    : 'bg-slate-800 text-slate-400 group-hover:text-slate-200'
                  }`}>
                    {React.cloneElement(role.icon as React.ReactElement, { className: 'w-7 h-7' })}
                  </div>
                  <div>
                    <h4 className={`text-xl font-black tracking-tight ${activeRole === role.id ? 'text-white' : 'text-slate-200'}`}>{role.label}</h4>
                    <p className="text-sm text-slate-400 mt-2 leading-relaxed">{role.desc}</p>
                  </div>
                </button>
              ))}
            </div>

            {/* Display Area - Glass Canvas */}
            <div className="lg:col-span-8 glass-card border-white/10 rounded-[2.5rem] p-12 min-h-[500px] relative shadow-2xl bg-brand-dark/40 backdrop-blur-3xl overflow-hidden">
              <div className="absolute top-6 left-10 flex gap-2">
                <div className="w-3.5 h-3.5 rounded-full bg-red-500/30" />
                <div className="w-3.5 h-3.5 rounded-full bg-yellow-500/30" />
                <div className="w-3.5 h-3.5 rounded-full bg-green-500/30" />
              </div>

              <div className="mt-16 animate-in fade-in slide-in-from-right-8 duration-700">
                {activeRole === 'CEO' && (
                  <div className="space-y-10">
                    <div className="grid grid-cols-2 gap-8">
                       <div className="p-8 bg-white/5 border border-white/5 rounded-3xl hover:bg-white/10 transition-colors">
                          <p className="text-xs text-brand-primary font-black uppercase mb-2 tracking-widest">Total Project Revenue</p>
                          <h3 className="text-4xl font-black font-mono text-white">$1.24B</h3>
                       </div>
                       <div className="p-8 bg-white/5 border border-white/5 rounded-3xl hover:bg-white/10 transition-colors">
                          <p className="text-xs text-alert-critical font-black uppercase mb-2 tracking-widest">Global Churn Rate</p>
                          <h3 className="text-4xl font-black font-mono text-alert-critical">0.24%</h3>
                       </div>
                    </div>
                    <div className="h-64 bg-white/5 rounded-3xl border border-white/5 p-8 flex items-end gap-3 group">
                       {[40, 70, 45, 90, 65, 80, 50, 60, 75, 55].map((h, i) => (
                         <div 
                           key={i} 
                           className="flex-1 bg-brand-primary/20 hover:bg-brand-primary/60 rounded-xl transition-all duration-500 cursor-pointer" 
                           style={{ height: `${h}%` }} 
                         />
                       ))}
                    </div>
                  </div>
                )}
                {activeRole === 'PM' && (
                  <div className="space-y-6">
                    <div className="flex justify-between items-center mb-8">
                      <h3 className="text-2xl font-black text-white">Project S7: Phase 4 Implementation</h3>
                      <span className="text-xs bg-brand-primary/20 text-brand-primary px-4 py-1.5 rounded-full font-black border border-brand-primary/30">TRACKING NOMINAL</span>
                    </div>
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="p-6 bg-white/5 hover:bg-white/10 border border-white/5 rounded-2xl flex justify-between items-center transition-all group">
                        <div className="flex items-center gap-4">
                           <div className="p-2 bg-brand-secondary/20 rounded-lg group-hover:scale-110 transition-transform">
                             <Database className="w-5 h-5 text-brand-secondary" />
                           </div>
                           <span className="text-lg font-bold text-slate-200">4.{i} Infrastructure Deployment Protocol</span>
                        </div>
                        <span className={`text-xs font-black px-4 py-1.5 rounded-lg bg-brand-primary/10 text-brand-primary border border-brand-primary/20`}>85% COMPLETE</span>
                      </div>
                    ))}
                  </div>
                )}
                {activeRole === 'AUDIT' && (
                  <div className="space-y-6">
                    <div className="flex justify-between items-center mb-10">
                       <h3 className="text-2xl font-black text-white">Transaction Anomaly Monitor</h3>
                       <div className="flex items-center gap-2 px-4 py-2 bg-red-500/10 text-red-500 text-xs font-black rounded-full border border-red-500/20">
                         <div className="w-2 h-2 bg-red-500 rounded-full animate-ping" />
                         LIVE ANALYSIS ACTIVE
                       </div>
                    </div>
                    <div className="space-y-4">
                       <div className="p-6 bg-red-900/10 border border-red-900/40 rounded-2xl flex justify-between items-center">
                          <div className="space-y-1">
                            <span className="text-xs text-red-400 font-mono tracking-tighter uppercase">Incident Tag: TX_ID_99x24k</span>
                            <p className="text-lg font-black text-white">DUPLICATE REQUISITION DETECTED</p>
                          </div>
                          <Link href="/reporting" className="text-sm font-black text-red-400 hover:text-red-300 transition-colors border-b border-red-400/30">QUARANTINE</Link>
                       </div>
                       {[1, 2].map(i => (
                        <div key={i} className="p-6 bg-white/5 border border-white/5 rounded-2xl flex justify-between items-center opacity-60 hover:opacity-100 transition-opacity">
                            <span className="text-sm font-mono text-slate-300">TX_ID: 99x24-V{i}</span>
                            <span className="text-sm text-green-500 font-black tracking-widest uppercase">VERIFIED SECURE</span>
                        </div>
                       ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* One Platform. Every Module. */}
      <section className="py-32 bg-brand-dark/40 border-y border-white/5">
        <div className="container mx-auto px-6">
          <div className="text-center mb-20 max-w-3xl mx-auto">
            <p className="text-xs font-black uppercase tracking-[0.4em] text-brand-primary mb-4">Full Platform Coverage</p>
            <h2 className="text-5xl md:text-6xl font-black m-heading mb-6 tracking-tight text-white">One Platform. <span className="gradient-text">Every Module.</span></h2>
            <p className="text-lg text-slate-300 leading-relaxed">
              SentinelFi is an end-to-end project finance operating system â€” not a point solution. 
              Every feature connects to a live workflow inside your sovereign workspace.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {modules.map((m) => (
              <Link key={m.title} href={m.href} className="group">
                <div className="glass-card p-8 h-full hover:-translate-y-2">
                  <div className={`w-14 h-14 ${m.bg} rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                    <div className={m.color}>{m.icon}</div>
                  </div>
                  <h4 className="text-xl font-black m-heading text-white mb-3">{m.title}</h4>
                  <p className="text-slate-400 leading-relaxed text-sm">{m.desc}</p>
                  <p className="mt-6 text-xs font-black uppercase tracking-widest text-brand-primary flex items-center gap-2">
                    Explore module <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Business Layer: Billing, Subscriptions, Payments, Email */}
      <section className="py-32 bg-brand-dark relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-px bg-white/5" />
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-center mb-20">
            <div className="lg:col-span-5">
              <p className="text-xs font-black uppercase tracking-[0.4em] text-brand-secondary mb-4">The Business Layer</p>
              <h2 className="text-4xl md:text-6xl font-black m-heading mb-6 tracking-tight text-white">
                Subscriptions, Payments & <span className="gradient-text-purple">Email</span> â€” Explained.
              </h2>
              <p className="text-lg text-slate-300 leading-relaxed mb-8">
                From your first magic-link to automated renewal, the entire commercial lifecycle 
                is transparent, automated, and sovereign.
              </p>
              <Link href="/landing/pricing" className="m-button-primary text-lg">
                View Pricing & Plans <ArrowRight className="w-5 h-5" />
              </Link>
            </div>

            <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-8">
              {businessModules.map((m) => (
                <Link key={m.title} href={m.href} className="group">
                  <div className="glass-card p-8 h-full hover:-translate-y-2">
                    <div className="flex items-center justify-between mb-6">
                      <div className={`w-12 h-12 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center ${m.color} group-hover:scale-110 transition-transform`}>
                        {m.icon}
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">{m.label}</span>
                    </div>
                    <h4 className="text-lg font-black m-heading text-white mb-3">{m.title}</h4>
                    <p className="text-sm text-slate-400 leading-relaxed">{m.desc}</p>
                    <p className="mt-6 text-xs font-black uppercase tracking-widest text-brand-secondary flex items-center gap-2">
                      Learn more <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* The Ecosystem Features - Distinct alternating background */}
      <section id="features" className="py-32 bg-brand-dark/40 border-y border-white/5">
        <div className="container mx-auto px-6">
          <div className="text-center mb-24">
            <h2 className="text-5xl md:text-6xl font-black m-heading mb-6 tracking-tighter text-white">Precision <span className="gradient-text">Engineering</span></h2>
            <p className="text-xl text-slate-300 max-w-2xl mx-auto">High-fidelity components built for mission-critical financial oversight. Zero ambiguity, total control.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
            <FeatureCard 
              icon={<Cpu className="text-brand-primary" />} 
              title="AI-Assurance Engine" 
              desc="Predictive risk modeling that flags financial anomalies before they reach the ledger. Proactive protection for every transaction."
            />
            <FeatureCard 
              icon={<BarChart3 className="text-alert-critical" />} 
              title="Sovereign Multi-Tenancy" 
              desc="Physical schema isolation for every instance. Your data never crosses the wire, ensuring enterprise-grade jurisdictional compliance."
            />
            <FeatureCard 
              icon={<ShieldCheck className="text-brand-secondary" />} 
              title="WBS Governance" 
              desc="Enforce rigid work breakdown structures across multi-billion dollar project portfolios. Absolute structural integrity for every line item."
            />
            <FeatureCard 
              icon={<CheckCircle2 className="text-brand-primary" />} 
              title="Approval Workflows" 
              desc="Document-to-form conversions, role-based approval chains, and unbroken audit trails for every requisition, budget, and expense."
            />
            <FeatureCard 
              icon={<CreditCard className="text-brand-secondary" />} 
              title="Secure Billing & Payments" 
              desc="Paystack and PayPal powered subscription billing. Invoices, receipts, and renewal enforcement â€” all automated."
            />
            <FeatureCard 
              icon={<Mail className="text-alert-positive" />} 
              title="Email & Magic Link Access" 
              desc="Passwordless onboarding and transactional alerts. Teams are operational within minutes, with every event delivered to the right inbox."
            />
          </div>
        </div>
      </section>

      {/* Brand Identity & Ownership Section */}
      <section className="py-24 bg-brand-dark relative z-10 border-y border-white/5">
        <div className="container mx-auto px-6">
          <div className="flex flex-col lg:flex-row items-center gap-16">
            <div className="lg:w-1/3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-brand-primary/30 bg-brand-primary/10 text-brand-primary text-xs font-mono mb-6 uppercase tracking-widest">
                <ShieldCheck className="w-3 h-3" /> SentinelFiÂ® Heritage
              </div>
              <h2 className="text-4xl md:text-5xl font-black m-heading mb-6 tracking-tight text-white">Backed by Industry Leaders</h2>
              <p className="text-lg text-slate-300 leading-relaxed">
                SentinelFiÂ® was forged from real-world engineering and energy sector challenges. We built the platform we needed to secure our own billion-dollar portfolios.
              </p>
            </div>
            
            <div className="lg:w-2/3 grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
              <div className="glass-card p-8 border border-white/10 rounded-3xl bg-white/5 hover:bg-white/10 transition-colors group relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-brand-primary/20 blur-3xl -mr-10 -mt-10 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                <h4 className="text-xs font-black uppercase tracking-widest text-brand-primary mb-4">Built & Owned By</h4>
                <div className="text-2xl font-black text-white m-heading mb-4">Seancrystal Global Services Limited</div>
                <p className="text-slate-400 text-sm leading-relaxed">
                  The primary architect and registered owner of the SentinelFiÂ® platform. Driving digital transformation in capital project governance and financial security.
                </p>
              </div>

              <div className="glass-card p-8 border border-white/10 rounded-3xl bg-white/5 hover:bg-white/10 transition-colors group relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-alert-critical/20 blur-3xl -mr-10 -mt-10 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                <h4 className="text-xs font-black uppercase tracking-widest text-alert-critical mb-4">Funded By</h4>
                <div className="text-2xl font-black text-white m-heading mb-4">Solution Energy & Engineering Services</div>
                <p className="text-slate-400 text-sm leading-relaxed">
                  The strategic financial partner powering SentinelFi&apos;s rapid development. Leaders in global energy infrastructure and large-scale engineering operations.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA - High Impact */}
      <section className="py-40 relative overflow-hidden bg-brand-dark">
        <div className="hero-glow !bg-brand-primary/10 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[1000px]" />
        <div className="container mx-auto px-6 relative z-10 text-center">
          <h2 className="text-6xl md:text-8xl font-black m-heading mb-10 tracking-tighter leading-none text-white">
            Ready for the <span className="gradient-text">Future?</span>
          </h2>
          <p className="text-2xl text-slate-300 max-w-2xl mx-auto mb-16 font-medium leading-relaxed">
            Join the enterprise elite. Deploy your sovereign instance of SentinelFi in under 5 minutes. Initial setup is just a click away.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-8">
            <Link href="/landing/pricing" className="m-button-primary text-2xl px-16 py-8">
              Initialize Setup <ArrowRight className="w-8 h-8 ml-2" />
            </Link>
          </div>
        </div>
      </section>
    </>
  );
};

const FeatureCard = ({ icon, title, desc }: { icon: React.ReactNode, title: string, desc: string }) => (
  <div className="glass-card hover:bg-white/5 border-white/5 p-12 group transition-all duration-500 hover:-translate-y-2">
    <div className="w-16 h-16 bg-white/5 rounded-[2rem] flex items-center justify-center mb-10 group-hover:bg-brand-primary/20 transition-all duration-500 group-hover:rotate-12">
      {React.cloneElement(icon as React.ReactElement, { className: 'w-10 h-10 transition-transform group-hover:scale-110' })}
    </div>
    <h4 className="text-2xl font-black mb-6 m-heading text-white">{title}</h4>
    <p className="text-slate-400 leading-relaxed text-lg">{desc}</p>
  </div>
);

// Standard getLayout pattern to resolve header duplication
LandingPage.getLayout = (page: React.ReactNode) => {
  return <MarketingLayout>{page}</MarketingLayout>;
};

export default LandingPage;