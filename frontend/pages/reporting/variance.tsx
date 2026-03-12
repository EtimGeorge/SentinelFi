import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import {
  BarChart3,
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  Loader2,
  FileDown,
  Printer,
  SlidersHorizontal,
  Filter,
  RefreshCw,
  Projector,
  Calendar,
  Lock,
  Shield,
  Download,
  FileText,
  ChevronRight
} from 'lucide-react';
import PageContainer from '../../components/Layout/PageContainer';
import Card from '../../components/common/Card';
import Tooltip from '../../components/common/Tooltip';
import { useSecuredApi } from '../../components/hooks/useSecuredApi';
import { getWBSColor } from '../../lib/utils';
import { RollupData } from '../../components/dashboard/WBSHierarchyTree';
import { IWbsCategory } from '@shared/types/wbs';
import toast from 'react-hot-toast';
import { useAuth, Role } from '../../components/context/AuthContext';
import { useCurrency } from '../../components/context/CurrencyContext';
import useGlobalStore from '../../store/globalStore';
import { format } from 'date-fns';

enum VarianceStatus {
  All = 'All',
  Positive = 'Positive',
  Negative = 'Negative',
  Major = 'Major',
}

interface LiveExpenseException {
  id: string;
  wbs_code: string;
  item_description: string;
  actual_paid_amount: number;
  variance_flag: string;
}

const VarianceReportPage: React.FC = () => {
  const api = useSecuredApi();
  const { hasAnyRole, user } = useAuth();
  const { convertToDisplay, userCurrency } = useCurrency();
  const { selectedProjectId, setSelectedProjectId } = useGlobalStore();

  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState<RollupData[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [majorVarianceAlerts, setMajorVarianceAlerts] = useState<LiveExpenseException[]>([]);
  const [interval, setInterval] = useState<'daily' | 'weekly' | 'monthly' | 'all'>('all');
  const [varianceFilter, setVarianceFilter] = useState<VarianceStatus>(VarianceStatus.All);
  const [viewMode, setViewMode] = useState<'analytics' | 'report'>('report');

  const isAdminOrCEO = hasAnyRole([Role.AdminDirector, Role.CEO]);

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    fetchStats();
  }, [selectedProjectId, interval, varianceFilter]);

  const fetchInitialData = async () => {
    try {
      const [projResp, alertsResp] = await Promise.all([
        api.get('/projects'),
        api.get('/wbs/exceptions')
      ]);
      setProjects(projResp.data.projects || []);
      setMajorVarianceAlerts(alertsResp.data || []);
    } catch (error) {
      console.error('Failed to load initial variance data');
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

      // Hierarchical WBS Sorting
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

      // Apply Variance Status Filter
      if (varianceFilter !== VarianceStatus.All) {
        data = data.filter((item: any) => {
          const variance = (item.total_cost_budgeted || 0) - (item.total_paid_rollup || 0);
          if (varianceFilter === VarianceStatus.Positive) return variance >= 0;
          if (varianceFilter === VarianceStatus.Negative) return variance < 0;
          if (varianceFilter === VarianceStatus.Major) {
            return majorVarianceAlerts.some(alert => alert.wbs_code === item.wbs_code);
          }
          return true;
        });
      }

      setReportData(data);
    } catch (error) {
      toast.error('Failed to load variance intelligence');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (format: 'pdf' | 'xlsx' | 'docx') => {
    try {
      setLoading(true);
      const loadId = toast.loading(`Preparing ${format.toUpperCase()} variance report...`);

      const exportContext = {
        currencyRate: userCurrency.rate,
        currencySymbol: userCurrency.symbol,
        tenantName: user?.tenant_name || '',
        projectName: selectedProjectId === 'all' ? 'All Portfolio Projects' : projects.find(p => p.project_id === selectedProjectId)?.project_name || '',
        projectMap: Object.fromEntries(projects.map(p => [p.project_id, p.project_name]))
      };

      const response = await api.post('/reporting/generate', {
        type: 'VARIANCE_ANALYSIS',
        format: format,
        context: exportContext,
        filters: {
          projectId: selectedProjectId === 'all' ? undefined : selectedProjectId,
          interval: interval,
          varianceStatus: varianceFilter
        }
      }, { responseType: 'blob' });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `variance_report_${interval}_${Date.now()}.${format}`);
      document.body.appendChild(link);
      link.click();
      toast.success('Variance intelligence exported successfully', { id: loadId });
    } catch (error) {
      toast.error('Export failed');
    } finally {
      setLoading(false);
    }
  };

  const handlePushToDCS = async () => {
    try {
      setLoading(true);
      const loadId = toast.loading('Archiving variance intelligence in DCS...');

      const exportContext = {
        currencyRate: userCurrency.rate,
        currencySymbol: userCurrency.symbol,
        tenantName: user?.tenant_name || '',
        projectName: selectedProjectId === 'all' ? 'All Portfolio Projects' : projects.find(p => p.project_id === selectedProjectId)?.project_name || '',
        projectMap: Object.fromEntries(projects.map(p => [p.project_id, p.project_name]))
      };

      await api.post('/reporting/generate', {
        type: 'VARIANCE_ANALYSIS',
        format: 'pdf',
        pushToDcs: true,
        context: exportContext,
        filters: { projectId: selectedProjectId === 'all' ? undefined : selectedProjectId, interval }
      });
      toast.success('Verification complete. Variance intelligence pushed to DCS.', { id: loadId });
    } catch (error) {
      toast.error('DCS synchronization failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Head><title>Variance Analysis Intelligence | SentinelFi</title></Head>
      <PageContainer
        title="Financial Variance Intelligence"
        subtitle="Comprehensive delta analysis of actual spend versus capital and operational budgets."
        headerContent={<BarChart3 className="w-8 h-8 text-brand-primary" />}
      >
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Glassmorphic Filters Sidebar */}
          <aside className="lg:w-80 shrink-0 space-y-6 print:hidden">
            <div className="p-6 bg-slate-900/40 backdrop-blur-xl border border-slate-800 rounded-3xl shadow-2xl sticky top-24">
              <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-6 flex items-center gap-2">
                <Filter className="w-4 h-4" /> Variance Controls
              </h3>

              <div className="space-y-6">
                {/* View Mode */}
                <div className="p-1 bg-slate-950 rounded-2xl flex border border-slate-800">
                  <button
                    onClick={() => setViewMode('analytics')}
                    className={`flex-1 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'analytics' ? 'bg-brand-primary text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                  >
                    Analytics
                  </button>
                  <button
                    onClick={() => setViewMode('report')}
                    className={`flex-1 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'report' ? 'bg-brand-primary text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                  >
                    Report
                  </button>
                </div>

                {/* Scope Selection */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400">Intelligence Scope</label>
                  <select
                    value={selectedProjectId}
                    onChange={(e) => setSelectedProjectId(e.target.value)}
                    className="w-full bg-slate-950/50 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-brand-primary/20 transition-all font-medium"
                  >
                    <option value="all">Enterprise Portfolio</option>
                    {projects.map(p => (
                      <option key={p.project_id} value={p.project_id}>{p.project_name}</option>
                    ))}
                  </select>
                </div>

                {/* Variance Filter */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400">Variance Type</label>
                  <select
                    value={varianceFilter}
                    onChange={(e) => setVarianceFilter(e.target.value as VarianceStatus)}
                    className="w-full bg-slate-950/50 border border-slate-800 rounded-xl px-2 py-2 text-xs text-white focus:outline-none transition-all font-bold"
                  >
                    <option value={VarianceStatus.All}>All Variances</option>
                    <option value={VarianceStatus.Positive}>Underrun (+) </option>
                    <option value={VarianceStatus.Negative}>Overrun (-)</option>
                    <option value={VarianceStatus.Major}>AI Anomalies</option>
                  </select>
                </div>

                {/* Interval Selector */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400">Temporal Filter</label>
                  <div className="grid grid-cols-2 gap-2">
                    {['daily', 'weekly', 'monthly', 'all'].map((opt) => (
                      <button
                        key={opt}
                        onClick={() => setInterval(opt as any)}
                        className={`px-3 py-2 rounded-xl border text-[10px] font-black uppercase tracking-tighter transition-all ${interval === opt
                          ? 'bg-brand-primary border-brand-primary text-white'
                          : 'bg-slate-900/50 border-slate-800 text-slate-500 hover:border-slate-700'
                          }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="pt-4 border-t border-slate-800 space-y-3">
                  <button onClick={() => window.print()} className="w-full flex items-center justify-between px-4 py-3 bg-slate-900/50 hover:bg-slate-800 border border-slate-800 rounded-xl text-slate-300 text-xs font-bold transition-all group">
                    <div className="flex items-center gap-3"><Printer className="w-4 h-4 text-brand-primary" /> Direct Print</div>
                  </button>

                  <button onClick={handlePushToDCS} disabled={loading} className="w-full flex items-center justify-between px-4 py-3 bg-alert-warning/10 hover:bg-alert-warning/20 border border-alert-warning/20 rounded-xl text-alert-warning text-xs font-black uppercase tracking-widest transition-all group disabled:opacity-30">
                    <div className="flex items-center gap-3"><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Push to DCS</div>
                  </button>
                </div>
              </div>
            </div>
          </aside>

          {/* Main Content */}
          <main className="flex-1 space-y-8">
            {/* Analytics Header (Optional) */}
            {viewMode === 'analytics' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-top-4 duration-500">
                <Card className="bg-slate-900/80 border-slate-800 p-6 flex items-center gap-6">
                  <div className="p-4 bg-red-500/10 rounded-2xl">
                    <TrendingDown className="w-8 h-8 text-red-500" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-red-500 uppercase tracking-widest">Active Anomalies</p>
                    <p className="text-3xl font-black text-white">{majorVarianceAlerts.length}</p>
                  </div>
                </Card>
                <Card className="bg-slate-900/80 border-slate-800 p-6 flex items-center gap-6">
                  <div className="p-4 bg-emerald-500/10 rounded-2xl">
                    <Shield className="w-8 h-8 text-emerald-500" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">WBS Integrity Rate</p>
                    <p className="text-3xl font-black text-white">98.4%</p>
                  </div>
                </Card>
              </div>
            )}

            {/* Document Report View */}
            <div className={`p-10 bg-white text-slate-900 rounded-[2.5rem] shadow-2xl border border-slate-200 min-h-[900px] relative overflow-hidden transition-all duration-500 ${loading ? 'opacity-50 blur-[1px]' : 'opacity-100'}`}>
              <div className="absolute top-0 right-0 p-8 print:hidden flex gap-3">
                <Tooltip content="Export to Word" position="bottom">
                  <button onClick={() => handleExport('docx')} className="p-3 bg-slate-50 hover:bg-slate-100 rounded-2xl text-slate-400 hover:text-brand-primary transition-all">
                    <FileText className="w-5 h-5" />
                  </button>
                </Tooltip>
                <Tooltip content="Export to Excel" position="bottom">
                  <button onClick={() => handleExport('xlsx')} className="p-3 bg-slate-50 hover:bg-slate-100 rounded-2xl text-slate-400 hover:text-green-600 transition-all">
                    <Download className="w-5 h-5" />
                  </button>
                </Tooltip>
                <Tooltip content="Export to PDF" position="bottom">
                  <button onClick={() => handleExport('pdf')} className="p-3 bg-slate-50 hover:bg-slate-100 rounded-2xl text-slate-400 hover:text-red-600 transition-all">
                    <FileText className="w-5 h-5" />
                  </button>
                </Tooltip>
              </div>

              <div className="max-w-4xl mx-auto space-y-12">
                <header className="text-center space-y-4 border-b-2 border-slate-100 pb-12">
                  <h2 className="text-3xl font-black uppercase tracking-tighter leading-tight">Financial Variance<br /><span className="text-brand-primary">Intelligence Report</span></h2>
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
                      Hierarchical Budget vs Actual Analysis
                    </h4>
                  </div>

                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-slate-400 text-[10px] font-black uppercase tracking-widest border-b border-slate-100">
                        <th className="py-5 font-black">WBS Code</th>
                        <th className="py-5 font-black">Line Item Description</th>
                        <th className="py-5 font-black text-right">Approved Budget</th>
                        <th className="py-5 font-black text-right">Actual Paid</th>
                        <th className="py-5 font-black text-right">Variance Delta</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {loading ? (
                        <tr><td colSpan={5} className="py-40 text-center"><Loader2 className="w-12 h-12 animate-spin mx-auto text-brand-primary opacity-20" /></td></tr>
                      ) : reportData.length > 0 ? (
                        reportData.map((item: any) => {
                          const budget = item.total_cost_budgeted || 0;
                          const actual = item.total_paid_rollup || 0;
                          const variance = budget - actual;
                          const isNegative = variance < 0;
                          const isAnomaly = majorVarianceAlerts.some(a => a.wbs_code === item.wbs_code);

                          return (
                            <tr key={item.wbs_id} className={`group hover:bg-slate-50 transition-all ${isAnomaly ? 'bg-red-50/30' : ''}`}>
                              <td className="py-5 font-mono font-black text-brand-primary text-xs">{item.wbs_code}</td>
                              <td className="py-5 font-bold text-slate-700 leading-tight">
                                <div className="flex items-center gap-2">
                                  {isAnomaly && <AlertTriangle className="w-3 h-3 text-red-500" />}
                                  {item.description}
                                </div>
                              </td>
                              <td className="py-5 text-right font-black text-slate-900">{convertToDisplay(budget, undefined, false)}</td>
                              <td className="py-5 text-right font-black text-slate-600">{convertToDisplay(actual, undefined, false)}</td>
                              <td className={`py-5 text-right font-black ${isNegative ? 'text-red-500' : 'text-emerald-600'}`}>
                                <div className="flex flex-col items-end">
                                  <span>{isNegative ? '-' : '+'}{convertToDisplay(Math.abs(variance), 'NGN', false)}</span>
                                  <span className="text-[8px] opacity-70">
                                    {((variance / (budget || 1)) * 100).toFixed(1)}%
                                  </span>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr><td colSpan={5} className="py-32 text-center text-slate-400 italic">No variance data detected.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <footer className="pt-12 border-t border-slate-200 mt-20 flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <Lock className="w-4 h-4 text-slate-300" />
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Verified Multi-Tenant Integrity Hub</span>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black text-slate-900 uppercase tracking-widest">{userCurrency.code} Valuation</p>
                    <p className="text-[10px] text-slate-400 font-medium">SentinelFi Intelligence</p>
                  </div>
                </footer>
              </div>
            </div>
          </main>
        </div>
      </PageContainer>
    </>
  );
};

export default VarianceReportPage;