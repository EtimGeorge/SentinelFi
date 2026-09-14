import React from 'react';
import MarketingLayout from '../../components/Landing/MarketingLayout';
import Link from 'next/link';
import {
  ArrowRight, ShieldCheck, Zap, Cpu, BarChart3, Users, Lock, Globe, Database, CreditCard, Mail, Receipt, KeyRound, CheckCircle2, FileText, TrendingUp, Activity, PieChart, Crown,
} from 'lucide-react';
import { NextPage } from 'next';

type NextPageWithLayout = NextPage & {
  getLayout?: (page: React.ReactElement) => React.ReactNode;
};

interface ModuleCardProps {
  icon: React.ReactNode;
  color: string;
  title: string;
  desc: string;
  points: string[];
}

interface BusinessCardProps {
  icon: React.ReactNode;
  color: string;
  label: string;
  title: string;
  desc: string;
  points: string[];
  href: string;
}

const ModuleCard: React.FC<ModuleCardProps> = ({ icon, color, title, desc, points }) => (
  <div className="glass-card p-8 h-full">
    <div className="w-14 h-14 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center mb-6">
      <div className={color}>{icon}</div>
    </div>
    <h4 className="text-xl font-black m-heading text-white mb-3">{title}</h4>
    <p className="text-sm text-slate-400 leading-relaxed mb-6">{desc}</p>
    <ul className="space-y-2.5">
      {points.map((p) => (
        <li key={p} className="flex items-start gap-2.5 text-sm text-slate-300">
          <CheckCircle2 className={`w-4 h-4 mt-0.5 shrink-0 ${color}`} />
          {p}
        </li>
      ))}
    </ul>
  </div>
);

const BusinessCard: React.FC<BusinessCardProps> = ({ icon, color, label, title, desc, points, href }) => (
  <Link href={href} className="group block">
    <div className="glass-card p-8 h-full hover:-translate-y-2">
      <div className="flex items-center justify-between mb-6">
        <div className={`w-12 h-12 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center ${color} group-hover:scale-110 transition-transform`}>
          {icon}
        </div>
        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">{label}</span>
      </div>
      <h4 className="text-lg font-black m-heading text-white mb-3">{title}</h4>
      <p className="text-sm text-slate-400 leading-relaxed mb-5">{desc}</p>
      <ul className="space-y-2.5 mb-7">
        {points.map((p) => (
          <li key={p} className="flex items-start gap-2.5 text-sm text-slate-300">
            <CheckCircle2 className={`w-4 h-4 mt-0.5 shrink-0 ${color}`} />
            {p}
          </li>
        ))}
      </ul>
      <p className="text-xs font-black uppercase tracking-widest flex items-center gap-2" style={{ color: 'inherit' }}>
        <span className={color}>Learn more</span>
        <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" style={{ color: 'inherit' }} />
      </p>
    </div>
  </Link>
);

const FeaturesPage: NextPageWithLayout = () => {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden py-32">
        <div className="absolute inset-0 z-0">
          <img
            src="/AI-DEGITAL-WALLPAPER.jpeg"
            alt="SentinelFi Core Background"
            className="w-full h-full object-cover opacity-40"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-brand-dark/95 via-brand-dark/85 to-brand-dark" />
        </div>
        <div className="container mx-auto px-6 relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            <p className="text-xs font-black uppercase tracking-[0.4em] text-brand-primary mb-4">Complete Platform Catalogue</p>
            <h1 className="text-5xl md:text-7xl font-black m-heading mb-8 tracking-tighter text-white">
              Every Feature. <span className="gradient-text">Explained.</span>
            </h1>
            <p className="text-xl text-slate-300 leading-relaxed mx-auto max-w-2xl">
              From WBS enforcement to AI forensics, from your first magic-link email to automated 
              subscription billing, this is the entire SentinelFi operating system in one place.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-6 mt-10">
              <Link href="/landing/pricing" className="m-button-primary text-lg px-10 py-5">
                Try It Free for 14 Days <ArrowRight className="w-5 h-5" />
              </Link>
              <Link href="/landing/workflows" className="flex items-center gap-2 text-slate-300 font-bold hover:text-brand-primary transition-colors">
                See Role Workflows <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Quick anchor nav — sticky below the 72px fixed header (~56px tall bar) */}
      <section aria-label="Platform sections" className="border-b border-white/5 bg-brand-dark/60 backdrop-blur-md sticky top-[72px] z-30">
        <div className="container mx-auto px-6 py-4 flex flex-wrap justify-center gap-3 text-xs font-black uppercase tracking-widest">
          {[
            ['#capex', 'CAPEX & Revenue'],
            ['#opex', 'OPEX & Payroll'],
            ['#procurement', 'Procurement & P2P'],
            ['#approvals', 'Approvals'],
            ['#ai', 'AI Forensics'],
            ['#reporting', 'Reporting & Sovereignty'],
            ['#subscriptions', 'Subscriptions'],
            ['#payments', 'Payments'],
            ['#billing', 'Billing'],
            ['#email', 'Email & Notifications'],
          ].map(([href, label]) => (
            <a
              key={href}
              href={href}
              className="px-4 py-2 rounded-full bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:border-brand-primary/50 transition-all"
            >
              {label}
            </a>
          ))}
        </div>
      </section>

      {/* Financial Operations Modules — anchor ids verified: hero deep-links #ai and #approvals land here */}
      <section id="capex" className="py-24 container mx-auto px-6 scroll-mt-44">
        <div className="mb-14">
          <p className="text-xs font-black uppercase tracking-[0.35em] text-brand-primary mb-3">01 · Capital Projects</p>
          <h2 className="text-4xl md:text-5xl font-black m-heading text-white mb-4">CAPEX & Revenue Engine</h2>
          <p className="text-lg text-slate-400 max-w-2xl leading-relaxed">
            Multi-billion dollar infrastructure governed to the line item. Every peso, dollar, and naira traceable to a WBS node.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <ModuleCard
            icon={<Database className="w-7 h-7" />}
            color="text-brand-primary"
            title="WBS Structure & Budgets"
            desc="Rigid work-breakdown structures with locked baselines so scope creep is impossible by construction."
            points={['Baseline WBS templates for oil & gas, energy, construction', 'Locked budgets with change-control workflows', 'Draft → approval → live lifecycle with full history']}
          />
          <ModuleCard
            icon={<TrendingUp className="w-7 h-7" />}
            color="text-alert-critical"
            title="Live Cost Tracking"
            desc="Capital expenses attach directly to the correct budget node, with variance computed continuously."
            points={['Per-WBS expense logging with supporting documents', 'Real-time variance vs budget, at any depth', 'Foreign currency auto-conversion back to base currency']}
          />
          <ModuleCard
            icon={<PieChart className="w-7 h-7" />}
            color="text-brand-secondary"
            title="Income & Reconciliation"
            desc="Log revenue inflows against a project and reconcile them against committed capital."
            points={['Multi-currency inflows with receipts', 'Pending vs confirmed reconciliation queue', 'Committed / spent / remaining projections']}
          />
        </div>
      </section>

      <section id="opex" className="py-24 bg-brand-dark/40 border-y border-white/5 scroll-mt-40">
        <div className="container mx-auto px-6">
          <div className="mb-14">
            <p className="text-xs font-black uppercase tracking-[0.35em] text-alert-critical mb-3">02 · Operational Spend</p>
            <h2 className="text-4xl md:text-5xl font-black m-heading text-white mb-4">OPEX, Payroll & Recurring Costs</h2>
            <p className="text-lg text-slate-400 max-w-2xl leading-relaxed">
              Operational budgets, payroll batches, and recurring lines, the everyday money that must never drift from plan.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <ModuleCard
              icon={<FileText className="w-7 h-7" />}
              color="text-alert-critical"
              title="Operational Budgets"
              desc="Standalone operational budgets for departments, sites, and recurring corporate spend."
              points={['Annual operational budget cycles', 'Recurring cost lines with schedules', 'Department-level owners and reviewers']}
            />
            <ModuleCard
              icon={<Users className="w-7 h-7" />}
              color="text-brand-primary"
              title="Payroll & Headcount"
              desc="Employee records, monthly payroll batches, and per-line payroll approval."
              points={['Employee directory with roles & departments', 'Batch payroll run with per-employee lines', 'Payroll approval chain before commitment']}
            />
            <ModuleCard
              icon={<Zap className="w-7 h-7" />}
              color="text-brand-secondary"
              title="Expense Control"
              desc="Every operational expense flows through a governed, approvable pipeline."
              points={['Requisition → approval → payment tracking', 'Duplicate and policy-rule scanning', 'Vendor and contractor directories']}
            />
          </div>
        </div>
      </section>

      <section id="procurement" className="py-24 container mx-auto px-6 scroll-mt-40">
        <div className="mb-14">
          <p className="text-xs font-black uppercase tracking-[0.35em] text-brand-secondary mb-3">03 · Purchase-to-Pay</p>
          <h2 className="text-4xl md:text-5xl font-black m-heading text-white mb-4">Procurement & P2P</h2>
          <p className="text-lg text-slate-400 max-w-2xl leading-relaxed">
            The full purchase-to-pay lifecycle on a kanban canvas, from requisition to cleared payment.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <ModuleCard
            icon={<Receipt className="w-7 h-7" />}
            color="text-brand-secondary"
            title="Requisitions & Purchase Orders"
            desc="Structured requisitions that convert into enforceable purchase orders against budget nodes."
            points={['WBS-linked requisition line items', 'PO creation with three-way matching', 'Vendor invoicing with document attachment']}
          />
          <ModuleCard
            icon={<BarChart3 className="w-7 h-7" />}
            color="text-alert-critical"
            title="P2P Kanban Pipeline"
            desc="Drag work through Requested → Approved → Paid with full transparency."
            points={['Visual kanban for the entire pipeline', 'RFQ / Quotation comparison', 'Goods receipt confirmation']}
          />
          <ModuleCard
            icon={<ShieldCheck className="w-7 h-7" />}
            color="text-brand-primary"
            title="Payment Processing"
            desc="Verified invoices flow to payment with the audit trail saved for eternity."
            points={['Freeze-payment control on flagged invoices', 'Payment batch approval', 'Immutable payment records']}
          />
        </div>
      </section>

      <section id="approvals" className="py-24 bg-brand-dark/40 border-y border-white/5 scroll-mt-40">
        <div className="container mx-auto px-6">
          <div className="mb-14">
            <p className="text-xs font-black uppercase tracking-[0.35em] text-brand-primary mb-3">04 · Governance</p>
            <h2 className="text-4xl md:text-5xl font-black m-heading text-white mb-4">Approvals & Governance Workflows</h2>
            <p className="text-lg text-slate-400 max-w-2xl leading-relaxed">
              Define who approves what, and let SentinelFi enforce it on every document, budget, and expense.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <ModuleCard
              icon={<CheckCircle2 className="w-7 h-7" />}
              color="text-brand-primary"
              title="Document-to-Form Conversion"
              desc="Turn an attached document into a structured form in one flow, three steps."
              points={['Upload → Extract → Approve', 'AI-assisted field extraction', 'Full approval chain on conversion']}
            />
            <ModuleCard
              icon={<Lock className="w-7 h-7" />}
              color="text-alert-critical"
              title="Role-Based Chains"
              desc="Route approvals to the right role automatically. No chasing, no drift."
              points={['CEO / PM / Audit role routing', 'Multi-level sign-off on budgets & P2P', 'Escalation on stale approvals']}
            />
            <ModuleCard
              icon={<Activity className="w-7 h-7" />}
              color="text-brand-secondary"
              title="Immutable Audit Trail"
              desc="Every view, decision, and change is logged. Compliance-ready by default."
              points={['Timestamped action ledger per tenant', 'Who-changed-what on every entity', 'Exportable forensic reports']}
            />
          </div>
        </div>
      </section>

      <section id="ai" className="py-24 container mx-auto px-6 scroll-mt-40">
        <div className="mb-14">
          <p className="text-xs font-black uppercase tracking-[0.35em] text-brand-secondary mb-3">05 · Intelligence</p>
          <h2 className="text-4xl md:text-5xl font-black m-heading text-white mb-4">Sentinel-AI Forensics & Assistant</h2>
          <p className="text-lg text-slate-400 max-w-2xl leading-relaxed">
            An always-on financial intelligence layer that scans, flags, and explains, plus a chat assistant that works inside your workspace.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <ModuleCard
            icon={<Cpu className="w-7 h-7" />}
            color="text-brand-primary"
            title="Anomaly Detection"
            desc="Similarity matching over every transaction to surface duplicates and policy breaches."
            points={['Duplicate invoice similarity scoring', 'Vendor-pattern deviation flags', 'Quarantine & freeze controls']}
          />
          <ModuleCard
            icon={<BarChart3 className="w-7 h-7" />}
            color="text-alert-critical"
            title="Predictive Variance"
            desc="Forecast where budgets will land before they get there."
            points={['Projection models from historical burn', 'Anti-pattern early-warning feed', 'Risk heatmaps at portfolio depth']}
          />
          <ModuleCard
            icon={<Zap className="w-7 h-7" />}
            color="text-brand-secondary"
            title="AI Assistant (Chat)"
            desc="Ask questions and get answers grounded in your tenant data, with session memory."
            points={['Answers over your live project data', 'Proactive insight push cards', 'Chat panel on desktop, sheet on mobile']}
          />
        </div>
      </section>

      <section id="reporting" className="py-24 bg-brand-dark/40 border-y border-white/5 scroll-mt-40">
        <div className="container mx-auto px-6">
          <div className="mb-14">
            <p className="text-xs font-black uppercase tracking-[0.35em] text-brand-primary mb-3">06 · Visibility & Isolation</p>
            <h2 className="text-4xl md:text-5xl font-black m-heading text-white mb-4">Reporting & Tenant Sovereignty</h2>
            <p className="text-lg text-slate-400 max-w-2xl leading-relaxed">
              Deep reports for CFOs and physical isolation for compliance teams.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <ModuleCard
              icon={<PieChart className="w-7 h-7" />}
              color="text-brand-primary"
              title="CAPEX & OPEX Reports"
              desc="Variance, spend, budget vs actual and archived reporting in one console."
              points={['CAPEX variance by project & WBS', 'OPEX trends across departments', 'Forensic archive with point-in-time snapshots']}
            />
            <ModuleCard
              icon={<Database className="w-7 h-7" />}
              color="text-brand-secondary"
              title="Multi-Tenant Sovereignty"
              desc="Each customer gets a physically isolated schema; no cross-tenant data leakage."
              points={['Per-tenant PostgreSQL schema', 'Sovereign RDS instances for enterprise', 'Jurisdictional-grade isolation proofs']}
            />
            <ModuleCard
              icon={<Globe className="w-7 h-7" />}
              color="text-alert-critical"
              title="Multi-Currency Ledger"
              desc="NGN, USD, EUR, GBP and more, reconciled to your base reporting currency."
              points={['Live daily conversion rates', 'Base-currency reporting by design', 'Foreign transaction continuous reconciliation']}
            />
          </div>
        </div>
      </section>

      {/* Business Layer - Billing, Subscriptions, Payments, Email */}
      <section className="py-24 container mx-auto px-6 scroll-mt-40" id="subscriptions">
        <div className="text-center mb-16 max-w-3xl mx-auto">
          <p className="text-xs font-black uppercase tracking-[0.4em] text-brand-secondary mb-4">The Business Layer</p>
          <h2 className="text-4xl md:text-5xl font-black m-heading text-white mb-4">
            Billing, Subscriptions, <span className="gradient-text-purple">Payments & Email</span>
          </h2>
          <p className="text-lg text-slate-400 leading-relaxed">
            How SentinelFi is sold, billed, paid for, and how your team gets access, start to finish.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <BusinessCard
            icon={<KeyRound className="w-6 h-6" />}
            color="text-brand-primary"
            label="Commercial"
            title="Subscriptions & Plans"
            desc="A simple, transparent commercial model with a no-risk entry path."
            points={[
              '14-day free trial, full Professional access, no credit card',
              'One Professional plan: $1,500/mo or $15,300/yr (15% saved)',
              'Enterprise custom contracts with on-premise option',
              'Embargo on unpaid workspaces, renew instantly to restore access',
            ]}
            href="/landing/pricing"
          />
          <BusinessCard
            icon={<CreditCard className="w-6 h-6" />}
            color="text-brand-secondary"
            label="Commercial"
            title="Payments & Gateways"
            desc="Two trusted PCI-DSS gateways, zero card data stored on our servers."
            points={[
              'Paystack for Africa & Nigeria',
              'PayPal for international teams',
              'USD-denominated billing with live local-currency display',
              'Instant workspace provisioning on payment confirmation',
            ]}
            href="/landing/checkout?plan=professional&cycle=annual"
          />
          <BusinessCard
            icon={<Receipt className="w-6 h-6" />}
            color="text-alert-critical"
            label="Commercial"
            title="Billing & Invoicing"
            desc="Invoices, receipts, and renewal management inside your workspace."
            points={[
              'Downloadable PDF receipts on the success page',
              'Current period start/end tracking in the Billing console',
              'One-click renewal that returns you to the gateway',
              'Billing history surfaces as your record grows',
            ]}
            href="/settings/subscription"
          />
          <BusinessCard
            icon={<Mail className="w-6 h-6" />}
            color="text-alert-positive"
            label="Experience"
            title="Email & Access Delivery"
            desc="Passwordless by design, your inbox is the front door."
            points={[
              'Magic-link onboarding dispatched within 60 seconds',
              'Provisioning emails for paid and trial workspaces',
              'Transactional alerts: approvals, anomalies, subscription events',
              'SendGrid-powered SMTP with test-connectivity verification',
            ]}
            href="/auth/check-email?reason=trial"
          />
        </div>

        {/* Flow strip */}
        <div className="glass-card p-10 mt-12">
          <p className="text-xs font-black uppercase tracking-[0.35em] text-slate-500 mb-8">The Full Commercial Flow</p>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6 items-stretch">
            {[
              { step: '01', text: 'Pick a plan on Pricing' },
              { step: '02', text: 'Complete checkout with Paystack or PayPal' },
              { step: '03', text: 'Magic link arrives in your inbox within 60 seconds' },
              { step: '04', text: 'Build your sovereign workspace instantly' },
              { step: '05', text: 'Manage subscription & renewals in Billing' },
            ].map((f, i) => (
              <div key={f.step} className="relative flex flex-col gap-3">
                {i > 0 && <div className="hidden md:block absolute top-5 -left-3 w-6 h-px bg-brand-primary/40" />}
                <div className="w-10 h-10 rounded-full bg-brand-primary/10 border border-brand-primary/30 text-brand-primary font-black flex items-center justify-center font-mono">{f.step}</div>
                <p className="text-sm text-slate-300 leading-relaxed">{f.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-28 relative overflow-hidden bg-brand-dark border-t border-white/5">
        <div className="hero-glow top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[900px]" />
        <div className="container mx-auto px-6 relative z-10 text-center">
          <h2 className="text-5xl md:text-7xl font-black m-heading mb-8 tracking-tighter text-white">
            See it on your <span className="gradient-text">own books.</span>
          </h2>
          <p className="text-xl text-slate-300 max-w-2xl mx-auto mb-12 leading-relaxed">
            Every feature you just read is live in the workspaces we provision daily. Start your 14-day trial, no credit card, no email games.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-8">
            <Link href="/landing/pricing" className="m-button-primary text-xl px-12 py-6">
              Start Free Trial <ArrowRight className="w-6 h-6" />
            </Link>
            <Link href="/landing/testimonials" className="flex items-center gap-2 text-slate-300 font-bold hover:text-brand-primary transition-colors">
              <Crown className="w-5 h-5 text-yellow-500" /> See what operators say
            </Link>
          </div>
        </div>
      </section>
    </>
  );
};

FeaturesPage.getLayout = (page: React.ReactElement) => {
  return <MarketingLayout title="Features | SentinelFi - Complete Platform Catalogue">{page}</MarketingLayout>;
};

export default FeaturesPage;