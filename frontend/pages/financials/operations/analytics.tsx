import React, { useState, useEffect, useMemo } from 'react';
import Head from 'next/head';
import PageContainer from '../../../components/Layout/PageContainer';
import Card from '../../../components/common/Card';
import Button from '../../../components/common/Button';
import { useFinanceCore } from '../../../hooks/useFinanceCore';
import { useCurrency } from '../../../components/context/CurrencyContext';
import {
  BarChart2,
  TrendingUp,
  TrendingDown,
  Calendar,
  Filter,
  Download,
  AlertTriangle,
  CheckCircle2,
  Layers,
  PieChart,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import toast from 'react-hot-toast';
import Tooltip from '../../../components/common/Tooltip';
import { HelpCircle } from 'lucide-react';

const CorporateAnalyticsPage: React.FC = () => {
  const { convertToDisplay } = useCurrency();
  const {
    loading,
    fetchFiscalYears,
    fetchDepartments,
    fetchOperationalAnalytics
  } = useFinanceCore();

  const [fiscalYears, setFiscalYears] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [analyticsData, setAnalyticsData] = useState<any>(null);

  // Filters
  const [selectedYearId, setSelectedYearId] = useState('');
  const [selectedCostCenterId, setSelectedCostCenterId] = useState('');

  useEffect(() => {
    const init = async () => {
      const [fy, depts] = await Promise.all([
        fetchFiscalYears(),
        fetchDepartments()
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
    const res = await fetchOperationalAnalytics(selectedYearId, selectedCostCenterId || undefined);
    if (res) setAnalyticsData(res.data);
  };

  const getHealthColor = (variancePercent: number) => {
    if (variancePercent < 0) return 'text-red-400';
    if (variancePercent < 10) return 'text-yellow-400';
    return 'text-green-400';
  };

  // Calculate some derived metrics
  const burnRate = useMemo(() => {
    if (!analyticsData || analyticsData.periods.length === 0) return 0;
    const totalActual = analyticsData.totals.actual;
    const periodsPassed = analyticsData.periods.filter((p: any) => p.actual > 0).length || 1;
    return totalActual / periodsPassed;
  }, [analyticsData]);

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
            <Button variant="outline" size="sm" icon={<Download className="w-4 h-4" />}>Export PDF</Button>
          </div>
        }
      >
        {analyticsData ? (
          <>
            {/* Top Stat Ribbon */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800 rounded-2xl p-6 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-24 h-24 bg-brand-primary/5 rounded-full -mr-12 -mt-12 group-hover:scale-110 transition-transform duration-700" />
                <div className="flex items-center gap-1.5 mb-2">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Annual Utilization</p>
                  <Tooltip content="Percentage of the total authorized budget that has been either spent (actual) or committed (pending invoices/LPOs).">
                    <HelpCircle className="w-3 h-3 text-slate-700 hover:text-brand-primary transition cursor-help" />
                  </Tooltip>
                </div>
                <div className="flex items-baseline gap-2">
                  <h3 className="text-3xl font-black text-white tracking-tighter">
                    {((analyticsData.totals.actual / (analyticsData.totals.allocated || 1)) * 100).toFixed(1)}%
                  </h3>
                  <span className="text-[10px] font-bold text-emerald-400 flex items-center bg-emerald-500/10 px-1.5 py-0.5 rounded-full">
                    <ArrowUpRight size={10} className="mr-0.5" /> 2.1%
                  </span>
                </div>
              </div>

              <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800 rounded-2xl p-6 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full -mr-12 -mt-12 group-hover:scale-110 transition-transform duration-700" />
                <div className="flex items-center gap-1.5 mb-2">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Avg. Monthly Burn</p>
                  <Tooltip content="The average rate at which the organization is consuming its operational budget per fiscal period based on historical actuals.">
                    <HelpCircle className="w-3 h-3 text-slate-700 hover:text-blue-400 transition cursor-help" />
                  </Tooltip>
                </div>
                <h3 className="text-3xl font-black text-white tracking-tighter">{convertToDisplay(burnRate, 'NGN')}</h3>
              </div>

              <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800 rounded-2xl p-6 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-24 h-24 bg-brand-primary/10 rounded-full -mr-12 -mt-12 group-hover:scale-110 transition-transform duration-700" />
                <div className="flex items-center gap-1.5 mb-2">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Projected Saving</p>
                  <Tooltip content="The favorable variance identified between authorized allocations and actual consumption across the fiscal cycle.">
                    <HelpCircle className="w-3 h-3 text-slate-700 hover:text-brand-primary transition cursor-help" />
                  </Tooltip>
                </div>
                <h3 className="text-3xl font-black text-brand-primary tracking-tighter">{convertToDisplay(analyticsData.totals.variance, 'NGN')}</h3>
              </div>

              <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800 rounded-2xl p-6 relative overflow-hidden group border-b-4 border-b-yellow-500/30">
                <div className="flex items-center gap-1.5 mb-2">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Committed Runway</p>
                  <Tooltip content="Funds already encumbered through issued Purchase Orders but not yet settled through final payments.">
                    <HelpCircle className="w-3 h-3 text-slate-700 hover:text-yellow-500 transition cursor-help" />
                  </Tooltip>
                </div>
                <h3 className="text-3xl font-black text-yellow-500 tracking-tighter">{convertToDisplay(analyticsData.totals.committed, 'NGN')}</h3>
              </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-8">
              {/* Waterfall Expenditure Chart */}
              <Card
                className="xl:col-span-2 bg-slate-900/40 border-slate-800 shadow-2xl"
                title="Fiscal Expenditure Waterfall"
                subtitle="Monthly comparison of Allocated Budget vs. Actual Spend + Commitments."
              >
                <div className="h-72 flex items-end justify-between gap-3 pt-12 pb-6 px-4">
                  {analyticsData.periods.map((period: any) => {
                    const max = Math.max(...analyticsData.periods.map((p: any) => p.allocated)) || 1;
                    const allocHeight = (period.allocated / max) * 100;
                    const actualHeight = (period.actual / max) * 100;
                    const commHeight = (period.committed / max) * 100;

                    return (
                      <div key={period.periodId} className="flex-1 group relative flex flex-col items-center h-full">
                        <div className="w-full flex justify-center items-end gap-1.5 h-full">
                          {/* Allocated Bar */}
                          <div
                            className="w-3 bg-slate-800/80 rounded-t-md transition-all group-hover:bg-slate-700 shadow-inner"
                            style={{ height: `${allocHeight}%` }}
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
                        <span className="text-[9px] font-black text-slate-500 uppercase mt-4 tracking-widest">{period.periodName}</span>

                        {/* Tooltip */}
                        <div className="absolute bottom-full mb-4 opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none z-20 translate-y-2 group-hover:translate-y-0">
                          <div className="bg-slate-950 border border-slate-800 p-3 rounded-xl shadow-2xl text-[10px] whitespace-nowrap backdrop-blur-md">
                            <p className="text-slate-500 mb-2 font-black uppercase tracking-widest border-b border-slate-800 pb-1">{period.periodName} Fiscal Dossier</p>
                            <div className="space-y-2">
                              <div className="flex justify-between gap-6"><span className="text-slate-600 uppercase font-black">Authorized:</span> <span className="text-white font-mono">{convertToDisplay(period.allocated, 'NGN')}</span></div>
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
                <Card title="Budget Health Index" className="bg-slate-900/40 border-slate-800 shadow-xl">
                  <div className="space-y-8">
                    {analyticsData.periods.filter((p: any) => p.allocated > 0).slice(-3).map((p: any) => {
                      const util = (p.actual / (p.allocated || 1)) * 100;
                      return (
                        <div key={p.periodId} className="group">
                          <div className="flex justify-between items-center mb-2.5">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{p.periodName} Utilization</span>
                            <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${util > 100 ? 'bg-red-500/10 text-red-400' : 'bg-green-500/10 text-green-400'}`}>
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
                        <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Core Spending Drivers</p>
                        <Tooltip content="Top categories contributing to the current fiscal period's operational expenditure.">
                          <HelpCircle className="w-3 h-3 text-slate-700 hover:text-slate-400 cursor-help" />
                        </Tooltip>
                      </div>
                      <div className="space-y-3">
                        <div className="flex items-center gap-3 text-[11px] p-3 bg-slate-950/40 border border-slate-800/40 rounded-xl">
                          <div className="w-2.5 h-2.5 rounded-full bg-brand-primary shadow-[0_0_5px_rgba(var(--brand-primary-rgb),0.5)]" />
                          <span className="text-slate-400 font-bold uppercase tracking-tight">Fixed Salaries</span>
                          <span className="ml-auto font-black text-white italic">62%</span>
                        </div>
                        <div className="flex items-center gap-3 text-[11px] p-3 bg-slate-950/40 border border-slate-800/40 rounded-xl">
                          <div className="w-2.5 h-2.5 rounded-full bg-yellow-500 shadow-[0_0_5px_rgba(234,179,8,0.5)]" />
                          <span className="text-slate-400 font-bold uppercase tracking-tight">Marketing Opex</span>
                          <span className="ml-auto font-black text-white italic">18%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              </div>
            </div>

            {/* Detailed Rollup Table */}
            <Card title="Operational Ledger Rollup" subtitle="Granular period-by-period recursive financial audit." className="bg-slate-900/40 border-slate-800 shadow-2xl">
              <div className="overflow-x-auto rounded-xl border border-slate-800/50">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-950/60 border-b border-slate-800 font-black text-[10px] text-slate-500 uppercase tracking-[0.2em]">
                      <th className="p-5">Strategic Period</th>
                      <th className="p-5 text-right">Authorized</th>
                      <th className="p-5 text-right">Settled Spend</th>
                      <th className="p-5 text-right">Encumbered</th>
                      <th className="p-5 text-right">Fiscal Variance</th>
                      <th className="p-5 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/40">
                    {analyticsData.periods.map((period: any) => {
                      const variance = period.allocated - period.actual - period.committed;
                      const variancePercent = (variance / (period.allocated || 1)) * 100;
                      return (
                        <tr key={period.periodId} className="hover:bg-brand-primary/[0.03] transition-colors group">
                          <td className="p-5 font-black text-slate-200 text-xs tracking-tight uppercase">{period.periodName}</td>
                          <td className="p-5 text-right font-mono text-xs text-slate-400">{convertToDisplay(period.allocated, 'NGN')}</td>
                          <td className="p-5 text-right font-mono text-xs text-brand-primary font-black italic">{convertToDisplay(period.actual, 'NGN')}</td>
                          <td className="p-5 text-right font-mono text-xs text-yellow-500">{convertToDisplay(period.committed, 'NGN')}</td>
                          <td className={`p-5 text-right font-mono text-xs font-black ${getHealthColor(variancePercent)}`}>
                            {convertToDisplay(variance, 'NGN')}
                          </td>
                          <td className="p-5 text-center">
                            {variance < 0 ? (
                              <div className="inline-flex p-1.5 bg-red-500/10 rounded-full text-red-500 border border-red-500/20"><AlertTriangle size={14} /></div>
                            ) : (
                              <div className="inline-flex p-1.5 bg-emerald-500/10 rounded-full text-emerald-500 border border-emerald-500/20"><CheckCircle2 size={14} /></div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                    <tr className="bg-brand-primary/5 font-black border-t-2 border-brand-primary/20 backdrop-blur-sm">
                      <td className="p-6 text-white uppercase text-[10px] tracking-[0.2em]">Annual Intelligence Summary</td>
                      <td className="p-6 text-right font-mono text-white text-sm">{convertToDisplay(analyticsData.totals.allocated, 'NGN')}</td>
                      <td className="p-6 text-right font-mono text-brand-primary text-sm">{convertToDisplay(analyticsData.totals.actual, 'NGN')}</td>
                      <td className="p-6 text-right font-mono text-yellow-500 text-sm">{convertToDisplay(analyticsData.totals.committed, 'NGN')}</td>
                      <td className={`p-6 text-right font-mono text-sm ${getHealthColor((analyticsData.totals.variance / (analyticsData.totals.allocated || 1)) * 100)}`}>
                        {convertToDisplay(analyticsData.totals.variance, 'NGN')}
                      </td>
                      <td className="p-6"></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </Card>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center p-24 bg-brand-dark/20 border border-gray-800 rounded-3xl border-dashed">
            <PieChart className="w-16 h-16 text-gray-800 mb-6 animate-pulse" />
            <p className="text-gray-500 font-bold mb-2">No Analytics Data Available</p>
            <p className="text-xs text-gray-600 max-w-xs text-center">
              Select a valid Fiscal Year and Cost Center to generate intelligence reports.
            </p>
          </div>
        )}
      </PageContainer>
    </>
  );
};

export default CorporateAnalyticsPage;
