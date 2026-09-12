import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import PageContainer from '../../../components/Layout/PageContainer';
import Card from '../../../components/common/Card';
import DataTable, { DataColumn, DataAction } from '../../../components/common/DataTable';
import { useFinanceCore } from '../../../hooks/useFinanceCore';
import { useAiAssistant } from '../../../hooks/useAiAssistant';
import { useCurrency } from '../../../components/context/CurrencyContext';
import {
  BarChart3,
  RefreshCw,
  Download,
  FileText,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Wallet,
  Target,
  ShoppingBag,
  Activity,
  Briefcase,
  Sparkles,
  ChevronDown,
  CircleDollarSign,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
  Line,
  Area,
} from 'recharts';
import toast from 'react-hot-toast';

// ─── Types (mirror GET /wbs/capex-intelligence) ──────────────────────────────

interface HeatRow {
  id: string;
  name: string;
  contract_value: string | number;
  total_budgeted: string | number;
  total_actual: string | number;
  total_committed: string | number;
  utilization_pct: string | number;
  rag_status: 'OK' | 'WARNING' | 'CRITICAL';
}

interface BurnRow {
  month: string;
  category: string;
  actual: string | number;
}

interface OverrunRow extends HeatRow {
  variance: number;
  variance_pct: number;
}

interface CapexData {
  kpis: {
    totalPortfolioValue: number;
    activeProjects: number;
    avgUtilization: number;
    totalBudgeted: number;
    totalActual: number;
    totalLpoCommitments: number;
    remainingBudget: number;
  };
  monthlyBurnByCategory: BurnRow[];
  portfolioHeatMap: HeatRow[];
  topCostOverruns: OverrunRow[];
  projectList: { id: string; name: string; currency?: string }[];
  /** Tenant base currency all figures are normalized to (backend-declared). */
  currency: string;
  /** Source currencies that lacked a rate and were summed unconverted. */
  currencyWarnings: string[];
}

const RAG_HEX: Record<string, string> = {
  OK: '#22c55e',
  WARNING: '#f59e0b',
  CRITICAL: '#ef4444',
};

const CATEGORY_PALETTE = ['#0d9488', '#6366f1', '#f59e0b', '#ef4444', '#8b5cf6', '#22c55e', '#38bdf8', '#f472b6'];

const num = (v: string | number | undefined | null): number => Number(v ?? 0) || 0;

// ─── Small presentational pieces ─────────────────────────────────────────────

const KpiCard: React.FC<{
  label: string;
  value: string;
  icon: React.ReactNode;
  accent: string;
  sub?: string;
  alert?: boolean;
}> = ({ label, value, icon, accent, sub, alert }) => (
  <div className={`rounded-lg border bg-gray-800/80 p-4 shadow-elev-sm ${alert ? 'border-red-500/40' : 'border-gray-700/60'}`}>
    <div className="flex items-center justify-between">
      <span className="text-[11px] font-bold uppercase text-gray-500">{label}</span>
      <span style={{ color: accent }}>{icon}</span>
    </div>
    <p className="mt-2 truncate text-xl font-bold text-white" title={value}>{value}</p>
    {sub && <p className={`mt-1 text-xs ${alert ? 'text-red-400' : 'text-gray-500'}`}>{sub}</p>}
  </div>
);

const ChartTooltip: React.FC<any> = ({ active, payload, label, formatter }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-gray-600/60 bg-gray-900 px-3 py-2 text-xs shadow-elev-lg">
      <p className="mb-1 font-bold text-white">{label}</p>
      {payload.map((p: any) => (
        <p key={String(p.dataKey)} style={{ color: p.color || p.fill }}>
          {p.name}: <span className="font-bold">{formatter(Number(p.value))}</span>
        </p>
      ))}
    </div>
  );
};

// ─── Page ────────────────────────────────────────────────────────────────────

/**
 * Project Analytics — per-project financial drill-down.
 *
 * Differs from /financials/intelligence (portfolio overview) by design:
 * - project-first: selector defaults to a single project, all sections rescope
 * - commitment EXPOSURE (actual + LPO committed vs budget) as the headline risk metric
 * - cumulative S-curve (actual vs straight-line budget) + linear runway forecast,
 *   explicitly labelled as extrapolation, not prediction
 * - CSV export + per-project PDF report download + AI variance briefing
 *
 * Data: GET /wbs/capex-intelligence (no new backend endpoints — reuse).
 */
const ProjectAnalyticsPage: React.FC = () => {
  const router = useRouter();
  const { convertToDisplay } = useCurrency();
  const { fetchCapexDashboard, fetchReportBlob, downloadBlob } = useFinanceCore();
  const { analyzeDashboard, generateNarrative } = useAiAssistant();

  const [data, setData] = useState<CapexData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedProject, setSelectedProject] = useState('');
  const [fetchedAt, setFetchedAt] = useState<Date | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [aiBrief, setAiBrief] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  // All figures arrive normalized to data.currency (tenant base) — convert
  // from that DECLARED source, never from the display currency.
  const sourceCurrency = data?.currency || 'USD';
  const fmt = useCallback(
    (n: number) => convertToDisplay(n, sourceCurrency),
    [convertToDisplay, sourceCurrency],
  );
  const fmtShort = useCallback(
    (n: number) => {
      const converted = convertToDisplay(n, sourceCurrency, false);
      const parsed = parseFloat(converted.replace(/[^0-9.-]/g, ''));
      return Number.isFinite(parsed) ? parsed.toLocaleString('en-US', { maximumFractionDigits: 0 }) : converted;
    },
    [convertToDisplay, sourceCurrency],
  );

  /**
   * Normalizes the capex-intelligence payload. The codebase is inconsistent
   * about envelopes (some controllers wrap in { data }), and error filters
   * can return truthy non-data shapes — so validate before accepting.
   */
  const normalize = (res: any): CapexData | null => {
    if (!res || typeof res !== 'object') return null;
    const payload = res.kpis ? res : res.data;
    if (!payload || typeof payload !== 'object' || !payload.kpis) return null;
    return {
      kpis: {
        totalPortfolioValue: num(payload.kpis.totalPortfolioValue),
        activeProjects: num(payload.kpis.activeProjects),
        avgUtilization: num(payload.kpis.avgUtilization),
        totalBudgeted: num(payload.kpis.totalBudgeted),
        totalActual: num(payload.kpis.totalActual),
        totalLpoCommitments: num(payload.kpis.totalLpoCommitments),
        remainingBudget: num(payload.kpis.remainingBudget),
      },
      monthlyBurnByCategory: Array.isArray(payload.monthlyBurnByCategory)
        ? payload.monthlyBurnByCategory
        : [],
      portfolioHeatMap: Array.isArray(payload.portfolioHeatMap) ? payload.portfolioHeatMap : [],
      topCostOverruns: Array.isArray(payload.topCostOverruns) ? payload.topCostOverruns : [],
      projectList: Array.isArray(payload.projectList) ? payload.projectList : [],
      currency: typeof payload.currency === 'string' ? payload.currency.toUpperCase() : 'USD',
      currencyWarnings: Array.isArray(payload.currencyWarnings) ? payload.currencyWarnings : [],
    };
  };

  const load = useCallback(
    async (projectId?: string, silent = false) => {
      if (silent) setRefreshing(true);
      else {
        setLoading(true);
        setLoadError(null);
      }
      try {
        const res = await fetchCapexDashboard(projectId || undefined);
        const payload = normalize(res);
        if (payload) {
          setData(payload);
          setLoadError(null);
          setFetchedAt(new Date());
        } else if (res) {
          // Truthy but wrong shape (envelope drift / filter output) — never crash
          setLoadError('The analytics service returned an unexpected response shape. Please refresh or contact support.');
        }
        // res === null: hook already toasted the failure; empty state covers it
      } finally {
        if (silent) setRefreshing(false);
        else setLoading(false);
      }
    },
    [fetchCapexDashboard],
  );

  useEffect(() => {
    load();
  }, [load]);

  const handleSelect = (id: string) => {
    setSelectedProject(id);
    setAiBrief(null);
    load(id || undefined);
  };

  // ── Derived: exposure + forecast (linear extrapolation) ────────────────────

  const exposure = useMemo(() => {
    if (!data?.kpis) return null;
    const budgeted = num(data.kpis.totalBudgeted);
    const actual = num(data.kpis.totalActual);
    const committed = num(data.kpis.totalLpoCommitments);
    const exposed = actual + committed;
    return {
      budgeted,
      actual,
      committed,
      exposed,
      exposurePct: budgeted > 0 ? (exposed / budgeted) * 100 : 0,
      headroom: budgeted - exposed,
    };
  }, [data]);

  const forecast = useMemo(() => {
    if (!data || !exposure) return null;
    // Average monthly burn over the last 3 months that actually had spend
    const byMonth = new Map<string, number>();
    for (const r of data.monthlyBurnByCategory || []) {
      byMonth.set(r.month, (byMonth.get(r.month) || 0) + num(r.actual));
    }
    const months = [...byMonth.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1));
    const withSpend = months.filter(([, v]) => v > 0).slice(-3);
    if (withSpend.length === 0 || exposure.headroom <= 0) return null;
    const avgBurn = withSpend.reduce((s, [, v]) => s + v, 0) / withSpend.length;
    if (avgBurn <= 0) return null;
    const monthsLeft = exposure.headroom / avgBurn;
    const exhaustDate = new Date();
    exhaustDate.setMonth(exhaustDate.getMonth() + Math.floor(monthsLeft));
    return { avgBurn, monthsLeft, exhaustDate };
  }, [data, exposure]);

  // ── Chart datasets ─────────────────────────────────────────────────────────

  const burnChartData = useMemo(() => {
    if (!data) return { rows: [], categories: [] as string[] };
    const months = [...new Set((data.monthlyBurnByCategory || []).map((r) => r.month))].sort();
    const categories = [...new Set((data.monthlyBurnByCategory || []).map((r) => r.category))];
    const rows = months.map((month) => {
      const row: Record<string, string | number> = { month };
      for (const cat of categories) {
        const found = data.monthlyBurnByCategory.find((r) => r.month === month && r.category === cat);
        row[cat] = num(found?.actual);
      }
      return row;
    });
    return { rows, categories };
  }, [data]);

  /** Cumulative S-curve: cumulative actual vs straight-line budget allocation. */
  const sCurveData = useMemo(() => {
    if (!data || !exposure || burnChartData.rows.length === 0) return [];
    const budgeted = exposure.budgeted;
    const n = burnChartData.rows.length;
    let cumulative = 0;
    return burnChartData.rows.map((row, i) => {
      const monthTotal = burnChartData.categories.reduce((s, c) => s + num(row[c]), 0);
      cumulative += monthTotal;
      return {
        month: row.month as string,
        actual: Math.round(cumulative),
        planned: Math.round((budgeted / Math.max(n, 1)) * (i + 1)),
      };
    });
  }, [data, exposure, burnChartData]);

  const projectBars = useMemo(() => {
    if (!data) return [];
    return (data.portfolioHeatMap || []).map((p) => ({
      name: p.name.length > 18 ? `${p.name.slice(0, 17)}…` : p.name,
      fullName: p.name,
      Budgeted: num(p.total_budgeted),
      Actual: num(p.total_actual),
      Committed: num(p.total_committed),
    }));
  }, [data]);

  // ── Actions: CSV / PDF / AI ────────────────────────────────────────────────

  const handleExportCsv = () => {
    if (!data) return;
    const header = 'project,budgeted,actual,committed,exposure,exposure_pct,variance,rag_status';
    const lines = (data.portfolioHeatMap || []).map((p) => {
      const b = num(p.total_budgeted);
      const a = num(p.total_actual);
      const c = num(p.total_committed);
      const exp = a + c;
      const safe = (s: string) => `"${String(s).replace(/"/g, '""')}"`;
      return [
        safe(p.name),
        b.toFixed(2),
        a.toFixed(2),
        c.toFixed(2),
        exp.toFixed(2),
        b > 0 ? ((exp / b) * 100).toFixed(1) : '0.0',
        (a - b).toFixed(2),
        p.rag_status,
      ].join(',');
    });
    const blob = new Blob([[header, ...lines].join('\n')], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute(
      'download',
      `project-analytics-${selectedProject || 'portfolio'}-${new Date().toISOString().slice(0, 10)}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
    toast.success('Variance table exported to CSV');
  };

  const handleDownloadPdf = async () => {
    if (!selectedProject) {
      toast.error('Select a single project to download its PDF report.');
      return;
    }
    setDownloadingPdf(true);
    try {
      const blob = await fetchReportBlob(`/wbs/projects/${selectedProject}/report-pdf`);
      if (blob) {
        downloadBlob(blob, `project-report-${selectedProject}.pdf`);
        toast.success('Project PDF report downloaded');
      }
    } finally {
      setDownloadingPdf(false);
    }
  };

  const handleAiBrief = async () => {
    setAiLoading(true);
    try {
      const [analysis, narrative] = await Promise.all([
        analyzeDashboard('capex', selectedProject || undefined),
        generateNarrative({
          reportType: 'variance',
          projectName: selectedProject
            ? (data?.projectList.find((p) => p.id === selectedProject)?.name ?? selectedProject)
            : 'Full portfolio',
          currency: 'USD',
        }),
      ]);
      const text =
        narrative?.narrative ||
        (analysis ? Object.values(analysis.sections || {}).join('\n\n') || analysis.narrative : null);
      if (text) setAiBrief(text);
      else toast.error('AI briefing unavailable right now. Try again later.');
    } finally {
      setAiLoading(false);
    }
  };

  // ── Variance table config ──────────────────────────────────────────────────

  const varianceColumns: DataColumn<HeatRow>[] = useMemo(
    () => [
      {
        key: 'project',
        label: 'Project',
        tier: 'P0',
        get: (r) => <span className="font-semibold text-white">{r.name}</span>,
        title: (r) => r.name,
      },
      {
        key: 'budgeted',
        label: 'Budgeted',
        tier: 'P0',
        cellClassName: 'text-right font-mono',
        get: (r) => fmt(num(r.total_budgeted)),
      },
      {
        key: 'actual',
        label: 'Actual',
        tier: 'P0',
        cellClassName: 'text-right font-mono',
        get: (r) => fmt(num(r.total_actual)),
      },
      {
        key: 'committed',
        label: 'LPO Committed',
        tier: 'P1',
        cellClassName: 'text-right font-mono',
        get: (r) => fmt(num(r.total_committed)),
      },
      {
        key: 'exposure',
        label: 'Exposure %',
        tier: 'P1',
        cellClassName: 'text-right font-mono',
        get: (r) => {
          const b = num(r.total_budgeted);
          const pct = b > 0 ? ((num(r.total_actual) + num(r.total_committed)) / b) * 100 : 0;
          return (
            <span className={pct > 90 ? 'font-bold text-red-400' : pct > 70 ? 'font-bold text-yellow-400' : 'text-gray-300'}>
              {pct.toFixed(1)}%
            </span>
          );
        },
      },
      {
        key: 'variance',
        label: 'Variance',
        tier: 'P1',
        cellClassName: 'text-right font-mono',
        get: (r) => {
          const v = num(r.total_actual) - num(r.total_budgeted);
          return (
            <span className={v > 0 ? 'text-red-400' : 'text-green-400'}>
              {v > 0 ? '+' : ''}{fmtShort(v)}
            </span>
          );
        },
      },
      {
        key: 'rag',
        label: 'RAG',
        tier: 'P0',
        get: (r) => (
          <span
            className="inline-block rounded-full px-2.5 py-0.5 text-[11px] font-black"
            style={{ color: RAG_HEX[r.rag_status] || '#fff', background: `${RAG_HEX[r.rag_status] || '#6366f1'}1f` }}
          >
            {r.rag_status}
          </span>
        ),
      },
    ],
    [fmt, fmtShort],
  );

  const varianceActions: DataAction<HeatRow>[] = useMemo(
    () => [
      {
        key: 'open',
        label: 'Open project hub',
        primary: true,
        onClick: (r) => router.push('/financials/projects'),
      },
      {
        key: 'wbs',
        label: 'Open in WBS Designer',
        onClick: (r) => router.push(`/financials/projects/wbs?projectId=${r.id}`),
      },
    ],
    [router],
  );

  // ── Render states ──────────────────────────────────────────────────────────

  if (loading) {
    return (
      <>
        <Head><title>Project Analytics | SentinelFi</title></Head>
        <PageContainer title="Project Analytics" subtitle="Per-project financial drill-down.">
          <div className="flex h-64 items-center justify-center gap-3 text-gray-500">
            <RefreshCw className="h-5 w-5 animate-spin" /> Loading project intelligence…
          </div>
        </PageContainer>
      </>
    );
  }

  if (loadError) {
    return (
      <>
        <Head><title>Project Analytics | SentinelFi</title></Head>
        <PageContainer
          title="Project Analytics"
          subtitle="Budget vs actuals, commitment exposure, runway forecast and variance per project."
        >
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <AlertTriangle className="h-10 w-10 text-yellow-500" />
            <p className="max-w-md text-sm text-gray-300">{loadError}</p>
            <button
              onClick={() => load(selectedProject || undefined)}
              className="tap-target mt-2 flex items-center gap-2 rounded-xl bg-brand-primary px-4 py-2 text-xs font-black uppercase text-white transition-all hover:bg-brand-primary/90"
            >
              <RefreshCw className="h-3 w-3" /> Retry
            </button>
          </div>
        </PageContainer>
      </>
    );
  }

  if (!data || (data.projectList || []).length === 0) {
    return (
      <>
        <Head><title>Project Analytics | SentinelFi</title></Head>
        <PageContainer
          title="Project Analytics"
          subtitle="Budget vs actuals, commitment exposure, runway forecast and variance per project."
        >
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <BarChart3 className="h-10 w-10 text-gray-600" />
            <p className="text-sm text-gray-400">No projects found for this tenant yet.</p>
            <p className="max-w-sm text-xs text-gray-600">
              Create a project in the Project Hub first — analytics appear here once budgets and expenses exist.
            </p>
          </div>
        </PageContainer>
      </>
    );
  }

  const scopeLabel = selectedProject
    ? (data.projectList.find((p) => p.id === selectedProject)?.name ?? 'Project')
    : `Portfolio (${data.kpis.activeProjects} projects)`;

  return (
    <>
      <Head><title>Project Analytics | SentinelFi</title></Head>

      <PageContainer
        title="Project Analytics"
        subtitle={`Budget vs actuals, commitment exposure and runway — ${scopeLabel}.`}
        headerContent={
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 rounded-xl border border-gray-700 bg-gray-800/50 p-1">
              <select
                aria-label="Select project scope"
                className="max-w-[220px] cursor-pointer bg-transparent px-2 py-1 text-xs font-bold text-gray-200 outline-none"
                value={selectedProject}
                onChange={(e) => handleSelect(e.target.value)}
              >
                <option value="">All Projects ({data.kpis.activeProjects})</option>
                {data.projectList.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              <ChevronDown className="h-3 w-3 text-gray-500" />
            </div>
            <button
              onClick={() => load(selectedProject || undefined, true)}
              disabled={refreshing}
              className="flex items-center gap-1.5 rounded-xl border border-indigo-500/30 bg-indigo-500/10 px-3 py-1.5 text-xs font-bold text-indigo-300 transition-colors hover:bg-indigo-500/20 disabled:opacity-50"
            >
              <RefreshCw className={`h-3 w-3 ${refreshing ? 'animate-spin' : ''}`} /> Refresh
            </button>
            <button
              onClick={handleExportCsv}
              className="flex items-center gap-1.5 rounded-xl border border-gray-700 bg-gray-800/50 px-3 py-1.5 text-xs font-bold text-gray-300 transition-colors hover:border-gray-500"
            >
              <Download className="h-3 w-3" /> CSV
            </button>
            <button
              onClick={handleDownloadPdf}
              disabled={!selectedProject || downloadingPdf}
              title={selectedProject ? 'Download audited PDF report' : 'Select a project first'}
              className="flex items-center gap-1.5 rounded-xl border border-gray-700 bg-gray-800/50 px-3 py-1.5 text-xs font-bold text-gray-300 transition-colors hover:border-gray-500 disabled:opacity-40"
            >
              <FileText className="h-3 w-3" /> {downloadingPdf ? 'Preparing…' : 'PDF'}
            </button>
          </div>
        }
      >
        {/* ── Currency integrity notice ─────────────────────────── */}
        {(data.currencyWarnings || []).length > 0 && (
          <div className="mb-4 flex items-start gap-2 rounded-lg border border-yellow-500/30 bg-yellow-500/5 p-3 text-xs text-yellow-300">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              No exchange rate for <span className="font-mono font-bold">{data.currencyWarnings.join(', ')}</span> —
              affected figures are summed unconverted. Treat cross-currency totals as approximate until rates refresh.
            </span>
          </div>
        )}

        {/* ── KPI row ─────────────────────────────────────────── */}
        <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          <KpiCard label="Contract Value" value={fmt(num(data.kpis.totalPortfolioValue))} icon={<Briefcase size={16} />} accent="#6366f1" />
          <KpiCard label="Budgeted" value={fmt(num(data.kpis.totalBudgeted))} icon={<Target size={16} />} accent="#a78bfa" />
          <KpiCard label="Actual Spent" value={fmt(num(data.kpis.totalActual))} icon={<CircleDollarSign size={16} />} accent="#f59e0b" sub={`${num(data.kpis.avgUtilization)}% utilized`} />
          <KpiCard label="LPO Committed" value={fmt(num(data.kpis.totalLpoCommitments))} icon={<ShoppingBag size={16} />} accent="#ef4444" sub="not yet disbursed" />
          <KpiCard
            label="Exposure"
            value={exposure ? `${exposure.exposurePct.toFixed(1)}%` : '—'}
            icon={<AlertTriangle size={16} />}
            accent={exposure && exposure.exposurePct > 90 ? '#ef4444' : '#f59e0b'}
            sub={exposure ? `${fmt(exposure.headroom)} headroom` : undefined}
            alert={!!exposure && exposure.exposurePct > 90}
          />
          <KpiCard
            label="Remaining"
            value={fmt(num(data.kpis.remainingBudget))}
            icon={<Wallet size={16} />}
            accent={num(data.kpis.remainingBudget) < 0 ? '#ef4444' : '#22c55e'}
            alert={num(data.kpis.remainingBudget) < 0}
          />
        </div>

        {/* ── Runway forecast (linear extrapolation) ──────────── */}
        <Card
          title="Runway Forecast"
          subtitle="Linear extrapolation from the last 3 active spend months — planning signal, not a prediction."
          accent={forecast && forecast.monthsLeft < 3 ? 'alert' : 'none'}
          className="mb-4"
        >
          {forecast ? (
            <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
              <div className="flex items-center gap-2">
                <Activity size={16} className="text-brand-primary" />
                <span className="text-xs text-gray-400">Avg burn</span>
                <span className="font-mono text-sm font-bold text-white">{fmt(forecast.avgBurn)}/mo</span>
              </div>
              <div className="flex items-center gap-2">
                <TrendingUp size={16} className="text-yellow-400" />
                <span className="text-xs text-gray-400">Headroom lasts</span>
                <span className="font-mono text-sm font-bold text-white">
                  {forecast.monthsLeft < 1 ? '< 1 month' : `≈ ${forecast.monthsLeft.toFixed(1)} months`}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <TrendingDown size={16} className="text-red-400" />
                <span className="text-xs text-gray-400">Projected exhaustion</span>
                <span className="font-mono text-sm font-bold text-white">
                  {forecast.exhaustDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                </span>
              </div>
            </div>
          ) : (
            <p className="text-xs text-gray-500">
              {exposure && exposure.headroom <= 0
                ? 'Headroom exhausted — actual + commitments already meet or exceed budget.'
                : 'Not enough spend history to project runway yet.'}
            </p>
          )}
        </Card>

        {/* ── Charts row 1 ────────────────────────────────────── */}
        <div className="mb-4 grid grid-cols-1 gap-4 xl:grid-cols-5">
          <Card
            title={selectedProject ? 'Monthly Spend' : 'Budget vs Actuals vs Committed'}
            subtitle={selectedProject ? 'Actual spend per month for the selected project.' : 'Per-project position across the portfolio.'}
            className="xl:col-span-3"
          >
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={selectedProject ? burnChartData.rows.map((r) => ({ name: r.month, Actual: burnChartData.categories.reduce((s, c) => s + num(r[c]), 0) })) : projectBars}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey={selectedProject ? 'name' : 'name'} tick={{ fontSize: 10, fill: '#9ca3af' }} interval={0} angle={projectBars.length > 6 && !selectedProject ? -20 : 0} textAnchor={projectBars.length > 6 && !selectedProject ? 'end' : 'middle'} height={projectBars.length > 6 && !selectedProject ? 52 : 30} />
                  <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} tickFormatter={(v: number) => fmtShort(v)} width={72} />
                  <RechartsTooltip content={<ChartTooltip formatter={fmt} />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  {selectedProject ? (
                    <Bar dataKey="Actual" fill="#0d9488" radius={[4, 4, 0, 0]} />
                  ) : (
                    <>
                      <Bar dataKey="Budgeted" fill="#6366f1" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Actual" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Committed" fill="#ef4444" radius={[4, 4, 0, 0]} />
                    </>
                  )}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card
            title="Cumulative S-Curve"
            subtitle="Cumulative actual vs straight-line budget."
            className="xl:col-span-2"
          >
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={sCurveData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#9ca3af' }} />
                  <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} tickFormatter={(v: number) => fmtShort(v)} width={72} />
                  <RechartsTooltip content={<ChartTooltip formatter={fmt} />} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Area type="monotone" dataKey="planned" name="Planned (linear)" fill="rgba(99,102,241,0.15)" stroke="#6366f1" strokeDasharray="5 4" />
                  <Line type="monotone" dataKey="actual" name="Actual (cumulative)" stroke="#0d9488" strokeWidth={2.5} dot={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>

        {/* ── Monthly burn by category ────────────────────────── */}
        {burnChartData.categories.length > 0 && (
          <Card
            title="Monthly Burn by Category"
            subtitle="Actual spend per month, stacked by WBS category (trailing 12 months)."
            className="mb-4"
          >
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={burnChartData.rows}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#9ca3af' }} />
                  <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} tickFormatter={(v: number) => fmtShort(v)} width={72} />
                  <RechartsTooltip content={<ChartTooltip formatter={fmt} />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  {burnChartData.categories.map((cat, i) => (
                    <Bar
                      key={cat}
                      dataKey={cat}
                      stackId="burn"
                      fill={CATEGORY_PALETTE[i % CATEGORY_PALETTE.length]}
                      radius={i === burnChartData.categories.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        )}

        {/* ── Overruns spotlight ──────────────────────────────── */}
        {(data.topCostOverruns || []).length > 0 && (
          <Card title="Overrun Spotlight" subtitle="Projects where actuals exceed budget, ranked by severity." accent="alert" className="mb-4">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
              {data.topCostOverruns.slice(0, 3).map((o) => (
                <div key={o.id} className="rounded-lg border border-red-500/25 bg-red-500/5 p-3">
                  <p className="truncate text-sm font-bold text-white" title={o.name}>{o.name}</p>
                  <p className="mt-1 font-mono text-sm font-bold text-red-400">
                    +{fmtShort(num(o.variance))} <span className="text-xs">({num(o.variance_pct)}% over)</span>
                  </p>
                  <p className="mt-1 text-[11px] text-gray-500">
                    {fmt(num(o.total_actual))} spent of {fmt(num(o.total_budgeted))} budgeted
                  </p>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* ── Variance table ──────────────────────────────────── */}
        <Card
          title="Project Variance & Exposure"
          subtitle="Auditable per-project position. Exposure = actual + LPO committed vs budget."
          className="mb-4"
          noPadding
        >
          <DataTable<HeatRow>
            columns={varianceColumns}
            rows={data.portfolioHeatMap || []}
            rowKey={(r) => r.id}
            actions={varianceActions}
            emptyMessage="No project rows to display."
          />
        </Card>

        {/* ── AI briefing ─────────────────────────────────────── */}
        <Card
          title="AI Variance Briefing"
          subtitle="Generated on demand from live figures — review before relying on it."
          headerContent={
            <button
              onClick={handleAiBrief}
              disabled={aiLoading}
              className="tap-target flex items-center gap-1.5 rounded-xl bg-brand-primary px-3 py-1.5 text-xs font-black uppercase text-white transition-all hover:bg-brand-primary/90 disabled:opacity-50"
            >
              <Sparkles className="h-3 w-3" /> {aiLoading ? 'Analyzing…' : aiBrief ? 'Regenerate' : 'Generate'}
            </button>
          }
          className="mb-4"
        >
          {aiBrief ? (
            <p className="whitespace-pre-line text-sm leading-relaxed text-gray-300">{aiBrief}</p>
          ) : (
            <p className="text-xs text-gray-500">
              Produces an executive narrative over the current scope — overruns, exposure and runway.
            </p>
          )}
        </Card>

        {/* ── Audit footer ────────────────────────────────────── */}
        <p className="text-[11px] text-gray-600">
          Source: <span className="font-mono">GET /wbs/capex-intelligence</span>
          {fetchedAt ? ` · Data as of ${fetchedAt.toLocaleString()}` : ''}
          {` · Figures normalized to ${data.currency} server-side, shown in display currency.`}
        </p>
      </PageContainer>
    </>
  );
};

export default ProjectAnalyticsPage;
