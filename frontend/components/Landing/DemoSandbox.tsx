// Interactive demo sandbox for marketing visitors — a clickable, fake-data
// replica of the SentinelFi workspace driven by deterministic fixtures from
// demoSandbox.ts. No backend, no auth, no PII. Each role runs a 3-step
// scripted scenario with auto-play; steps and completions are tracked via
// the marketing analytics bus (marketing.demo_step / demo_complete).

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight, Check, ChevronDown, CircleDot, Play, RotateCcw,
  ShieldAlert, ShieldCheck, TrendingDown, TrendingUp,
} from 'lucide-react';
import {
  DEMO_AUDIT_TRAIL, DEMO_FORENSICS, DEMO_PORTFOLIO, DEMO_ROLE_META,
  DEMO_SCENARIOS, DEMO_WBS_TREE, type DemoRole, type WbsNode,
} from './demoSandboxData';
import { trackMarketingEvent } from './marketingAnalytics';

function riskColor(risk: string): string {
  if (risk === 'over') return 'text-red-400';
  if (risk === 'under') return 'text-brand-primary';
  return 'text-m-accent';
}

const KpisPanel: React.FC<{ active: boolean }> = ({ active }) => (
  <div data-panel="kpis" className={`rounded-xl border p-4 transition-all ${active ? 'border-brand-primary/70 bg-brand-primary/5' : 'border-white/10'}`}>
    <p className="mb-3 text-[10px] font-bold uppercase text-slate-500">{DEMO_PORTFOLIO.tenant}</p>
    <div className="mb-3 grid grid-cols-2 gap-3">
      <div className="rounded-lg border border-white/10 bg-white/5 p-3">
        <p className="mb-1 text-[10px] uppercase text-slate-500">Portfolio Variance</p>
        <p className="flex items-center gap-1 text-2xl font-black text-red-400">
          <TrendingDown className="h-4 w-4" /> {DEMO_PORTFOLIO.variancePct}%
        </p>
      </div>
      <div className="rounded-lg border border-white/10 bg-white/5 p-3">
        <p className="mb-1 text-[10px] uppercase text-slate-500">Efficiency Index</p>
        <p className="flex items-center gap-1 text-2xl font-black text-m-accent">
          <TrendingUp className="h-4 w-4" /> {DEMO_PORTFOLIO.efficiencyIndex}
        </p>
      </div>
    </div>
    <ul className="space-y-2">
      {DEMO_PORTFOLIO.projects.map((p) => (
        <li key={p.name} className="flex items-center justify-between gap-2 rounded-lg bg-white/5 px-3 py-2">
          <span className="truncate text-xs font-semibold text-slate-200">{p.name}</span>
          <span className={`shrink-0 font-mono text-xs font-bold ${riskColor(p.risk)}`}>
            ₦{p.spendM}M / ₦{p.budgetM}M
          </span>
        </li>
      ))}
    </ul>
  </div>
);

const WbsRow: React.FC<{ node: WbsNode; depth: number; active: boolean }> = ({ node, depth, active }) => {
  const [open, setOpen] = useState(depth === 0);
  const over = node.spend > node.budget;
  const spotlighted = active && depth === 0 && node.code === '3.0';
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-left transition-colors hover:bg-white/5 ${spotlighted ? 'border-brand-primary/70 bg-brand-primary/5' : 'border-transparent'}`}
        aria-expanded={open}
      >
        {node.children ? (
          <ChevronDown className={`h-3.5 w-3.5 shrink-0 text-slate-500 transition-transform ${open ? '' : '-rotate-90'}`} aria-hidden />
        ) : (
          <CircleDot className="h-3 w-3 shrink-0 text-slate-600" aria-hidden />
        )}
        <span className="w-8 shrink-0 font-mono text-[10px] text-slate-500">{node.code}</span>
        <span className="min-w-0 flex-1 truncate text-xs font-semibold text-slate-200">{node.name}</span>
        <span className={`shrink-0 font-mono text-[10px] font-bold ${over ? 'text-red-400' : 'text-m-accent'}`}>
          {over ? 'OVER' : 'OK'}
        </span>
      </button>
      {open && node.children?.map((c) => <WbsRow key={c.code} node={c} depth={depth + 1} active={active} />)}
    </div>
  );
};

const WbsPanel: React.FC<{ active: boolean }> = ({ active }) => (
  <div data-panel="wbs" className={`rounded-xl border p-3 transition-all ${active ? 'border-brand-primary/70 bg-brand-primary/5' : 'border-white/10'}`}>
    <p className="px-1 pb-2 text-[10px] font-bold uppercase text-slate-500">Work Breakdown · Pipeline Phase II</p>
    {DEMO_WBS_TREE.map((n) => <WbsRow key={n.code} node={n} depth={0} active={active} />)}
    <p className="px-1 pt-2 text-[10px] text-slate-600">Budgets roll up to parents automatically — try expanding a package.</p>
  </div>
);

const ForensicsPanel: React.FC<{ active: boolean }> = ({ active }) => (
  <div data-panel="forensics" className={`rounded-xl border p-4 transition-all ${active ? 'border-brand-primary/70 bg-brand-primary/5' : 'border-white/10'}`}>
    <p className="mb-3 flex items-center gap-2 text-[10px] font-bold uppercase text-slate-500">
      <ShieldAlert className="h-3.5 w-3.5 text-amber-400" /> Quarantine queue · {DEMO_FORENSICS.length} held
    </p>
    <ul className="space-y-2">
      {DEMO_FORENSICS.map((f) => (
        <li key={f.id} className="rounded-lg border border-amber-400/20 bg-amber-400/5 p-3">
          <div className="flex items-center justify-between gap-2">
            <span className="font-mono text-xs font-bold text-amber-300">{f.invoice}</span>
            <span className="font-mono text-[10px] text-slate-400">conf {f.confidence}%</span>
          </div>
          <p className="mt-1 text-xs text-slate-300">{f.reason} · {f.vendor} · ₦{f.amountM}M</p>
          <p className="mt-1 text-[10px] leading-relaxed text-slate-500">{f.detail}</p>
        </li>
      ))}
    </ul>
  </div>
);

const AuditPanel: React.FC<{ active: boolean }> = ({ active }) => (
  <div data-panel="audit" className={`rounded-xl border p-4 transition-all ${active ? 'border-brand-primary/70 bg-brand-primary/5' : 'border-white/10'}`}>
    <p className="mb-3 flex items-center gap-2 text-[10px] font-bold uppercase text-slate-500">
      <ShieldCheck className="h-3.5 w-3.5 text-m-accent" /> Tamper-evident trail · today
    </p>
    <ol className="space-y-2">
      {DEMO_AUDIT_TRAIL.map((e) => (
        <li key={e.id} className="flex gap-2 text-[11px]">
          <span className="shrink-0 font-mono text-slate-600">{e.at}</span>
          <span className="text-slate-300"><span className="font-semibold text-white">{e.actor}</span> — {e.action}{e.confidence ? ` (conf ${e.confidence}%)` : ''}</span>
        </li>
      ))}
    </ol>
  </div>
);

export const DemoSandbox: React.FC = () => {
  const [role, setRole] = useState<DemoRole>('CEO');
  const [stepIdx, setStepIdx] = useState(0);
  const [done, setDone] = useState(false);
  const [autoPlay, setAutoPlay] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const steps = DEMO_SCENARIOS[role];
  const step = steps[Math.min(stepIdx, steps.length - 1)];

  const advance = useCallback(() => {
    setStepIdx((i) => {
      const next = i + 1;
      if (next >= steps.length) {
        setDone(true);
        setAutoPlay(false);
        trackMarketingEvent('marketing.demo_complete', { label: `scenario-${role}` });
        return i;
      }
      trackMarketingEvent('marketing.demo_step', { label: steps[next].id });
      return next;
    });
  }, [role, steps]);

  const reset = useCallback((r: DemoRole) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setRole(r);
    setStepIdx(0);
    setDone(false);
    setAutoPlay(false);
    trackMarketingEvent('marketing.demo_step', { label: `start-${r}` });
  }, []);

  // Auto-play: advance every 3.2s while enabled.
  useEffect(() => {
    if (!autoPlay || done) return;
    timerRef.current = setTimeout(advance, 3200);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [autoPlay, done, advance, stepIdx]);

  return (
    <div className="glass-card overflow-hidden">
      {/* Browser chrome */}
      <div className="flex items-center gap-2 border-b border-white/10 bg-brand-darker px-4 py-2.5">
        <span className="h-2.5 w-2.5 rounded-full bg-red-400/60" aria-hidden />
        <span className="h-2.5 w-2.5 rounded-full bg-amber-400/60" aria-hidden />
        <span className="h-2.5 w-2.5 rounded-full bg-green-400/60" aria-hidden />
        <span className="ml-3 truncate rounded bg-white/5 px-3 py-1 font-mono text-[10px] text-slate-500">
          app.sentinelfi.com/demo — sandbox · sample data · read-only
        </span>
      </div>

      {/* Role switcher */}
      <div className="flex flex-wrap items-center gap-2 border-b border-white/5 px-4 py-3">
        {(Object.keys(DEMO_ROLE_META) as DemoRole[]).map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => reset(r)}
            className={`rounded-full px-4 py-1.5 text-xs font-bold transition-colors ${role === r ? 'bg-brand-primary text-white' : 'border border-white/10 text-slate-400 hover:text-white'}`}
            aria-pressed={role === r}
          >
            {DEMO_ROLE_META[r].label}
          </button>
        ))}
        <span className="ml-auto hidden text-[11px] text-slate-500 sm:block">{DEMO_ROLE_META[role].blurb}</span>
      </div>

      <div className="grid grid-cols-1 gap-4 p-4 lg:grid-cols-5">
        {/* Scenario rail */}
        <div className="lg:col-span-2">
          <p className="mb-3 text-[10px] font-bold uppercase text-slate-500">Guided scenario · {stepIdx + 1}/{steps.length}</p>
          <ol className="space-y-2">
            {steps.map((s, i) => (
              <li key={s.id} className={`rounded-lg border p-3 text-xs leading-relaxed transition-colors ${
                i === stepIdx && !done ? 'border-brand-primary/60 bg-brand-primary/10 text-white' : 'border-white/5 text-slate-500'
              }`}>
                {i === stepIdx && !done ? (
                  <>
                    <span className="mb-1 block font-bold">{s.instruction}</span>
                    {i > 0 && <span className="mb-1 block text-m-accent">{s.outcome ? '' : ''}{steps[i - 1].outcome}</span>}
                    <button type="button" onClick={advance} className="mt-1 inline-flex items-center gap-1 rounded bg-brand-primary px-2.5 py-1 text-[11px] font-bold text-white hover:bg-brand-primary/90">
                      Do it <ArrowRight className="h-3 w-3" aria-hidden />
                    </button>
                  </>
                ) : (
                  <span className="flex items-start gap-2">
                    {i < stepIdx || done ? <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-m-accent" aria-hidden /> : null}
                    <span>{i <= stepIdx || done ? s.outcome || s.instruction : s.instruction}</span>
                  </span>
                )}
              </li>
            ))}
          </ol>

          <div className="mt-4 flex flex-wrap gap-2">
            {!done && (
              <button type="button" onClick={() => setAutoPlay((v) => !v)} className="m-button-primary m-button-sm">
                <Play className="h-4 w-4" aria-hidden /> {autoPlay ? 'Pause tour' : 'Auto-play tour'}
              </button>
            )}
            <button
              type="button"
              onClick={() => reset(role)}
              className="inline-flex min-h-[36px] items-center gap-1.5 rounded-md border border-white/10 px-3 text-xs font-bold text-slate-300 transition-colors hover:text-white"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden /> Restart
            </button>
          </div>
          {done && (
            <div className="mt-4 rounded-lg border border-m-accent/30 bg-m-accent/10 p-3 text-xs text-slate-200">
              <p className="font-bold text-m-accent">Scenario complete.</p>
              <p className="mt-1 text-slate-400">That is one full governance loop — the same thing your team would do in the real workspace.</p>
              <Link href="/landing/pricing" className="mt-2 inline-flex items-center gap-1 font-bold text-brand-primary hover:underline">
                Start free trial <ArrowRight className="h-3.5 w-3.5" aria-hidden />
              </Link>
            </div>
          )}
        </div>

        {/* Live panels — KPIs always visible; others conditionally spotlighted */}
        <div className="space-y-3 lg:col-span-3">
          <KpisPanel active={step.panel === 'kpis' && !done} />
          {step.panel === 'wbs' || stepIdx >= 1 || done ? <WbsPanel active={step.panel === 'wbs' && !done} /> : null}
          {step.panel === 'forensics' || stepIdx >= 1 || done ? <ForensicsPanel active={step.panel === 'forensics' && !done} /> : null}
          {step.panel === 'audit' || stepIdx >= 2 || done ? <AuditPanel active={step.panel === 'audit' && !done} /> : null}
          <p className="text-center text-[10px] text-slate-600">All figures are sample data · sandbox is read-only</p>
        </div>
      </div>
    </div>
  );
};

export default DemoSandbox;