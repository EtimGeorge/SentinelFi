import React, { useState, useEffect, useMemo } from 'react';
import Head from 'next/head';
import PageContainer from '../../../components/Layout/PageContainer';
import Card from '../../../components/common/Card';
import { useFinanceCore } from '../../../hooks/useFinanceCore';
import { useCurrency } from '../../../components/context/CurrencyContext';
import { OpexAnalytics, OpexAnalyticsSeries, OpexAnalyticsSeriesDepartment, OpexAnalyticsPeriodRow, OpexAnalyticsMonthlyTrend, OpexAnalyticsRecentExpense } from '@shared/types/operational-budget';
import {
  TrendingDown, AlertTriangle, CheckCircle2, Layers, PieChart, ArrowUpRight, ArrowDownRight
} from 'lucide-react';
import DataTable from '../../../components/common/DataTable';
import Tooltip from '../../../components/common/Tooltip';
import { HelpCircle } from 'lucide-react';
import { ErrorBoundary } from '../../../components/common/ErrorBoundary';
import EmptyState from '../../../components/common/EmptyState';
import { KPISkeleton, ChartSkeleton, TableSkeleton, CardSkeleton } from '../../../components/common/LoadingSkeleton';

const CorporateAnalyticsPage: React.FC = () => {
  const { convertToDisplay } = useCurrency();
  const {
    loading, fetchFiscalYears, fetchDepartments, getOpexAnalytics
  } = useFinanceCore();

  const [fiscalYears, setFiscalYears] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<OpexAnalytics | null>(null);

  // Filters
  const [selectedYearId, setSelectedYearId] = useState('');
  const [selectedCostCenterId, setSelectedCostCenterId] = useState('');

  useEffect(() => {
    const init = async () => {
      const [fy, depts] = await Promise.all([
        fetchFiscalYears(), fetchDepartments()
      ]);
      setFiscalYears(fy || []);
      setDepartments(depts.data || []);

      if (fy && fy.length > 0) {
        setSelectedYearId(fy[0].id);
      }
    };
    init();
  }, []);

  useEffect(() => {
    if (selectedYearId) {
      loadAnalytics();
    }
  }, [selectedYearId, selectedCostCenterId]);

  const loadAnalytics = async () => {
    const data = await getOpexAnalytics({ fiscalYearId: selectedYearId, costCenterId: selectedCostCenterId || undefined });
    setAnalytics(data);
  };

  const spendTrend = useMemo(() => {
    if (!analytics || analytics.byPeriod.length < 2) return null;
    const withActual = analytics.byPeriod.filter(p => Number(p.actual) > 0);
    if (withActual.length < 2) return null;
    const last = withActual[withActual.length - 1];
    const prev = withActual[withActual.length - 2];
    if (!Number(prev.actual)) return null;
    const pct = ((Number(last.actual) - Number(prev.actual)) / Number(prev.actual)) * 100;
    return { pct, up: pct >= 0 };
  }, [analytics]);

  const spendDrivers = useMemo(() => {
    if (!analytics) return [];
    const cats = analytics.byCategory;
    const total = cats.reduce((s, c) => s + Number(c.actual || 0), 0);
    return cats
      .slice()
      .sort((a, b) => Number(b.actual || 0) - Number(a.actual || 0))
      .slice(0, 2)
      .map((c) => ({ name: c.name, pct: total > 0 ? (Number(c.actual) / total) * 100 : 0 }));
  }, [analytics]);

  const getHealthColor = (variancePercent: number) => {
    if (variancePercent < 0) return 'text-red-400';
    if (variancePercent < 10) return 'text-yellow-400';
    return 'text-green-400';
  };

  const ClassificationBadge = ({ classification }: { classification?: string | null }) => {
    if (!classification) return <span className="text-xs font-semibold text-slate-600 italic">—</span>;
    if (classification === 'PERMANENT_VARIANCE') {
      return (
        <Tooltip content="Structural overspend vs the full operational budget — requires reallocation or re-baselining.">
          <span className="inline-flex items-center gap-1 text-[11px] font-black text-red-400 bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded-full cursor-help">PERMANENT</span>
        </Tooltip>
      );
    }
    return (
      <Tooltip content="Timing variance — spending shifted periods but still inside the overall budget envelope.">
        <span className="inline-flex items-center gap-1 text-[11px] font-black text-yellow-400 bg-yellow-500/10 border border-yellow-500/20 px-2 py-0.5 rounded-full cursor-help">TIMING</span>
      </Tooltip>
    );
  };

  const EncumbranceBadge = ({ status }: { status?: string | null }) => {
    const map: Record<string, { label: string; cls: string }> = {
        RESERVED: { label: 'RESERVED', cls: 'text-blue-400 bg-blue-500/10 border-blue-500/20' },
        FIRM: { label: 'FIRM', cls: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20' },
        LIQUIDATED: { label: 'LIQUIDATED', cls: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
        RELEASED: { label: 'RELEASED', cls: 'text-slate-400 bg-slate-500/10 border-slate-500/20' },
    };
    const item = status ? map[status] : null;
    if (!item) return <span className="text-xs font-semibold text-slate-600 italic">—</span>;
    return <span className={`inline-flex items-center text-[11px] font-black border px-2 py-0.5 rounded-full ${item.cls}`}>{item.label}</span>;
  };

  // Calculate some derived metrics
  const burnRate = useMemo(() => {
    if (!analytics || analytics.monthlyTrend.length === 0) return 0;
    const totalActual = analytics.totals.actual;
    const monthsPassed = analytics.monthlyTrend.filter(m => m.actual > 0).length || 1;
    return totalActual / monthsPassed;
  }, [analytics]);

  return (
    <>
      <Head>
        <title>Corporate Analytics | SentinelFi</title>
      </Head>

      <PageContainer
        title="Corporate Operational Intelligence"
        subtitle="Executive-level visualization of organizational budget consumption and fiscal performance."
        headerContent={
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-gray-800/50 p-1 rounded-xl border border-gray-700">
              <select
                className="bg-transparent border-none text-xs font-bold text-gray-300 outline-none px-2 py-1"
                value={selectedYearId}
                onChange={(e) => setSelectedYearId(e.target.value)}
              >
                {fiscalYears.map(fy => (
                  <option key={fy.id} value={fy.id}>FY {fy.year_label}</option>
                ))}
              </select>

              <div className="w-px h-4 bg-gray-700 mx-1" />

              <select
                className="bg-transparent border-none text-xs font-bold text-gray-300 outline-none px-2 py-1 max-w-[150px]"
                value={selectedCostCenterId}
                onChange={(e) => setSelectedCostCenterId(e.target.value)}
              >
                <option value="">All Cost Centers</option>
                {departments.map(dept => (
                  <optgroup key={dept.id} label={dept.name}>
                    {dept.costCenters?.map((cc: any) => (
                      <option key={cc.id} value={cc.id}>{cc.name}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>
          </div>
        }
      >
        <ErrorBoundary>
          {loading && !analytics ? (
            <div className="space-y-8">
              <KPISkeleton />
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                <ChartSkeleton height={300} />
                <CardSkeleton lines={6} />
              </div>
              <TableSkeleton columns={6} rows={5} />
            </div>
          ) : analytics ? (
            <>
              {/* Top Stat Ribbon */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800 rounded-2xl p-6 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-brand-primary/5 rounded-full -mr-12 -mt-12 group-hover:scale-110 transition-transform duration-700" />
                  <div className="flex items-center gap-1.5 mb-2">
                    <p className="text-xs font-black text-slate-500 ">Total Budgeted</p>
                    <Tooltip content="Total authorized operational budget allocated across the selected fiscal window.">
                      <HelpCircle className="w-3 h-3 text-slate-700 hover:text-brand-primary transition cursor-help" />
                    </Tooltip>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <h3 className="text-3xl font-black text-white tracking-tighter">
                      {convertToDisplay(analytics.totals.budgeted, 'NGN')}
                    </h3>
                  </div>
                </div>

                <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800 rounded-2xl p-6 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full -mr-12 -mt-12 group-hover:scale-110 transition-transform duration-700" />
                  <div className="flex items-center gap-1.5 mb-2">
                    <p className="text-xs font-black text-slate-500 ">Actual Spend</p>
                    <Tooltip content="Total settled operational expenditure for the selected window.">
                      <HelpCircle className="w-3 h-3 text-slate-700 hover:text-blue-400 transition cursor-help" />
                    </Tooltip>
                  </div>
                  <h3 className="text-3xl font-black text-white tracking-tighter">{convertToDisplay(analytics.totals.actual, 'NGN')}</h3>
                  {spendTrend !== null && (
                    <span className={`text-xs font-bold flex items-center bg-emerald-500/10 px-1.5 py-0.5 rounded-full mt-2 w-fit ${spendTrend.up ? 'text-emerald-400' : 'text-red-400'}`}>
                      {spendTrend.up ? <ArrowUpRight size={10} className="mr-0.5" /> : <ArrowDownRight size={10} className="mr-0.5" />} {Math.abs(spendTrend.pct).toFixed(1)}% vs prior period
                    </span>
                  )}
                </div>

                <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800 rounded-2xl p-6 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-brand-primary/10 rounded-full -mr-12 -mt-12 group-hover:scale-110 transition-transform duration-700" />
                  <div className="flex items-center gap-1.5 mb-2">
                    <p className="text-xs font-black text-slate-500 ">Fiscal Variance</p>
                    <Tooltip content="Budgeted minus actual and committed spend. A positive value indicates headroom; negative indicates overrun.">
                      <HelpCircle className="w-3 h-3 text-slate-700 hover:text-brand-primary transition cursor-help" />
                    </Tooltip>
                  </div>
                  <h3 className={`text-3xl font-black tracking-tighter ${getHealthColor(analytics.totals.variancePct)}`}>{convertToDisplay(analytics.totals.variance, 'NGN')}</h3>
                  <span className={`text-xs font-bold flex items-center bg-emerald-500/10 px-1.5 py-0.5 rounded-full mt-2 w-fit ${getHealthColor(analytics.totals.variancePct)}`}>
                    {analytics.totals.variancePct.toFixed(1)}% variance
                  </span>
                </div>

                <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800 rounded-2xl p-6 relative overflow-hidden group border-b-4 border-b-yellow-500/30">
                  <div className="flex items-center gap-1.5 mb-2">
                    <p className="text-xs font-black text-slate-500 ">Committed Runway</p>
                    <Tooltip content="Funds already encumbered through issued Purchase Orders but not yet settled through final payments.">
                      <HelpCircle className="w-3 h-3 text-slate-700 hover:text-yellow-500 transition cursor-help" />
                    </Tooltip>
                  </div>
                  <h3 className="text-3xl font-black text-yellow-500 tracking-tighter">{convertToDisplay(analytics.totals.committed, 'NGN')}</h3>
                  <p className="text-xs text-slate-500 font-bold mt-2">Avg. Monthly Burn {convertToDisplay(burnRate, 'NGN')}</p>
                </div>
              </div>

              {/* Phase 4 — Pipeline-Adjusted Headroom + Rolling Forecast */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800 rounded-2xl p-6 relative overflow-hidden group border-b-4 border-b-emerald-500/40">
                  <div className="flex items-center gap-1.5 mb-2">
                    <p className="text-xs font-black text-slate-500 ">Remaining Headroom</p>
                    <Tooltip content="Pipeline-adjusted remaining spend = Budgeted − Settled − Committed. This is the real capacity a planner can still commit.">
                      <HelpCircle className="w-3 h-3 text-slate-700 hover:text-emerald-500 transition cursor-help" />
                    </Tooltip>
                  </div>
                  <h3 className={`text-3xl font-black tracking-tighter ${analytics.totals.remaining < 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                    {convertToDisplay(analytics.totals.remaining, 'NGN')}
                  </h3>
                  <span className={`text-xs font-bold flex items-center bg-emerald-500/10 px-1.5 py-0.5 rounded-full mt-2 w-fit ${analytics.totals.remaining < 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                    {analytics.totals.remaining < 0 ? 'Oversubscribed' : 'Available to commit'}
                  </span>
                </div>

                <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800 rounded-2xl p-6 relative overflow-hidden group">
                  <div className="flex items-center gap-1.5 mb-2">
                    <p className="text-xs font-black text-slate-500 ">Rolling Forecast</p>
                    <Tooltip content="Forecast = settled actuals + the encumbered pipeline yet to be realised. The bridge the plan must absorb.">
                      <HelpCircle className="w-3 h-3 text-slate-700 hover:text-blue-400 transition cursor-help" />
                    </Tooltip>
                  </div>
                  <h3 className="text-3xl font-black text-blue-400 tracking-tighter">{convertToDisplay(analytics.totals.forecast, 'NGN')}</h3>
                  <p className="text-xs text-slate-500 font-bold mt-2">Actuals + Encumbered Pipeline</p>
                </div>

                <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800 rounded-2xl p-6 relative overflow-hidden group">
                  <div className="flex items-center gap-1.5 mb-2">
                    <p className="text-xs font-black text-slate-500 ">Variance Classification</p>
                    <Tooltip content="Variances classified as PERMANENT (structural overspend vs the full budget) or TIMING (period shift with budget-level headroom).">
                      <HelpCircle className="w-3 h-3 text-slate-700 hover:text-brand-primary transition cursor-help" />
                    </Tooltip>
                  </div>
                  <div className="flex flex-col gap-2 mt-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-black text-red-400 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-red-500 inline-block" /> PERMANENT
                      </span>
                      <span className="font-black text-white font-mono">
                        {analytics.byCategory.filter((c) => c.classification === 'PERMANENT_VARIANCE').length}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-black text-yellow-400 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-yellow-500 inline-block" /> TIMING
                      </span>
                      <span className="font-black text-white font-mono">
                        {analytics.byCategory.filter((c) => c.classification === 'TIMING_VARIANCE').length}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-8">
                {/* Waterfall Expenditure Chart */}
                <Card
                  className="xl:col-span-2 bg-slate-900/40 border-slate-800 elev-lg"
                  title="Fiscal Expenditure Waterfall"
                  subtitle="Period-by-period comparison of Budgeted vs. Actual Spend + Commitments."
                >
                  <div className="h-72 flex items-end justify-between gap-3 pt-12 pb-6 px-4">
                    {analytics.byPeriod.map((period: OpexAnalyticsPeriodRow) => {
                      const max = Math.max(...analytics.byPeriod.map((p) => p.budgeted)) || 1;
                      const budgetedHeight = (period.budgeted / max) * 100;
                      const actualHeight = (period.actual / max) * 100;
                      const commHeight = (period.committed / max) * 100;

                      return (
                        <div key={period.period} className="flex-1 group relative flex flex-col items-center h-full">
                          <div className="w-full flex justify-center items-end gap-1.5 h-full">
                            {/* Budgeted Bar */}
                            <div
                              className="w-3 bg-slate-800/80 rounded-t-md transition-all group-hover:bg-slate-700 shadow-inner"
                              style={{ height: `${budgetedHeight}%` }}
                            />
                            {/* Actual + Committed Stack */}
                            <div className="w-5 flex flex-col-reverse justify-start h-full">
                              <div
                                className="bg-brand-primary rounded-t-md transition-all group-hover:brightness-110 shadow-[0_0_15px_rgba(var(--brand-primary-rgb),0.2)]"
                                style={{ height: `${actualHeight}%` }}
                              />
                              <div
                                className="bg-yellow-500/40 rounded-t-md border-t border-yellow-500/20"
                                style={{ height: `${commHeight}%` }}
                              />
                            </div>
                          </div>
                          <span className="text-xs font-black text-slate-500 uppercase mt-4 ">{period.period}</span>

                          {/* Tooltip */}
                          <div className="absolute bottom-full mb-4 opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none z-20 translate-y-2 group-hover:translate-y-0">
                            <div className="bg-slate-950 border border-slate-800 p-3 rounded-xl elev-lg text-xs whitespace-nowrap backdrop-blur-md">
                              <p className="text-slate-500 mb-2 font-black  border-b border-slate-800 pb-1">{period.period} Fiscal Dossier</p>
                              <div className="space-y-2">
                                <div className="flex justify-between gap-6"><span className="text-slate-600 uppercase font-black">Budgeted:</span> <span className="text-white font-mono">{convertToDisplay(period.budgeted, 'NGN')}</span></div>
                                <div className="flex justify-between gap-6"><span className="text-brand-primary uppercase font-black">Settled:</span> <span className="text-brand-primary font-mono">{convertToDisplay(period.actual, 'NGN')}</span></div>
                                <div className="flex justify-between gap-6"><span className="text-yellow-500 uppercase font-black">Encumbered:</span> <span className="text-yellow-500 font-mono">{convertToDisplay(period.committed, 'NGN')}</span></div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </Card>

                {/* Right Side: Quick Pivot Stats */}
                <div className="space-y-6">
                  <Card title="Budget Health Index" className="bg-slate-900/40 border-slate-800 elev-lg">
                    <div className="space-y-8">
                      {analytics.byPeriod.filter((p) => p.budgeted > 0).slice(-3).map((p) => {
                        const util = (p.actual / (p.budgeted || 1)) * 100;
                        return (
                          <div key={p.period} className="group">
                            <div className="flex justify-between items-center mb-2.5">
                              <span className="text-xs font-black text-slate-400 ">{p.period} Utilization</span>
                              <span className={`text-xs font-black px-2 py-0.5 rounded-full ${util > 100 ? 'bg-red-500/10 text-red-400' : 'bg-green-500/10 text-green-400'}`}>
                                {util.toFixed(1)}%
                              </span>
                            </div>
                            <div className="h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800/50 shadow-inner">
                              <div
                                className={`h-full rounded-full transition-all duration-1000 shadow-[0_0_10px_rgba(var(--brand-primary-rgb),0.3)] ${util > 100 ? 'bg-red-500' : 'bg-brand-primary'}`}
                                style={{ width: `${Math.min(util, 100)}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}

                      <div className="pt-6 border-t border-slate-800 mt-6">
                        <div className="flex items-center gap-2 mb-4">
                          <p className="text-xs text-slate-500 font-black ">Core Spending Drivers</p>
                          <Tooltip content="Top categories contributing to the current fiscal period's operational expenditure.">
                            <HelpCircle className="w-3 h-3 text-slate-700 hover:text-slate-400 cursor-help" />
                          </Tooltip>
                        </div>
                        <div className="space-y-3">
                          {spendDrivers.length > 0 && (
                            <div className="flex items-center gap-3 text-xs p-3 bg-slate-950/40 border border-slate-800/40 rounded-xl">
                              <div className="w-2.5 h-2.5 rounded-full bg-brand-primary shadow-[0_0_5px_rgba(var(--brand-primary-rgb),0.5)] shrink-0" />
                              <span className="text-slate-400 font-bold uppercase tracking-tight flex-1 min-w-0 truncate">{spendDrivers[0].name}</span>
                              <span className="ml-auto font-black text-white italic">{spendDrivers[0].pct.toFixed(0)}%</span>
                            </div>
                          )}
                          {spendDrivers.length > 1 && (
                            <div className="flex items-center gap-3 text-xs p-3 bg-slate-950/40 border border-slate-800/40 rounded-xl">
                              <div className="w-2.5 h-2.5 rounded-full bg-yellow-500 shadow-[0_0_5px_rgba(234,179,8,0.5)] shrink-0" />
                              <span className="text-slate-400 font-bold uppercase tracking-tight flex-1 min-w-0 truncate">{spendDrivers[1].name}</span>
                              <span className="ml-auto font-black text-white italic">{spendDrivers[1].pct.toFixed(0)}%</span>
                            </div>
                          )}
                          {spendDrivers.length === 0 && (
                            <p className="text-xs text-slate-600 font-semibold italic">No category spend recorded this period.</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </Card>
                </div>
              </div>

              {/* Category + Department Breakdown */}
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-8">
                <Card title="Category Breakdown" subtitle="Budgeted vs actual consumption by expense category." className="bg-slate-900/40 border-slate-800 elev-lg">
                  {analytics.byCategory.length > 0 ? (
                    <DataTable
                      columns={[
                        { key: 'name', label: 'Category', tier: 'P0', get: (c: OpexAnalyticsSeries) => (
                          <span className="font-black text-slate-200 text-xs tracking-tight uppercase">{c.name}</span>
                        )},
                        { key: 'budgeted', label: 'Budgeted', tier: 'P1', cellClassName: 'text-right font-mono text-xs text-slate-400', get: (c: OpexAnalyticsSeries) => convertToDisplay(c.budgeted, 'NGN') },
                        { key: 'actual', label: 'Actual', tier: 'P1', cellClassName: 'text-right font-mono text-xs text-brand-primary font-black', get: (c: OpexAnalyticsSeries) => convertToDisplay(c.actual, 'NGN') },
                        { key: 'committed', label: 'Committed', tier: 'P2', cellClassName: 'text-right font-mono text-xs text-yellow-500', get: (c: OpexAnalyticsSeries) => convertToDisplay(c.committed, 'NGN') },
                        { key: 'variance', label: 'Variance', tier: 'P2', cellClassName: 'text-right font-mono text-xs font-black', get: (c: OpexAnalyticsSeries) => (
                          <span className={getHealthColor(c.budgeted > 0 ? (c.variance / c.budgeted) * 100 : 0)}>{convertToDisplay(c.variance, 'NGN')}</span>
                        )},
                        { key: 'classification', label: 'Class', tier: 'P2', cellClassName: 'text-center', get: (c: OpexAnalyticsSeries) => (
                          <ClassificationBadge classification={c.classification} />
                        )},
                      ]}
                      rows={analytics.byCategory}
                      rowKey={(c) => c.categoryId}
                    />
                  ) : (
                    <EmptyState icon={<PieChart className="w-10 h-10 text-slate-700" />} title="No Category Data" subtitle="No category-level analytics recorded for this period." />
                  )}
                </Card>

                <Card title="Department Allocation" subtitle="Operational consumption mapped by department." className="bg-slate-900/40 border-slate-800 elev-lg">
                  {analytics.byDepartment.length > 0 ? (
                    <DataTable
                      columns={[
                        { key: 'name', label: 'Department', tier: 'P0', get: (d: OpexAnalyticsSeriesDepartment) => (
                          <span className="font-black text-slate-200 text-xs tracking-tight uppercase">{d.name}</span>
                        )},
                        { key: 'budgeted', label: 'Budgeted', tier: 'P1', cellClassName: 'text-right font-mono text-xs text-slate-400', get: (d: OpexAnalyticsSeriesDepartment) => convertToDisplay(d.budgeted, 'NGN') },
                        { key: 'actual', label: 'Actual', tier: 'P1', cellClassName: 'text-right font-mono text-xs text-brand-primary font-black', get: (d: OpexAnalyticsSeriesDepartment) => convertToDisplay(d.actual, 'NGN') },
                        { key: 'committed', label: 'Committed', tier: 'P2', cellClassName: 'text-right font-mono text-xs text-yellow-500', get: (d: OpexAnalyticsSeriesDepartment) => convertToDisplay(d.committed, 'NGN') },
                        { key: 'variance', label: 'Variance', tier: 'P2', cellClassName: 'text-right font-mono text-xs font-black', get: (d: OpexAnalyticsSeriesDepartment) => (
                          <span className={getHealthColor(d.budgeted > 0 ? (d.variance / d.budgeted) * 100 : 0)}>{convertToDisplay(d.variance, 'NGN')}</span>
                        )},
                      ]}
                      rows={analytics.byDepartment}
                      rowKey={(d) => d.departmentId}
                    />
                  ) : (
                    <EmptyState icon={<Layers className="w-10 h-10 text-slate-700" />} title="No Department Data" subtitle="No department-level analytics recorded for this period." />
                  )}
                </Card>
              </div>

              {/* Detailed Rollup + Monthly Trend */}
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-8">
                <Card title="Operational Ledger Rollup" subtitle="Granular period-by-period recursive financial audit." className="xl:col-span-2 bg-slate-900/40 border-slate-800 elev-lg">
                  <DataTable
                    columns={[
                      { key: 'period', label: 'Strategic Period', tier: 'P0', get: (period: OpexAnalyticsPeriodRow) => (
                        <span className="font-black text-slate-200 text-xs tracking-tight uppercase">{period.period}</span>
                      )},
                      { key: 'budgeted', label: 'Authorized', tier: 'P1', cellClassName: 'text-right font-mono text-xs text-slate-400', get: (period: OpexAnalyticsPeriodRow) => convertToDisplay(period.budgeted, 'NGN') },
                      { key: 'actual', label: 'Settled Spend', tier: 'P1', cellClassName: 'text-right font-mono text-xs text-brand-primary font-black italic', get: (period: OpexAnalyticsPeriodRow) => convertToDisplay(period.actual, 'NGN') },
                      { key: 'committed', label: 'Encumbered', tier: 'P2', cellClassName: 'text-right font-mono text-xs text-yellow-500', get: (period: OpexAnalyticsPeriodRow) => convertToDisplay(period.committed, 'NGN') },
                      { key: 'variance', label: 'Fiscal Variance', tier: 'P2', cellClassName: 'text-right font-mono text-xs font-black', get: (period: OpexAnalyticsPeriodRow) => {
                        const variance = period.budgeted - period.actual - period.committed;
                        const variancePercent = (variance / (period.budgeted || 1)) * 100;
                        return (
                          <span className={getHealthColor(variancePercent)}>
                            {convertToDisplay(variance, 'NGN')}
                          </span>
                        );
                      }},
                      { key: 'status', label: 'Status', tier: 'P2', cellClassName: 'text-center', get: (period: OpexAnalyticsPeriodRow) => {
                        const variance = period.budgeted - period.actual - period.committed;
                        return variance < 0 ? (
                          <div className="inline-flex p-1.5 bg-red-500/10 rounded-full text-red-500 border border-red-500/20"><AlertTriangle size={14} /></div>
                        ) : (
                          <div className="inline-flex p-1.5 bg-emerald-500/10 rounded-full text-emerald-500 border border-emerald-500/20"><CheckCircle2 size={14} /></div>
                        );
                      }},
                    ]}
                    rows={[
                      ...analytics.byPeriod,
                      { period: 'Annual Intelligence Summary', budgeted: analytics.totals.budgeted, actual: analytics.totals.actual, committed: analytics.totals.committed },
                    ]}
                    rowKey={(period: OpexAnalyticsPeriodRow) => period.period}
                  />
                </Card>

                <Card title="Monthly Trend" subtitle="Budgeted vs actual consumption per month." className="bg-slate-900/40 border-slate-800 elev-lg">
                  <div className="h-72 flex items-end justify-between gap-2 pt-8 pb-3 px-2">
                    {analytics.monthlyTrend.length > 0 ? (
                      analytics.monthlyTrend.map((m: OpexAnalyticsMonthlyTrend) => {
                        const max = Math.max(...analytics.monthlyTrend.map(x => x.budgeted)) || 1;
                        return (
                          <div key={m.month} className="flex-1 group relative flex flex-col items-center justify-end h-full">
                            <div className="w-full flex justify-center items-end gap-1 h-full">
                              <div
                                className="w-2.5 bg-slate-800/80 rounded-t-md transition-all group-hover:bg-slate-700 shadow-inner"
                                style={{ height: `${(m.budgeted / max) * 100}%` }}
                                title={`${m.month} budgeted: ${convertToDisplay(m.budgeted, 'NGN')}`}
                              />
                              <div
                                className="w-2.5 bg-brand-primary rounded-t-md transition-all group-hover:brightness-110 shadow-[0_0_8px_rgba(var(--brand-primary-rgb),0.15)]"
                                style={{ height: `${(m.actual / max) * 100}%` }}
                                title={`${m.month} actual: ${convertToDisplay(m.actual, 'NGN')}`}
                              />
                            </div>
                            <span className="text-[11px] font-black text-slate-500 mt-2">{m.month}</span>
                          </div>
                        );
                      })
                    ) : (
                      <p className="text-xs text-slate-600 font-semibold italic m-auto pb-10">No monthly trend data recorded.</p>
                    )}
                  </div>
                </Card>
              </div>

              {/* Recent Expense Activity */}
              <Card title="Recent Expense Activity" subtitle="Latest operational expenses across the organization." className="bg-slate-900/40 border-slate-800 elev-lg">
                {analytics.recentExpenses.length > 0 ? (
                  <DataTable
                    columns={[
                      { key: 'date', label: 'Date', tier: 'P1', get: (e: OpexAnalyticsRecentExpense) => (
                        <span className="text-xs text-slate-500 font-mono italic">{new Date(e.date).toLocaleDateString()}</span>
                      )},
                      { key: 'description', label: 'Description', tier: 'P0', get: (e: OpexAnalyticsRecentExpense) => (
                        <span className="text-xs font-medium text-slate-300">{e.description}</span>
                      )},
                      { key: 'category', label: 'Category', tier: 'P1', get: (e: OpexAnalyticsRecentExpense) => (
                        <span className="text-[11px] font-black text-slate-400 uppercase tracking-tight">{e.category || 'Uncategorized'}</span>
                      )},
                      { key: 'status', label: 'Status', tier: 'P2', get: (e: OpexAnalyticsRecentExpense) => (
                        <span className="text-[11px] font-black text-brand-primary uppercase tracking-tight">{e.status}</span>
                      )},
                      { key: 'classification', label: 'Class', tier: 'P2', cellClassName: 'text-center', get: (e: OpexAnalyticsRecentExpense) => (
                        <ClassificationBadge classification={e.classification} />
                      )},
                      { key: 'encumbranceStatus', label: 'Encumbrance', tier: 'P2', cellClassName: 'text-center', get: (e: OpexAnalyticsRecentExpense) => (
                        <EncumbranceBadge status={e.encumbranceStatus} />
                      )},
                      { key: 'amount', label: 'Amount', tier: 'P0', cellClassName: 'text-right font-mono text-xs text-white font-black', get: (e: OpexAnalyticsRecentExpense) => convertToDisplay(e.amount, 'NGN') },
                    ]}
                    rows={analytics.recentExpenses}
                    rowKey={(e) => e.id}
                  />
                ) : (
                  <EmptyState icon={<TrendingDown className="w-10 h-10 text-slate-700" />} title="No Recent Expenses" subtitle="There are no recent operational expense entries to display." />
                )}
              </Card>
            </>
          ) : (
            <EmptyState
              icon={<PieChart className="w-16 h-16 text-brand-primary/40" />}
              title="No Analytics Data Available"
              subtitle="Select a valid Fiscal Year and Cost Center to generate intelligence reports."
            />
          )}
        </ErrorBoundary>
      </PageContainer>
    </>
  );
};

export default CorporateAnalyticsPage;