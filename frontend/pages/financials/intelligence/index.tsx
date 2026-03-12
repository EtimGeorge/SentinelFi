import React, { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import {
  BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, RadialBarChart, RadialBar
} from 'recharts';
import {
  TrendingUp, TrendingDown, DollarSign, Briefcase, Activity, Target,
  CheckCircle, Clock, ChevronDown, RefreshCw, Filter,
  Building2, Users, ShoppingBag, Layers,
} from 'lucide-react';
import { useFinanceCore } from '../../../hooks/useFinanceCore';
import { useCurrency } from '../../../components/context/CurrencyContext';

// ─── Types ────────────────────────────────────────────────────────────────────

type FmtFn = (n: number, sourceCurrency?: string) => string;

interface KpiCardProps {
  label: string;
  value: string;
  sub?: string;
  trend?: number;
  icon: React.ReactNode;
  accent: string;
}

interface ProjectOption { id: string; name: string; }

// ─── Constants ────────────────────────────────────────────────────────────────

const RAG_COLORS: Record<string, string> = { OK: '#22c55e', WARNING: '#f59e0b', CRITICAL: '#ef4444' };
const CAPEX_PALETTE = ['#6366f1', '#8b5cf6', '#a78bfa', '#c4b5fd', '#ddd6fe'];
const OPEX_PALETTE = ['#0ea5e9', '#38bdf8', '#7dd3fc', '#f59e0b', '#ef4444'];

// ─── Shared Sub-components ────────────────────────────────────────────────────

const KpiCard: React.FC<KpiCardProps> = ({ label, value, sub, trend, icon, accent }) => (
  <div style={{
    background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 14, padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 6,
    boxShadow: '0 0 0 1px rgba(255,255,255,0.04), 0 4px 24px rgba(0,0,0,0.3)',
    position: 'relative', overflow: 'hidden',
  }}>
    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: accent, borderRadius: '14px 14px 0 0' }} />
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
      <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</span>
      <span style={{ color: accent, opacity: 0.8 }}>{icon}</span>
    </div>
    <span style={{ fontSize: 26, fontWeight: 700, color: '#fff', letterSpacing: '-0.02em' }}>{value}</span>
    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
      {sub && <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>{sub}</span>}
      {trend !== undefined && (
        <span style={{ fontSize: 11, color: trend >= 0 ? '#22c55e' : '#ef4444', display: 'flex', alignItems: 'center', gap: 2 }}>
          {trend >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />} {Math.abs(trend)}%
        </span>
      )}
    </div>
  </div>
);

const ChartCard: React.FC<{ title: string; sub?: string; children: React.ReactNode; style?: React.CSSProperties }> = ({ title, sub, children, style }) => (
  <div style={{
    background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14,
    padding: 20, display: 'flex', flexDirection: 'column', gap: 12, ...style,
  }}>
    <div style={{ marginBottom: 2 }}>
      <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#fff', letterSpacing: '0.02em' }}>{title}</h3>
      {sub && <p style={{ margin: '3px 0 0', fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>{sub}</p>}
    </div>
    {children}
  </div>
);

/** Currency-aware tooltip — receives fmt as a closure from the parent. */
const makeTooltip = (fmt: FmtFn) => ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: '#1e1e2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '10px 14px' }}>
      <p style={{ margin: 0, color: 'rgba(255,255,255,0.6)', fontSize: 11, marginBottom: 4 }}>{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ margin: '2px 0', color: p.color, fontSize: 12, fontWeight: 600 }}>
          {p.name}: {typeof p.value === 'number' ? fmt(p.value) : p.value}
        </p>
      ))}
    </div>
  );
};

// ─── CAPEX Dashboard ──────────────────────────────────────────────────────────

interface CapexDashboardProps {
  fetchCapexDashboard: (pid?: string) => Promise<any>;
  fmt: FmtFn;
}

const CapexDashboard: React.FC<CapexDashboardProps> = ({ fetchCapexDashboard, fmt }) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState('');
  const [projectList, setProjectList] = useState<ProjectOption[]>([]);
  const Tooltip = makeTooltip(fmt);

  const load = useCallback(async (pid?: string) => {
    setLoading(true);
    const res = await fetchCapexDashboard(pid || undefined);
    if (res) { setData(res); setProjectList(res.projectList || []); }
    setLoading(false);
  }, [fetchCapexDashboard]);

  useEffect(() => { load(); }, [load]);

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 400, gap: 12, color: 'rgba(255,255,255,0.4)' }}>
      <RefreshCw size={20} style={{ animation: 'spin 1s linear infinite' }} /> Loading CAPEX Intelligence…
    </div>
  );
  if (!data) return <div style={{ color: 'rgba(255,255,255,0.4)', textAlign: 'center', padding: 60 }}>No CAPEX data available.</div>;

  const { kpis, monthlyBurnByCategory, portfolioHeatMap, topCostOverruns } = data;

  const burnMonths = [...new Set((monthlyBurnByCategory || []).map((r: any) => r.month))].sort() as string[];
  const burnCategories = [...new Set((monthlyBurnByCategory || []).map((r: any) => r.category))] as string[];
  const burnChartData = burnMonths.map(month => {
    const row: any = { month };
    burnCategories.forEach(cat => {
      const found = (monthlyBurnByCategory as any[]).find(r => r.month === month && r.category === cat);
      row[cat] = Number(found?.actual || 0);
    });
    return row;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Controls */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Filter size={14} style={{ color: 'rgba(255,255,255,0.4)' }} />
          <select
            id="capex-project-selector"
            value={selectedProject}
            onChange={e => { setSelectedProject(e.target.value); load(e.target.value || undefined); }}
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, padding: '6px 32px 6px 12px', color: '#fff', fontSize: 13, appearance: 'none', cursor: 'pointer', outline: 'none' }}
          >
            <option value="">All Active Projects ({kpis.activeProjects})</option>
            {projectList.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <ChevronDown size={14} style={{ color: 'rgba(255,255,255,0.4)', marginLeft: -24, pointerEvents: 'none' }} />
        </div>
        <button onClick={() => load(selectedProject || undefined)}
          style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: 8, padding: '6px 14px', color: '#a5b4fc', fontSize: 12, cursor: 'pointer' }}>
          <RefreshCw size={12} /> Refresh
        </button>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
        <KpiCard label="Total Portfolio Value" value={fmt(kpis.totalPortfolioValue)} icon={<Briefcase size={18} />} accent="#6366f1" />
        <KpiCard label="Active Projects" value={kpis.activeProjects.toString()} icon={<Layers size={18} />} accent="#8b5cf6" sub="in portfolio" />
        <KpiCard label="Total Budgeted" value={fmt(kpis.totalBudgeted)} icon={<Target size={18} />} accent="#a78bfa" />
        <KpiCard label="Total Actual Spent" value={fmt(kpis.totalActual)} icon={<DollarSign size={18} />} accent="#f59e0b" trend={kpis.avgUtilization} sub={`${kpis.avgUtilization}% of budget`} />
        <KpiCard label="LPO Commitments" value={fmt(kpis.totalLpoCommitments)} icon={<ShoppingBag size={18} />} accent="#ef4444" sub="committed not yet disbursed" />
        <KpiCard label="Remaining Budget" value={fmt(kpis.remainingBudget)} icon={<Activity size={18} />} accent={kpis.remainingBudget < 0 ? '#ef4444' : '#22c55e'} />
      </div>

      {/* Charts Row 1 */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 14 }}>
        <ChartCard title="WBS Cost Burn by Category" sub="Last 12 months — actual spend categorised by WBS type">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={burnChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.4)' }} />
              <YAxis tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.4)' }} tickFormatter={v => fmt(v)} />
              <Tooltip content={<Tooltip />} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              {burnCategories.map((cat, i) => (
                <Bar key={cat} dataKey={cat} stackId="a" fill={CAPEX_PALETTE[i % CAPEX_PALETTE.length]}
                  radius={i === burnCategories.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Portfolio Budget Utilisation" sub="% of budget consumed per project (RAG)">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {(portfolioHeatMap || []).slice(0, 6).map((p: any, i: number) => (
              <div key={i}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', maxWidth: '70%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
                  <span style={{ fontSize: 11, color: RAG_COLORS[p.rag_status] || '#fff', fontWeight: 600 }}>{p.utilization_pct}%</span>
                </div>
                <div style={{ height: 6, background: 'rgba(255,255,255,0.08)', borderRadius: 4 }}>
                  <div style={{ height: '100%', width: `${Math.min(100, Number(p.utilization_pct))}%`, background: RAG_COLORS[p.rag_status] || '#6366f1', borderRadius: 4, transition: 'width 0.6s ease' }} />
                </div>
              </div>
            ))}
          </div>
        </ChartCard>
      </div>

      {/* Charts Row 2 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <ChartCard title="Committed vs Disbursed Trajectory" sub="LPO commitments vs actual project disbursements">
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={(portfolioHeatMap || []).map((p: any) => ({ name: p.name?.substring(0, 12), committed: Number(p.total_committed), actual: Number(p.total_actual) }))}>
              <defs>
                <linearGradient id="gCommitted" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gActual" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="name" tick={{ fontSize: 9, fill: 'rgba(255,255,255,0.4)' }} />
              <YAxis tick={{ fontSize: 9, fill: 'rgba(255,255,255,0.4)' }} tickFormatter={v => fmt(v)} />
              <Tooltip content={<Tooltip />} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Area type="monotone" dataKey="committed" stroke="#6366f1" fill="url(#gCommitted)" name="LPO Committed" strokeWidth={2} />
              <Area type="monotone" dataKey="actual" stroke="#f59e0b" fill="url(#gActual)" name="Actual Disbursed" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Top Cost Overruns" sub="Projects exceeding budget, ranked by variance %">
          {(topCostOverruns || []).length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 160, gap: 8 }}>
              <CheckCircle size={32} style={{ color: '#22c55e' }} />
              <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>No cost overruns detected</span>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {(topCostOverruns as any[]).map((p, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 10px', background: 'rgba(239,68,68,0.05)', borderRadius: 8, border: '1px solid rgba(239,68,68,0.12)' }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#ef4444', minWidth: 28 }}>#{i + 1}</span>
                  <span style={{ flex: 1, fontSize: 11, color: 'rgba(255,255,255,0.8)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
                  <span style={{ fontSize: 11, color: '#ef4444', fontWeight: 700 }}>+{p.variance_pct}%</span>
                  <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>{fmt(p.variance)}</span>
                </div>
              ))}
            </div>
          )}
        </ChartCard>
      </div>
    </div>
  );
};

// ─── OPEX Dashboard ───────────────────────────────────────────────────────────

interface OpexDashboardProps {
  fetchOpexDashboard: (fy?: string) => Promise<any>;
  fiscalYears: any[];
  fmt: FmtFn;
}

const OpexDashboard: React.FC<OpexDashboardProps> = ({ fetchOpexDashboard, fiscalYears, fmt }) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState('');
  const Tooltip = makeTooltip(fmt);

  const load = useCallback(async (yearId?: string) => {
    setLoading(true);
    const res = await fetchOpexDashboard(yearId || undefined);
    if (res) setData(res);
    setLoading(false);
  }, [fetchOpexDashboard]);

  useEffect(() => { load(); }, [load]);

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 400, gap: 12, color: 'rgba(255,255,255,0.4)' }}>
      <RefreshCw size={20} style={{ animation: 'spin 1s linear infinite' }} /> Loading OPEX Intelligence…
    </div>
  );
  if (!data) return <div style={{ color: 'rgba(255,255,255,0.4)', textAlign: 'center', padding: 60 }}>No OPEX data available.</div>;

  const { kpis, departmentExpenditure, payrollDecomposition, rollingBurnRate, procurementFunnel, budgetRunway } = data;

  // Aggregate cost center rows up to department level
  const deptMap: Record<string, { department: string; allocated: number; spent: number }> = {};
  (departmentExpenditure || []).forEach((r: any) => {
    if (!deptMap[r.department]) deptMap[r.department] = { department: r.department, allocated: 0, spent: 0 };
    deptMap[r.department].allocated += Number(r.allocated || 0);
    deptMap[r.department].spent += Number(r.actual_spent || 0);
  });
  const deptChartData = Object.values(deptMap).slice(0, 8);

  const payrollPieData = (payrollDecomposition || []).map((r: any, i: number) => ({
    name: (r.item_type as string)?.replace(/_/g, ' '),
    value: Number(r.total),
    fill: OPEX_PALETTE[i % OPEX_PALETTE.length],
  }));

  const funnelData = [
    { stage: 'Requisitions', count: procurementFunnel.requisitions, fill: '#6366f1' },
    { stage: 'Purchase Orders', count: procurementFunnel.purchaseOrders, fill: '#0ea5e9' },
    { stage: 'Invoices', count: procurementFunnel.invoices, fill: '#f59e0b' },
    { stage: 'Paid', count: procurementFunnel.paid, fill: '#22c55e' },
  ];

  const runway = budgetRunway.utilizationPct as number;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Controls */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Filter size={14} style={{ color: 'rgba(255,255,255,0.4)' }} />
          <select
            id="opex-year-selector"
            value={selectedYear}
            onChange={e => { setSelectedYear(e.target.value); load(e.target.value || undefined); }}
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, padding: '6px 12px', color: '#fff', fontSize: 13, cursor: 'pointer', outline: 'none' }}
          >
            <option value="">Latest Fiscal Year</option>
            {fiscalYears.map((fy: any) => <option key={fy.id} value={fy.id}>{fy.year_label}</option>)}
          </select>
        </div>
        <button onClick={() => load(selectedYear || undefined)}
          style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(14,165,233,0.15)', border: '1px solid rgba(14,165,233,0.3)', borderRadius: 8, padding: '6px 14px', color: '#7dd3fc', fontSize: 12, cursor: 'pointer' }}>
          <RefreshCw size={12} /> Refresh
        </button>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
        <KpiCard label="Total Budget Allocated" value={fmt(kpis.totalAllocated)} icon={<Target size={18} />} accent="#0ea5e9" />
        <KpiCard label="YTD Actual Spend" value={fmt(kpis.totalSpent)} icon={<DollarSign size={18} />} accent="#f59e0b" sub={`${kpis.utilizationPct}% utilised`} />
        <KpiCard label="Budget Variance" value={fmt(Math.abs(kpis.variance))} icon={kpis.variance >= 0 ? <TrendingDown size={18} /> : <TrendingUp size={18} />}
          accent={kpis.variance >= 0 ? '#22c55e' : '#ef4444'} sub={kpis.variance >= 0 ? 'Under budget' : 'Over budget'} />
        <KpiCard label="P2P Cycle Count" value={kpis.p2pCycleCount.toString()} icon={<ShoppingBag size={18} />} accent="#8b5cf6" sub="open requisitions" />
        <KpiCard label="YTD Gross Payroll" value={fmt(kpis.payrollGross)} icon={<Users size={18} />} accent="#6366f1" />
      </div>

      {/* Charts Row 1 */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 14 }}>
        <ChartCard title="Department Expenditure Matrix" sub="Budget allocated vs actual OPEX spend per department">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={deptChartData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.4)' }} tickFormatter={v => fmt(v)} />
              <YAxis type="category" dataKey="department" tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.7)' }} width={90} />
              <Tooltip content={<Tooltip />} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="allocated" name="Allocated" fill="#0ea5e9" radius={[0, 4, 4, 0]} opacity={0.5} />
              <Bar dataKey="spent" name="Actual Spent" fill="#f59e0b" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Payroll Cost Decomposition" sub="Gross breakdown by pay element type">
          {payrollPieData.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 160, gap: 8 }}>
              <Clock size={28} style={{ color: 'rgba(255,255,255,0.2)' }} />
              <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>No payroll data for this period</span>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={payrollPieData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={3} dataKey="value">
                  {payrollPieData.map((_: any, index: number) => <Cell key={index} fill={payrollPieData[index].fill} />)}
                </Pie>
                <Tooltip content={<Tooltip />} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      {/* Charts Row 2 */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 14 }}>
        <ChartCard title="Rolling 12-Month OPEX Burn Rate" sub="Total actual OPEX expenditure trend">
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={rollingBurnRate || []}>
              <defs>
                <linearGradient id="gBurn" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.4)' }} />
              <YAxis tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.4)' }} tickFormatter={v => fmt(v)} />
              <Tooltip content={<Tooltip />} />
              <Area type="monotone" dataKey="actual" name="OPEX Spend" stroke="#0ea5e9" fill="url(#gBurn)" strokeWidth={2} dot={{ r: 3, fill: '#0ea5e9' }} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <ChartCard title="P2P Procurement Funnel" sub="Lifecycle throughput across P2P stages">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {funnelData.map((s, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', width: 100, flexShrink: 0 }}>{s.stage}</span>
                  <div style={{ flex: 1, height: 20, background: 'rgba(255,255,255,0.05)', borderRadius: 4 }}>
                    <div style={{ height: '100%', width: `${funnelData[0].count > 0 ? (s.count / funnelData[0].count) * 100 : 0}%`, background: s.fill, borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: 6 }}>
                      <span style={{ fontSize: 10, fontWeight: 700, color: '#fff' }}>{s.count}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ChartCard>

          <ChartCard title="Budget Runway" sub="YTD budget consumption gauge">
            <div>
              <div style={{ height: 12, background: 'rgba(255,255,255,0.08)', borderRadius: 8 }}>
                <div style={{ height: '100%', width: `${Math.min(100, runway)}%`, background: runway > 90 ? '#ef4444' : runway > 70 ? '#f59e0b' : '#22c55e', borderRadius: 8, transition: 'width 0.8s ease' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>0%</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: runway > 90 ? '#ef4444' : runway > 70 ? '#f59e0b' : '#22c55e' }}>{runway}% consumed</span>
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>100%</span>
              </div>
              <div style={{ marginTop: 8 }}>
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>
                  Remaining: <strong style={{ color: '#fff' }}>{fmt(budgetRunway.remainingBudget)}</strong>
                </span>
              </div>
            </div>
          </ChartCard>
        </div>
      </div>
    </div>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────

const FinancialIntelligencePage: React.FC = () => {
  const { fetchCapexDashboard, fetchOpexDashboard, fetchFiscalYears } = useFinanceCore();

  // ── Currency-awareness: pull from app-wide CurrencyContext ──────────────
  const { convertToDisplay, userCurrency } = useCurrency();
  /**
   * fmt(n, sourceCurrency?) — converts from sourceCurrency (or userCurrency by default)
   * to the user's selected display currency, then applies compact notation.
   * Uses Intl.NumberFormat with compact so large numbers stay readable (e.g. ₦2.4M).
   */
  const fmt: FmtFn = useCallback((n: number, sourceCurrency?: string) => {
    const converted = sourceCurrency
      ? parseFloat(convertToDisplay(n, sourceCurrency, false))
      : n;
    try {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: userCurrency.code,
        notation: 'compact',
        maximumFractionDigits: 1,
      }).format(isNaN(converted) ? n : converted);
    } catch {
      // Fallback if the browser doesn't support a given currency code
      return `${userCurrency.symbol}${(isNaN(converted) ? n : converted).toLocaleString()}`;
    }
  }, [convertToDisplay, userCurrency]);
  // ────────────────────────────────────────────────────────────────────────

  const [activeTab, setActiveTab] = useState<'capex' | 'opex'>('capex');
  const [fiscalYears, setFiscalYears] = useState<any[]>([]);

  useEffect(() => {
    fetchFiscalYears().then(res => setFiscalYears(Array.isArray(res) ? res : (res as any)?.data || []));
  }, [fetchFiscalYears]);

  const tabs = [
    { id: 'capex' as const, label: 'CAPEX Portfolio Intelligence', icon: <Briefcase size={15} />, accent: '#6366f1', description: 'Project portfolio burn rates, WBS variance & LPO commitments' },
    { id: 'opex' as const, label: 'OPEX Command Center', icon: <Building2 size={15} />, accent: '#0ea5e9', description: 'Department expenditure, payroll decomposition & budget runway' },
  ];

  return (
    <>
      <Head>
        <title>Financial Intelligence | SentinelFi</title>
        <meta name="description" content="Executive-level CAPEX and OPEX intelligence dashboards for real-time financial oversight." />
      </Head>

      <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0f0f1a 0%, #12121f 50%, #0a0a15 100%)', fontFamily: "'Inter', 'Segoe UI', sans-serif", padding: '24px 28px' }}>
        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
            <div style={{ width: 36, height: 36, background: 'linear-gradient(135deg, #6366f1, #0ea5e9)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Activity size={18} style={{ color: '#fff' }} />
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#fff', letterSpacing: '-0.02em' }}>Financial Intelligence</h1>
              <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
                Executive-level CAPEX &amp; OPEX oversight — live from database &nbsp;·&nbsp;
                <span style={{ color: '#6366f1' }}>{userCurrency.code} ({userCurrency.symbol})</span>
              </p>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div style={{ display: 'flex', marginBottom: 24, background: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: 4, border: '1px solid rgba(255,255,255,0.06)', width: 'fit-content' }}>
          {tabs.map(tab => {
            const isActive = activeTab === tab.id;
            return (
              <button key={tab.id} id={`tab-${tab.id}`} onClick={() => setActiveTab(tab.id)}
                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', borderRadius: 9, border: 'none', cursor: 'pointer', transition: 'all 0.2s', background: isActive ? `linear-gradient(135deg, ${tab.accent}22, ${tab.accent}11)` : 'transparent', color: isActive ? '#fff' : 'rgba(255,255,255,0.45)', fontWeight: isActive ? 600 : 400, fontSize: 13, boxShadow: isActive ? `inset 0 0 0 1px ${tab.accent}44` : 'none' }}>
                <span style={{ color: isActive ? tab.accent : 'rgba(255,255,255,0.3)' }}>{tab.icon}</span>
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Active tab hint */}
        <div style={{ marginBottom: 20, paddingLeft: 4 }}>
          <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,0.35)', borderLeft: `3px solid ${activeTab === 'capex' ? '#6366f1' : '#0ea5e9'}`, paddingLeft: 10 }}>
            {tabs.find(t => t.id === activeTab)?.description}
          </p>
        </div>

        {/* Dashboard content */}
        {activeTab === 'capex' && <CapexDashboard fetchCapexDashboard={fetchCapexDashboard} fmt={fmt} />}
        {activeTab === 'opex' && <OpexDashboard fetchOpexDashboard={fetchOpexDashboard} fiscalYears={fiscalYears} fmt={fmt} />}
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        select option { background: #1e1e2e; color: #fff; }
      `}</style>
    </>
  );
};

export default FinancialIntelligencePage;
