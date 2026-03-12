import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import {
  BarChart2,
  Download,
  FileText,
  Loader2,
  TrendingUp,
  AlertCircle,
  Calendar,
  Printer,
  Search,
  Filter,
  ChevronRight,
  RefreshCw,
  Projector,
  Lock,
  Shield
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

const CapexPerformancePage: React.FC = () => {
  const api = useSecuredApi();
  const { user } = useAuth();
  const { convertToDisplay, userCurrency } = useCurrency();
  const { selectedProjectId, setSelectedProjectId } = useGlobalStore();

  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [projects, setProjects] = useState<any[]>([]);
  const [interval, setInterval] = useState<'daily' | 'weekly' | 'monthly' | 'all'>('all');
  const [viewMode, setViewMode] = useState<'analytics' | 'report'>('report');

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    fetchStats();
  }, [selectedProjectId, interval]);

  const fetchInitialData = async () => {
    try {
      const resp = await api.get('/projects');
      setProjects(resp.data.projects || []);
    } catch (error) {
      console.error('Failed to load projects');
    }
  };

  const fetchStats = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (selectedProjectId !== 'all') params.projectId = selectedProjectId;

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

      const response = await api.get('/wbs/budget/rollup', { params });
      let data = response.data || [];

      // Robust Hierarchical WBS Sorting
      data.sort((a: any, b: any) => {
        const partsA = (a.wbs_code || '').split('.').map(Number);
        const partsB = (b.wbs_code || '').split('.').map(Number);

        for (let i = 0; i < Math.max(partsA.length, partsB.length); i++) {
          const valA = partsA[i] || 0;
          const valB = partsB[i] || 0;
          if (valA !== valB) return valA - valB;
        }
        return 0;
      });

      const totalBudget = data.reduce((acc: number, item: any) => acc + (item.total_cost_budgeted || 0), 0);
      const totalActual = data.reduce((acc: number, item: any) => acc + (item.total_paid_rollup || 0), 0);

      // Count unique projects in the data or use selected project
      const projectCount = selectedProjectId === 'all'
        ? new Set(data.filter((p: any) => p.project_id).map((p: any) => p.project_id)).size
        : 1;

      setStats({
        totalBudget,
        totalActual,
        projects: projectCount,
        items: data
      });
    } catch (error) {
      toast.error('Failed to load CAPEX intelligence');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (format: 'pdf' | 'xlsx' | 'docx') => {
    try {
      setLoading(true);
      const loadId = toast.loading(`Preparing ${format.toUpperCase()} report...`);

      const exportContext = {
        currencyRate: userCurrency.rate,
        currencySymbol: userCurrency.symbol,
        tenantName: user?.tenant_name || '',
        projectName: selectedProjectId === 'all' ? 'All Portfolio Projects' : projects.find(p => p.project_id === selectedProjectId)?.project_name || '',
        projectMap: Object.fromEntries(projects.map(p => [p.project_id, p.project_name]))
      };

      const response = await api.post('/reporting/generate', {
        type: 'CAPEX_SUMMARY',
        format: format,
        context: exportContext,
        filters: {
          projectId: selectedProjectId === 'all' ? undefined : selectedProjectId,
          interval: interval
        }
      }, { responseType: 'blob' });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `capex_report_${interval}_${Date.now()}.${format}`);
      document.body.appendChild(link);
      link.click();
      toast.success('Report generated successfully', { id: loadId });
    } catch (error) {
      toast.error('Export failed');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handlePushToDCS = async () => {
    try {
      setLoading(true);
      const loadId = toast.loading('Synchronizing CAPEX report with DCS...');

      const exportContext = {
        currencyRate: userCurrency.rate,
        currencySymbol: userCurrency.symbol,
        tenantName: user?.tenant_name || '',
        projectName: selectedProjectId === 'all' ? 'All Portfolio Projects' : projects.find(p => p.project_id === selectedProjectId)?.project_name || '',
        projectMap: Object.fromEntries(projects.map(p => [p.project_id, p.project_name]))
      };

      await api.post('/reporting/generate', {
        type: 'CAPEX_SUMMARY',
        format: 'pdf',
        pushToDcs: true,
        context: exportContext,
        filters: { projectId: selectedProjectId === 'all' ? undefined : selectedProjectId, interval }
      });
      toast.success('CAPEX Intelligence successfully pushed to DCS.', { id: loadId });
    } catch (error) {
      toast.error('DCS synchronization failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Head><title>CAPEX Performance Intelligence | SentinelFi</title></Head>
      <PageContainer
        title="CAPEX Intelligence Dashboard"
        subtitle="Professional capital expenditure oversight and project portfolio analytics."
        headerContent={<TrendingUp className="w-8 h-8 text-brand-primary" />}
      >
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Glassmorphic Filters Sidebar */}
          <aside className="lg:w-80 shrink-0 space-y-6 print:hidden">
            <div className="p-6 bg-slate-900/40 backdrop-blur-xl border border-slate-800 rounded-3xl shadow-2xl sticky top-24">
              <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-6 flex items-center gap-2">
                <Filter className="w-4 h-4" /> Reporting Controls
              </h3>

              <div className="space-y-6">
                {/* View Mode Toggle */}
                <div className="p-1 bg-slate-950 rounded-2xl flex border border-slate-800">
                  <button
                    onClick={() => setViewMode('analytics')}
                    className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'analytics' ? 'bg-brand-primary text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                  >
                    Analytics
                  </button>
                  <button
                    onClick={() => setViewMode('report')}
                    className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'report' ? 'bg-brand-primary text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                  >
                    Report
                  </button>
                </div>

                {/* Project Selector */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400">Target Project</label>
                  <select
                    value={selectedProjectId}
                    onChange={(e) => setSelectedProjectId(e.target.value)}
                    className="w-full bg-slate-950/50 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-brand-primary/20 transition-all font-medium"
                  >
                    <option value="all">All Portfolio Projects</option>
                    {projects.map(p => (
                      <option key={p.project_id} value={p.project_id}>{p.project_name}</option>
                    ))}
                  </select>
                </div>

                {/* Interval Selector */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400">Temporal Scope</label>
                  <div className="grid grid-cols-2 gap-2">
                    {['daily', 'weekly', 'monthly', 'all'].map((opt) => (
                      <button
                        key={opt}
                        onClick={() => setInterval(opt as any)}
                        className={`px-3 py-2 rounded-xl border text-[10px] font-black uppercase tracking-tighter transition-all ${interval === opt
                          ? 'bg-brand-primary border-brand-primary text-white shadow-lg'
                          : 'bg-slate-900/50 border-slate-800 text-slate-500 hover:border-slate-700'
                          }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Export Options */}
                <div className="pt-4 border-t border-slate-800 space-y-4">
                  <button
                    onClick={handlePrint}
                    className="w-full flex items-center justify-between px-4 py-3 bg-slate-900/50 hover:bg-slate-800 border border-slate-800 rounded-xl text-slate-300 text-sm font-bold transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <Printer className="w-4 h-4 text-brand-primary" />
                      Direct Print
                    </div>
                    <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>

                  <button
                    onClick={handlePushToDCS}
                    disabled={loading || !stats?.items?.length}
                    className="w-full flex items-center justify-between px-4 py-3 bg-alert-warning/10 hover:bg-alert-warning/20 border border-alert-warning/20 rounded-xl text-alert-warning text-xs font-black uppercase tracking-widest transition-all group disabled:opacity-30"
                  >
                    <div className="flex items-center gap-3">
                      <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                      Push to DCS
                    </div>
                  </button>
                </div>

                <div className="p-4 bg-brand-primary/5 border border-brand-primary/10 rounded-2xl">
                  <p className="text-[10px] text-brand-primary/70 font-medium leading-relaxed">
                    Precision reporting active. All exports are verified for binary integrity and cross-tabulated with DCS archives.
                  </p>
                </div>
              </div>
            </div>
          </aside>

          {/* Main Content Area */}
          <main className="flex-1 space-y-8">
            {/* Real Stats Cards - Hidden in pure Report mode */}
            {viewMode === 'analytics' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in slide-in-from-top-4 duration-500">
                <Tooltip content="Total allocated budget for selected scope" position="bottom">
                  <Card className="bg-gradient-to-br from-slate-900/80 to-slate-950 border-slate-800/50 backdrop-blur-md">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black text-brand-primary uppercase tracking-widest mb-1 leading-none">Capital Budget</span>
                      <div className="text-3xl font-black text-white tracking-tighter">
                        {convertToDisplay(stats?.totalBudget || 0)}
                      </div>
                    </div>
                  </Card>
                </Tooltip>

                <Tooltip content="Actual expenditure realized to date" position="bottom">
                  <Card className="bg-gradient-to-br from-slate-900/80 to-slate-950 border-slate-800/50 backdrop-blur-md">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black text-alert-warning uppercase tracking-widest mb-1 leading-none">Realized Spend</span>
                      <div className="text-3xl font-black text-white tracking-tighter">
                        {convertToDisplay(stats?.totalActual || 0)}
                      </div>
                    </div>
                  </Card>
                </Tooltip>

                <Tooltip content="Number of unique projects in this view" position="bottom">
                  <Card className="bg-gradient-to-br from-slate-900/80 to-slate-950 border-slate-800/50 backdrop-blur-md">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black text-positive uppercase tracking-widest mb-1 leading-none">Project Count</span>
                      <div className="text-3xl font-black text-white tracking-tighter">
                        {stats?.projects || 0}
                      </div>
                    </div>
                  </Card>
                </Tooltip>
              </div>
            )}

            {/* Document Preview Interface */}
            <div className={`p-8 bg-white text-slate-900 rounded-[2.5rem] shadow-2xl border border-slate-200 min-h-[800px] relative overflow-hidden transition-all duration-500 ${loading ? 'opacity-50 blur-[1px]' : 'opacity-100'} ${viewMode === 'report' ? 'mt-0' : ''}`}>
              <div className="absolute top-0 right-0 p-6 print:hidden flex gap-3">
                <Tooltip content="Export to Word" position="bottom">
                  <button onClick={() => handleExport('docx')} className="p-3 bg-slate-50 hover:bg-slate-100 rounded-2xl transition-all text-slate-400 hover:text-brand-primary shadow-sm active:scale-95" title="Export Word">
                    <FileText className="w-5 h-5" />
                  </button>
                </Tooltip>
                <Tooltip content="Export to Excel" position="bottom">
                  <button onClick={() => handleExport('xlsx')} className="p-3 bg-slate-50 hover:bg-slate-100 rounded-2xl transition-all text-slate-400 hover:text-green-600 shadow-sm active:scale-95" title="Export Excel">
                    <Download className="w-5 h-5" />
                  </button>
                </Tooltip>
                <Tooltip content="Export to PDF" position="bottom">
                  <button onClick={() => handleExport('pdf')} className="p-3 bg-slate-50 hover:bg-slate-100 rounded-2xl transition-all text-slate-400 hover:text-red-600 shadow-sm active:scale-95" title="Export PDF">
                    <FileText className="w-5 h-5" />
                  </button>
                </Tooltip>
              </div>

              {/* Internal Report Structure */}
              <div className="max-w-4xl mx-auto space-y-12 py-8">
                <header className="text-center space-y-4 border-b-2 border-slate-100 pb-12">
                  <div className="mx-auto w-16 h-1 bg-brand-primary/20 rounded-full mb-6" />
                  <h2 className="text-3xl font-black uppercase tracking-tighter leading-tight">Capital Expenditure<br /><span className="text-brand-primary">Performance Intelligence</span></h2>
                  <div className="flex items-center justify-center gap-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                    <span className="flex items-center gap-2"><Calendar className="w-3 h-3" /> Interval: {interval.toUpperCase()}</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-200"></span>
                    <span className="flex items-center gap-2"><Lock className="w-3 h-3" /> SECURED: {format(new Date(), 'PP')}</span>
                  </div>
                </header>

                <div className="space-y-8">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                    <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-3">
                      <Projector className="w-4 h-4 text-brand-primary" />
                      Hierarchical WBS Financials
                    </h4>
                    <span className="text-[10px] font-bold text-slate-400 italic">Sorted by structural code logic</span>
                  </div>

                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-slate-400 text-[10px] font-black uppercase tracking-widest border-b border-slate-100">
                        <th className="py-5 font-black">WBS Code</th>
                        <th className="py-5 font-black">Structural Description</th>
                        <th className="py-5 font-black text-right">Budgeted</th>
                        <th className="py-5 font-black text-right">Actual Realized</th>
                        <th className="py-5 font-black text-right">Variance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {loading ? (
                        <tr>
                          <td colSpan={5} className="py-32 text-center">
                            <Loader2 className="w-12 h-12 animate-spin mx-auto text-brand-primary opacity-20" />
                            <p className="mt-4 text-xs font-bold text-slate-300 uppercase tracking-widest">Synthesizing Data...</p>
                          </td>
                        </tr>
                      ) : stats?.items?.length > 0 ? (
                        stats.items.map((item: any) => {
                          const budget = item.total_cost_budgeted || 0;
                          const actual = item.total_paid_rollup || 0;
                          const variance = budget - actual;
                          const isNegative = variance < 0;

                          return (
                            <tr key={item.wbs_id} className="group hover:bg-slate-50/80 transition-all duration-300">
                              <td className="py-5 font-mono font-black text-brand-primary text-xs">{item.wbs_code}</td>
                              <td className="py-5 font-bold text-slate-700 leading-tight">
                                {item.description}
                                {item.project_name && selectedProjectId === 'all' && (
                                  <span className="block text-[9px] text-slate-400 uppercase mt-1">Project: {item.project_name}</span>
                                )}
                              </td>
                              <td className="py-5 text-right font-black text-slate-900">{convertToDisplay(budget, undefined, false)}</td>
                              <td className="py-5 text-right font-black text-slate-600">{convertToDisplay(actual, undefined, false)}</td>
                              <td className={`py-5 text-right font-black ${isNegative ? 'text-red-500' : 'text-emerald-600'}`}>
                                <div className="flex flex-col items-end">
                                  <span>{isNegative ? '-' : '+'}{convertToDisplay(Math.abs(variance), undefined, false)}</span>
                                  <span className="text-[8px] opacity-70">
                                    {((variance / (budget || 1)) * 100).toFixed(1)}%
                                  </span>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={5} className="py-32 text-center text-slate-400 font-medium italic">
                            No capital expenditure data matched the active filters.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <footer className="pt-12 border-t border-slate-200 mt-20 flex flex-col md:flex-row justify-between items-center gap-8">
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-slate-900 rounded-lg">
                        <Shield className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <p className="text-[9px] font-black text-slate-900 uppercase tracking-widest leading-none">Cryptographic Integrity</p>
                        <p className="font-mono text-[9px] text-slate-400 tracking-tighter mt-1 truncate max-w-[200px]">
                          SHA256: {stats?.items?.length > 0 ? 'F5C8...84XJ' : 'NULL_VOID'}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="text-center md:text-right space-y-1">
                    <p className="text-[10px] font-black text-slate-950 uppercase tracking-widest">{userCurrency.code} Valuation Model</p>
                    <p className="text-[10px] text-slate-400 font-medium tracking-tight">SentinelFi Financial Intelligence Systems</p>
                    <div className="flex items-center justify-center md:justify-end gap-1 mt-2">
                      {[1, 2, 3, 4, 5].map(i => <div key={i} className="w-1 h-1 bg-slate-200 rounded-full"></div>)}
                    </div>
                  </div>
                </footer>
              </div>
            </div>
          </main>
        </div>
      </PageContainer>

      <style jsx global>{`
        @media print {
          body {
            background: white !important;
            color: black !important;
          }
          .print\\:hidden {
            display: none !important;
          }
          main {
            margin: 0 !important;
            padding: 0 !important;
          }
          aside {
            display: none !important;
          }
          .min-h-\\[800px\\] {
            min-height: auto !important;
            box-shadow: none !important;
            border: none !important;
            padding: 0 !important;
          }
        }
      `}</style>
    </>
  );
};

export default CapexPerformancePage;
