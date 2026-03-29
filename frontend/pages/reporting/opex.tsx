import React, { useState, useEffect, useMemo } from 'react';
import Head from 'next/head';
import {
  PieChart,
  Download,
  FileText,
  Loader2,
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  Calendar,
  Printer,
  Filter,
  RefreshCw,
  Lock,
  Shield,
  ChevronDown,
  ChevronRight,
  Layers
} from 'lucide-react';
import PageContainer from '../../components/Layout/PageContainer';
import Card from '../../components/common/Card';
import Tooltip from '../../components/common/Tooltip';
import { useSecuredApi } from '../../components/hooks/useSecuredApi';
import toast from 'react-hot-toast';
import { useCurrency } from '../../components/context/CurrencyContext';
import { useAuth } from '../../components/context/AuthContext';
import useGlobalStore from '../../store/globalStore';
import { format } from 'date-fns';

interface OpexCategoryRollup {
  id: string;
  name: string;
  budgeted: number;
  actual: number;
  variance: number;
  burnRate: number;
  status: 'OVERRUN' | 'AT_RISK' | 'HEALTHY';
}

interface OpexBudgetRollup {
  budget_id: string;
  name: string;
  type: string;
  status: string;
  start_date: string;
  end_date: string;
  budgeted: number;
  actual: number;
  variance: number;
  burnRate: number;
  categories: OpexCategoryRollup[];
}

interface OpexRollupResult {
  budgets: OpexBudgetRollup[];
  summary: {
    totalBudgeted: number;
    totalActual: number;
    totalVariance: number;
    efficiencyScore: number;
    topBurningCategories: { name: string; actual: number; burnRate: number }[];
  };
}

const statusColors: Record<string, string> = {
  OVERRUN: 'text-red-500',
  AT_RISK: 'text-amber-500',
  HEALTHY: 'text-emerald-600',
};

const statusBg: Record<string, string> = {
  OVERRUN: 'bg-red-50 border-red-100',
  AT_RISK: 'bg-amber-50 border-amber-100',
  HEALTHY: 'bg-emerald-50 border-emerald-100',
};

const OpexEfficiencyPage: React.FC = () => {
  const api = useSecuredApi();
  const { user } = useAuth();
  const { convertToDisplay, userCurrency } = useCurrency();
  const { selectedProjectId } = useGlobalStore();

  const [loading, setLoading] = useState(false);
  const [rollup, setRollup] = useState<OpexRollupResult | null>(null);
  const [interval, setInterval] = useState<'daily' | 'weekly' | 'monthly' | 'all'>('all');
  const [viewMode, setViewMode] = useState<'analytics' | 'report'>('report');
  const [expandedBudgets, setExpandedBudgets] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchRollup();
  }, [interval]);

  const fetchRollup = async () => {
    try {
      setLoading(true);
      const params: Record<string, string> = {};

      const now = new Date();
      if (interval === 'daily') {
        params.startDate = format(now, 'yyyy-MM-dd');
        params.endDate = format(now, 'yyyy-MM-dd');
      } else if (interval === 'weekly') {
        const lastWeek = new Date();
        lastWeek.setDate(now.getDate() - 7);
        params.startDate = format(lastWeek, 'yyyy-MM-dd');
        params.endDate = format(now, 'yyyy-MM-dd');
      } else if (interval === 'monthly') {
        const lastMonth = new Date();
        lastMonth.setMonth(now.getMonth() - 1);
        params.startDate = format(lastMonth, 'yyyy-MM-dd');
        params.endDate = format(now, 'yyyy-MM-dd');
      }

      const response = await api.get<OpexRollupResult>('/operational-budgets/rollup', { params });
      setRollup(response.data);

      // Auto-expand all budgets in report mode
      if (response.data?.budgets) {
        setExpandedBudgets(new Set(response.data.budgets.map(b => b.budget_id)));
      }
    } catch (error) {
      toast.error('Failed to load OPEX intelligence');
    } finally {
      setLoading(false);
    }
  };

  const toggleBudget = (id: string) => {
    setExpandedBudgets(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleExport = async (exportFormat: 'pdf' | 'xlsx' | 'docx') => {
    try {
      setLoading(true);
      const loadId = toast.loading(`Preparing ${exportFormat.toUpperCase()} OPEX report...`);

      const exportContext = {
        currencyRate: userCurrency.rate,
        currencySymbol: userCurrency.symbol,
        tenantName: user?.tenant_name || '',
        projectName: 'Operational Overview',
        projectMap: {}
      };

      const response = await api.post('/reporting/generate', {
        type: 'OPEX_EFFICIENCY',
        format: exportFormat,
        context: exportContext,
        filters: { interval }
      }, { responseType: 'blob' });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `opex_report_${interval}_${Date.now()}.${exportFormat}`);
      document.body.appendChild(link);
      link.click();
      toast.success('OPEX Intelligence exported', { id: loadId });
    } catch (error) {
      toast.error('Export failed');
    } finally {
      setLoading(false);
    }
  };

  const handlePushToDCS = async () => {
    try {
      setLoading(true);
      const loadId = toast.loading('Archiving OPEX audit in DCS...');

      const exportContext = {
        currencyRate: userCurrency.rate,
        currencySymbol: userCurrency.symbol,
        tenantName: user?.tenant_name || '',
        projectName: 'Operational Overview',
        projectMap: {}
      };

      await api.post('/reporting/generate', {
        type: 'OPEX_EFFICIENCY',
        format: 'pdf',
        pushToDcs: true,
        context: exportContext,
        filters: { interval }
      });
      toast.success('OPEX Intelligence pushed to DCS.', { id: loadId });
    } catch (error) {
      toast.error('DCS synchronization failed');
    } finally {
      setLoading(false);
    }
  };

  const summary = rollup?.summary;

  return (
    <>
      <Head><title>OPEX Efficiency Intelligence | SentinelFi</title></Head>
      <PageContainer
        title="OPEX Efficiency Intelligence"
        subtitle="Operational expenditure overview across all budgets and cost categories — sourced from live expense data."
        headerContent={<PieChart className="w-8 h-8 text-brand-primary" />}
      >
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Glassmorphic Filters Sidebar */}
          <aside className="lg:w-80 shrink-0 space-y-6 print:hidden">
            <div className="p-6 bg-slate-900/40 backdrop-blur-xl border border-slate-800 rounded-3xl shadow-2xl sticky top-24">
              <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-6 flex items-center gap-2">
                <Filter className="w-4 h-4" /> OPEX Controls
              </h3>

              <div className="space-y-6">
                {/* View Mode Toggle */}
                <div className="p-1 bg-slate-950 rounded-2xl flex border border-slate-800">
                  <button onClick={() => setViewMode('analytics')} className={`flex-1 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'analytics' ? 'bg-brand-primary text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>Analytics</button>
                  <button onClick={() => setViewMode('report')} className={`flex-1 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'report' ? 'bg-brand-primary text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>Report</button>
                </div>

                {/* Interval Selector */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400">Temporal Scope</label>
                  <div className="grid grid-cols-2 gap-2">
                    {(['daily', 'weekly', 'monthly', 'all'] as const).map((opt) => (
                      <button key={opt} onClick={() => setInterval(opt)} className={`px-3 py-2 rounded-xl border text-[10px] font-black uppercase tracking-tighter transition-all ${interval === opt ? 'bg-brand-primary border-brand-primary text-white shadow-lg' : 'bg-slate-900/50 border-slate-800 text-slate-500 hover:border-slate-700'}`}>{opt}</button>
                    ))}
                  </div>
                </div>

                {/* Summary KPIs */}
                {summary && (
                  <div className="space-y-3 pt-4 border-t border-slate-800">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-black text-slate-500 uppercase">Efficiency</span>
                      <span className={`text-lg font-black ${summary.efficiencyScore >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{summary.efficiencyScore.toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-black text-slate-500 uppercase">Total Budget</span>
                      <span className="text-sm font-bold text-white">{convertToDisplay(summary.totalBudgeted, 'NGN', false)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-black text-slate-500 uppercase">Actual Burn</span>
                      <span className="text-sm font-bold text-white">{convertToDisplay(summary.totalActual, 'NGN', false)}</span>
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="pt-4 border-t border-slate-800 space-y-3">
                  <button onClick={() => window.print()} className="w-full flex items-center gap-3 px-4 py-3 bg-slate-900/50 hover:bg-slate-800 border border-slate-800 rounded-xl text-slate-300 text-xs font-bold transition-all">
                    <Printer className="w-4 h-4 text-brand-primary" /> Direct Print
                  </button>
                  <button onClick={handlePushToDCS} disabled={loading} className="w-full flex items-center gap-3 px-4 py-3 bg-alert-warning/10 hover:bg-alert-warning/20 border border-alert-warning/20 rounded-xl text-alert-warning text-xs font-black uppercase tracking-widest transition-all disabled:opacity-30">
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Push to DCS
                  </button>
                </div>
              </div>
            </div>
          </aside>

          {/* Main Content */}
          <main className="flex-1 space-y-8">
            {/* Analytics Cards */}
            {viewMode === 'analytics' && summary && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in slide-in-from-top-4 duration-500">
                <Card className="bg-slate-900/80 border-slate-800 p-6 flex items-center gap-5">
                  <div className="p-4 bg-brand-primary/10 rounded-2xl"><TrendingUp className="w-7 h-7 text-brand-primary" /></div>
                  <div>
                    <p className="text-[10px] font-black text-brand-primary uppercase tracking-widest">OPEX Efficiency</p>
                    <p className="text-2xl font-black text-white">{summary.efficiencyScore.toFixed(1)}%</p>
                  </div>
                </Card>
                <Card className="bg-slate-900/80 border-slate-800 p-6 flex items-center gap-5">
                  <div className="p-4 bg-red-500/10 rounded-2xl"><TrendingDown className="w-7 h-7 text-red-400" /></div>
                  <div>
                    <p className="text-[10px] font-black text-red-400 uppercase tracking-widest">Total Variance</p>
                    <p className={`text-2xl font-black ${summary.totalVariance >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{convertToDisplay(Math.abs(summary.totalVariance), 'NGN', false)}</p>
                  </div>
                </Card>
                <Card className="bg-slate-900/80 border-slate-800 p-6 flex items-center gap-5">
                  <div className="p-4 bg-emerald-500/10 rounded-2xl"><Shield className="w-7 h-7 text-emerald-500" /></div>
                  <div>
                    <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Active Budgets</p>
                    <p className="text-2xl font-black text-white">{rollup?.budgets.length ?? 0}</p>
                  </div>
                </Card>
              </div>
            )}

            {/* Document Report View */}
            <div className={`p-10 bg-white text-slate-900 rounded-[2.5rem] shadow-2xl border border-slate-200 min-h-[900px] relative overflow-hidden transition-all duration-500 ${loading ? 'opacity-50 blur-[1px]' : 'opacity-100'}`}>
              {/* Export Buttons */}
              <div className="absolute top-0 right-0 p-8 print:hidden flex gap-3">
                <Tooltip content="Export to Word" position="bottom">
                  <button onClick={() => handleExport('docx')} title="Export Word" className="p-3 bg-slate-50 hover:bg-slate-100 rounded-2xl transition-all text-slate-400 hover:text-brand-primary"><FileText className="w-5 h-5" /></button>
                </Tooltip>
                <Tooltip content="Export to Excel" position="bottom">
                  <button onClick={() => handleExport('xlsx')} title="Export Excel" className="p-3 bg-slate-50 hover:bg-slate-100 rounded-2xl transition-all text-slate-400 hover:text-green-600"><Download className="w-5 h-5" /></button>
                </Tooltip>
                <Tooltip content="Export to PDF" position="bottom">
                  <button onClick={() => handleExport('pdf')} title="Export PDF" className="p-3 bg-slate-50 hover:bg-slate-100 rounded-2xl transition-all text-slate-400 hover:text-red-600"><FileText className="w-5 h-5" /></button>
                </Tooltip>
              </div>

              <div className="max-w-4xl mx-auto space-y-10 py-8">
                {/* Report Header */}
                <header className="text-center space-y-4 border-b-2 border-slate-100 pb-12">
                  <h2 className="text-3xl font-black uppercase tracking-tighter leading-tight">Operational Expenditure<br /><span className="text-brand-primary">Efficiency Report</span></h2>
                  <div className="flex items-center justify-center gap-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                    <span className="flex items-center gap-2"><Calendar className="w-3 h-3" /> Period: {interval.toUpperCase()}</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-200" />
                    <span className="flex items-center gap-2"><Lock className="w-3 h-3" /> {format(new Date(), 'PP')}</span>
                  </div>
                </header>

                {/* Loading State */}
                {loading && (
                  <div className="py-32 text-center"><Loader2 className="w-12 h-12 animate-spin mx-auto text-brand-primary opacity-20" /></div>
                )}

                {/* Summary Row */}
                {!loading && summary && (
                  <div className="grid grid-cols-3 gap-6">
                    {[
                      { label: 'Total OPEX Budget', value: convertToDisplay(summary.totalBudgeted, 'NGN', false) },
                      { label: 'Total Actual Burn', value: convertToDisplay(summary.totalActual, 'NGN', false) },
                      { label: 'Net Variance', value: (summary.totalVariance >= 0 ? '+' : '') + convertToDisplay(summary.totalVariance, 'NGN', false) },
                    ].map(kpi => (
                      <div key={kpi.label} className="text-center p-6 bg-slate-50 rounded-2xl border border-slate-100">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{kpi.label}</p>
                        <p className="text-xl font-black text-slate-900 mt-1">{kpi.value}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Budget → Category Hierarchical Table */}
                {!loading && rollup?.budgets && rollup.budgets.length > 0 ? (
                  <div className="space-y-8">
                    <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                      <Layers className="w-4 h-4 text-brand-primary" />
                      <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest">Budget → Category Drill-Down</h4>
                    </div>

                    {rollup.budgets.map(budget => {
                      const isExpanded = expandedBudgets.has(budget.budget_id);
                      const worstStatus = budget.burnRate > 100 ? 'OVERRUN' : budget.burnRate > 85 ? 'AT_RISK' : 'HEALTHY';

                      return (
                        <div key={budget.budget_id} className={`border ${statusBg[worstStatus]} rounded-2xl overflow-hidden`}>
                          {/* Budget Header Row */}
                          <button
                            onClick={() => toggleBudget(budget.budget_id)}
                            className="w-full flex items-center justify-between px-6 py-4 hover:bg-black/5 transition-all print:cursor-default"
                          >
                            <div className="flex items-center gap-4">
                              {isExpanded ? <ChevronDown className="w-4 h-4 text-slate-400 print:hidden" /> : <ChevronRight className="w-4 h-4 text-slate-400 print:hidden" />}
                              <div className="text-left">
                                <p className="font-black text-slate-900 text-sm">{budget.name}</p>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{budget.type} · {budget.status}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-8 text-right">
                              <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase">Budget</p>
                                <p className="font-black text-slate-900">{convertToDisplay(budget.budgeted, 'NGN', false)}</p>
                              </div>
                              <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase">Actual</p>
                                <p className="font-black text-slate-700">{convertToDisplay(budget.actual, 'NGN', false)}</p>
                              </div>
                              <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase">Burn</p>
                                <p className={`font-black ${statusColors[worstStatus]}`}>{budget.burnRate.toFixed(1)}%</p>
                              </div>
                            </div>
                          </button>

                          {/* Category Sub-rows */}
                          {(isExpanded || viewMode === 'report') && budget.categories.length > 0 && (
                            <div className="border-t border-slate-200/50">
                              <table className="w-full text-sm">
                                <thead>
                                  <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-200/70 bg-white/70">
                                    <th className="pl-16 pr-4 py-3 text-left">Category</th>
                                    <th className="px-4 py-3 text-right">Budget</th>
                                    <th className="px-4 py-3 text-right">Actual</th>
                                    <th className="px-4 py-3 text-right">Variance</th>
                                    <th className="px-4 py-3 text-right">Burn Rate</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                  {budget.categories.map(cat => (
                                    <tr key={cat.id} className="hover:bg-white/50 transition-colors">
                                      <td className="pl-16 pr-4 py-3.5">
                                        <div className="flex items-center gap-2">
                                          {cat.status === 'OVERRUN' && <AlertTriangle className="w-3 h-3 text-red-500 shrink-0" />}
                                          <span className="font-semibold text-slate-700 text-xs">{cat.name}</span>
                                          <span className={`ml-1 px-1.5 py-0.5 rounded-md text-[8px] font-black uppercase ${cat.status === 'OVERRUN' ? 'bg-red-100 text-red-600' : cat.status === 'AT_RISK' ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-700'}`}>{cat.status}</span>
                                        </div>
                                      </td>
                                      <td className="px-4 py-3.5 text-right font-bold text-slate-900 text-xs">{convertToDisplay(cat.budgeted, 'NGN', false)}</td>
                                      <td className="px-4 py-3.5 text-right font-bold text-slate-600 text-xs">{convertToDisplay(cat.actual, 'NGN', false)}</td>
                                      <td className={`px-4 py-3.5 text-right font-black text-xs ${cat.variance < 0 ? 'text-red-500' : 'text-emerald-600'}`}>
                                        {cat.variance >= 0 ? '+' : ''}{convertToDisplay(cat.variance, 'NGN', false)}
                                      </td>
                                      <td className={`px-4 py-3.5 text-right font-black text-xs ${statusColors[cat.status]}`}>
                                        {cat.burnRate.toFixed(1)}%
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : !loading && (
                  <div className="py-32 text-center text-slate-400 italic">No operational budget data found for this period.</div>
                )}

                {/* Footer */}
                <footer className="pt-12 border-t border-slate-200 mt-20 flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <Shield className="w-4 h-4 text-slate-300" />
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Enterprise Compliance Verified</span>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black text-slate-900 uppercase tracking-widest">{userCurrency.code} Valuation</p>
                    <p className="text-[10px] text-slate-400 font-medium">SentinelFi OPEX Hub</p>
                  </div>
                </footer>
              </div>
            </div>
          </main>
        </div>
      </PageContainer>

      <style jsx global>{`
        @media print {
          .print\\:hidden { display: none !important; }
          body { background: white !important; color: black !important; }
        }
      `}</style>
    </>
  );
};

export default OpexEfficiencyPage;
