import React, { useEffect, useState, useCallback, useMemo } from 'react';
import Head from 'next/head';
import dynamic from 'next/dynamic'; // Import dynamic
import PageContainer from '../../components/Layout/PageContainer';
import { useSecuredApi } from '../../components/hooks/useSecuredApi';
import { useAuth } from '../../components/context/AuthContext';
import { useCurrency } from '../../components/context/CurrencyContext'; // Import Hook
// No formatting required here anymore
import WBSHierarchyTree from '../../components/dashboard/WBSHierarchyTree';
import SpendingChart from '../../components/dashboard/SpendingChart';
import Card from '../../components/common/Card';
import KpiCard from '../../components/common/KpiCard';
import MetricHero from '../../components/dashboard/MetricHero';
import TimeRangeSelector from '../../components/dashboard/TimeRangeSelector';
import useGlobalStore, { TIME_RANGE_PRESETS } from '../../store/globalStore';
import { Role } from '../../components/context/AuthContext';
import { Loader2, Search, RefreshCcw, LayoutDashboard, Briefcase, Settings, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import withAuth from '../../components/auth/withAuth';

import 'react-datepicker/dist/react-datepicker.css'; // Keep CSS import here
import WBSDetailModal from '../../components/dashboard/WBSDetailModal';

// Dynamically import DatePicker with SSR turned off
const DatePicker = dynamic(() => import('react-datepicker'), {
  ssr: false,
});

// Helper to format date to YYYY-MM-DD
const toYYYYMMDD = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

// Interface for the data returned from the production-ready Recursive CTE endpoint
interface RollupData {
  wbs_id: string;
  parent_wbs_id: string | null;
  wbs_code: string;
  description: string;
  total_cost_budgeted: string; // From DB (NUMERIC)
  total_paid_rollup: string;   // From DB (NUMERIC)
  total_paid_self: string;     // From DB (NUMERIC)
  total_committed_lpo: string;
}

const CEODashboard: React.FC = () => {
  const { user } = useAuth();
  const api = useSecuredApi();
  const { convertToDisplay } = useCurrency(); // Hook
  const [data, setData] = useState<RollupData[]>([]);
  const [projects, setProjects] = useState<{ project_id: string; project_name: string; currency?: string }[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('all');
  const [viewContext, setViewContext] = useState<'project' | 'operational'>('project');
  const [loading, setLoading] = useState(true);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [error, setError] = useState<string | null>(null); // State for error handling

  const [startDate, setStartDate] = useState<Date | null>(() => {
    const today = new Date();
    return new Date(today.getFullYear(), 0, 1); // Default to start of current year
  });
  const [endDate, setEndDate] = useState<Date | null>(new Date()); // Default to today

  const [onPageSearchTerm, setOnPageSearchTerm] = useState<string>(''); // For WBS table search
  const timeRange = useGlobalStore((s) => s.timeRange);

  // State for WBS Detail Modal
  const [showWBSDetailModal, setShowWBSDetailModal] = useState(false);
  const [selectedWBS, setSelectedWBS] = useState<{ id: string; code: string; description: string } | null>(null);

  const [kpis, setKpis] = useState({
    totalBudget: 0,
   totalActualPaid: 0,
    totalCommittedLPO: 0,
    variancePercentage: 0,
    burnRate: 0,
    avgDailySpend: 0,
    estimatedExhaustionDate: null as string | null,
    riskLevel: 'OK' as string,
  });


  // Move the window when the global preset changes; manual DatePicker edits
  // take over from there without fighting the selector.
  useEffect(() => {
    const days = TIME_RANGE_PRESETS[timeRange].days;
    const end = new Date();
    const start = new Date(end);
    start.setDate(start.getDate() - (days - 1));
    setStartDate(start);
    setEndDate(end);
  }, [timeRange]);

  const fetchProjects = useCallback(async () => {
    setLoadingProjects(true);
    try {
      const resp = await api.get('/projects?limit=100');
      setProjects(resp.data.projects || resp.data.data || []);
    } catch (err: any) {
      if (err.name === 'CanceledError' || err.code === 'ERR_CANCELED') return;
      console.error('Failed to fetch projects:', err);
    } finally {
      setLoadingProjects(false);
    }
  }, [api]);

  const projectCurrencyMap = useMemo(() => {
    return projects.reduce((acc, p) => {
      acc[p.project_id] = p.currency || 'NGN';
      return acc;
    }, {} as Record<string, string>);
  }, [projects]);

  // Backend-declared source (executive figures are base-normalized); the
  // local guess only covers the OPEX branch + stale backends.
  const [execCurrency, setExecCurrency] = useState<string | null>(null);
  const sourceCurrency =
    execCurrency ||
    (selectedProjectId === 'all' ? 'NGN' : projectCurrencyMap[selectedProjectId] || 'NGN');

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    setError(null); // Clear any previous errors
    try {
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', toYYYYMMDD(startDate)); // Format date
      if (endDate) params.append('endDate', toYYYYMMDD(endDate)); // Format date
      if (selectedProjectId !== 'all') params.append('projectId', selectedProjectId);

      if (viewContext === 'operational') {
        const opexResp = await api.get(`/operational-budgets/rollup?${params.toString()}`);
        const opexData = opexResp.data;

        // Map OPEX to RollupData format for the WBS tree visualization
        const mappedData: RollupData[] = [];
        opexData.budgets?.forEach((b: any) => {
          mappedData.push({
            wbs_id: b.id,
            parent_wbs_id: null,
            wbs_code: String(b.type || 'OPEX').toUpperCase(),
            description: b.name,
            total_cost_budgeted: b.totalBudget.toString(),
            total_paid_rollup: b.totalSpend.toString(),
            total_paid_self: '0',
            total_committed_lpo: '0'
          });
          b.categories?.forEach((c: any) => {
            mappedData.push({
              wbs_id: c.id,
              parent_wbs_id: b.id,
              wbs_code: 'CAT',
              description: c.name,
              total_cost_budgeted: c.budgeted.toString(),
              total_paid_rollup: c.actual.toString(),
              total_paid_self: c.actual.toString(),
              total_committed_lpo: '0'
            });
          });
        });

        setData(mappedData);
        setKpis({
          totalBudget: opexData.summary.totalBudget,
          totalActualPaid: opexData.summary.totalSpend,
          totalCommittedLPO: 0, // OPEX usually doesn't use LPOs in SentinelFi
          variancePercentage: (opexData.summary.totalBudget > 0 ? ((opexData.summary.totalSpend - opexData.summary.totalBudget) / opexData.summary.totalBudget) * 100 : 0),
          burnRate: opexData.summary.overallBurnRate,
          avgDailySpend: opexData.summary.avgDailySpend || 0,
          estimatedExhaustionDate: opexData.summary.estimatedExhaustionDate || null,
          riskLevel: opexData.summary.riskLevel || 'OK',
        });

      } else {
        // Fetch the main WBS rollup data for Project Context
        const response = await api.get<RollupData[]>(`/wbs/budget/rollup?${params.toString()}`);
        setData(response.data);

        // Fetch executive-specific analytics (Project Context)
        const execResp = await api.get(`/dashboard/executive?${params.toString()}`);
        const execData = execResp.data;
        if (typeof execData.currency === 'string' && execData.currency) {
          setExecCurrency(execData.currency.toUpperCase());
        }

        setKpis({
          totalBudget: execData.overview.totalBudgeted,
          totalActualPaid: execData.overview.totalActualPaid,
          totalCommittedLPO: execData.overview.totalCommittedLPO || 0,
          variancePercentage: execData.overview.variancePercentage,
          burnRate: execData.overview.burnRatePercentage,
          avgDailySpend: execData.overview.avgDailySpend || 0,
          estimatedExhaustionDate: execData.overview.estimatedExhaustionDate || null,
          riskLevel: execData.overview.riskLevel || 'OK',
        });

      }

    } catch (err: any) {
      if (err.name === 'CanceledError' || err.code === 'ERR_CANCELED') return;
      console.error('Failed to fetch dashboard data:', err);
      setError(err.response?.data?.message || err.message || 'An unknown error occurred');
    } finally {
      setLoading(false);
    }
  }, [api, startDate, endDate, selectedProjectId, viewContext]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]); // Re-fetch data when date range changes

  // Calculate the final KPIs whenever the data changes (DEPRECATED - now using executive endpoint)
  /*
  useEffect(() => {
    ...
  }, [data]);
  */

  // Filtered data for the WBS Hierarchy Tree based on onPageSearchTerm
  const filteredWBSData = useMemo(() => {
    if (!onPageSearchTerm) return data;
    const lowerCaseSearchTerm = onPageSearchTerm.toLowerCase();
    return data.filter(item =>
      item.wbs_code.toLowerCase().includes(lowerCaseSearchTerm) ||
      item.description.toLowerCase().includes(lowerCaseSearchTerm)
    );
  }, [data, onPageSearchTerm]);

  // Handler for WBS drill-down click
  const handleWBSClick = (wbsId: string, wbsCode: string, description: string) => {
    setSelectedWBS({ id: wbsId, code: wbsCode, description: description });
    setShowWBSDetailModal(true);
  };

  return (
    <>
      <Head>
        <title>CEO Dashboard | SentinelFi</title>
      </Head>
      <PageContainer title="Executive Financial Oversight">
        <div className="space-y-6">
          {error && (
            <div className="bg-alert-critical/10 border border-alert-critical/30 text-alert-critical p-4 rounded-lg flex items-center justify-between" role="alert">
              <span>Error loading dashboard data: {error}</span>
              <button onClick={fetchDashboardData} className="ml-4 px-3 py-1 bg-alert-critical/20 hover:bg-alert-critical/30 rounded-md flex items-center">
                <RefreshCcw className="w-4 h-4 mr-2" /> Retry
              </button>
            </div>
          )}


          {/* Executive header: Duality Toggle and Global Shortcuts */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 p-4 bg-brand-dark/30 border border-gray-700 rounded-lg">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setViewContext('project')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl transition ${viewContext === 'project' ? 'bg-brand-primary text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
              >
                <Briefcase className="w-4 h-4" /> Operations & Projects
              </button>
              <button
                onClick={() => setViewContext('operational')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl transition ${viewContext === 'operational' ? 'bg-brand-primary text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
              >
                <LayoutDashboard className="w-4 h-4" /> Operational Overheads
              </button>
            </div>

            <div className="flex items-center gap-4">
              <Link href="/projects/manage" className="flex items-center gap-2 text-sm text-gray-400 hover:text-brand-primary transition">
                <Settings className="w-4 h-4" /> Manage Projects
              </Link>
              <Link href="/operational-budgets/manage" className="flex items-center gap-2 text-sm text-gray-400 hover:text-brand-primary transition">
                <Settings className="w-4 h-4" /> Manage Ope-Budgets
              </Link>
            </div>
          </div>

          {/* Controls Section: Project Selector, Date Picker, Search, Refresh */}
          <Card className="p-4 flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-4">
              {/* Project Selector - Added based on user request */}
              <div className="flex items-center gap-2">
                <label className="text-gray-300 text-sm whitespace-nowrap">Target Project:</label>
                <select
                  value={selectedProjectId}
                  onChange={(e) => setSelectedProjectId(e.target.value)}
                  className="p-2 bg-brand-dark/50 border border-gray-600 rounded-lg text-white focus:ring-brand-primary focus:border-brand-primary w-48"
                  disabled={loadingProjects}
                >
                  <option value="all">Consolidated (All Projects)</option>
                  {projects.map(p => (
                    <option key={p.project_id} value={p.project_id}>{p.project_name}</option>
                  ))}
                </select>
              </div>

              <div className="h-6 w-px bg-gray-700 mx-2 hidden lg:block" />

              <div className="flex items-center gap-3">
                <label className="text-gray-300 text-sm">Date Range:</label>
                <TimeRangeSelector />
                <div className="flex items-center gap-2">
                  <DatePicker
                    selected={startDate}
                    onChange={(date: Date | null) => setStartDate(date)}
                    selectsStart
                    startDate={startDate}
                    endDate={endDate}
                    className="p-2 bg-brand-dark/50 border border-gray-600 rounded-lg text-white focus:ring-brand-primary focus:border-brand-primary w-32"
                    dateFormat="yyyy/MM/dd"
                    placeholderText="Start Date"
                  />
                  <span className="text-gray-500">–</span>
                  <DatePicker
                    selected={endDate}
                    onChange={(date: Date | null) => setEndDate(date)}
                    selectsEnd
                    startDate={startDate}
                    endDate={endDate}
                    minDate={startDate}
                    className="p-2 bg-brand-dark/50 border border-gray-600 rounded-lg text-white focus:ring-brand-primary focus:border-brand-primary w-32"
                    dateFormat="yyyy/MM/dd"
                    placeholderText="End Date"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search WBS..."
                  value={onPageSearchTerm}
                  onChange={(e) => setOnPageSearchTerm(e.target.value)}
                  className="pl-9 p-2 w-48 bg-brand-dark/50 border border-gray-600 rounded-lg text-white focus:ring-brand-primary focus:border-brand-primary"
                />
              </div>
              <button
                onClick={fetchDashboardData}
                className="px-4 py-2 bg-brand-primary rounded-lg text-white hover:bg-brand-primary/90 transition flex items-center disabled:opacity-50"
                disabled={loading}
              >
                <RefreshCcw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} /> Refresh
              </button>
            </div>
          </Card>

          {/* Section 1: Executive KPI hierarchy — one primary + secondaries */}
          {loading ? (
            <div className="flex items-center justify-center rounded-lg border border-dashed border-gray-700 py-16" role="status">
              <Loader2 className="w-6 h-6 animate-spin text-brand-primary" />
              <span className="ml-3 text-sm text-gray-400">Loading executive metrics...</span>
            </div>
          ) : (
            <div className="space-y-4">
              <MetricHero
                label="Total Budgeted Cost"
                value={convertToDisplay(kpis.totalBudget, sourceCurrency)}
                period={`${sourceCurrency} · ${viewContext === 'operational' ? 'Operational Overheads' : 'Projects & Operations'}`}
                progress={{
                  current: kpis.totalActualPaid,
                  target: kpis.totalBudget,
                  label: 'Spent of budget',
                }}
                anomaly={kpis.variancePercentage > 5 ? `Spend exceeds allocation by ${Math.abs(kpis.variancePercentage).toFixed(1)}%` : null}
              />

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
                <KpiCard
                  label="Actual Expenditures"
                  value={convertToDisplay(kpis.totalActualPaid, sourceCurrency)}
                  tone="neutral"
                  footer={<span className="text-label-sm text-gray-500">Total cash outflow</span>}
                />
                <KpiCard
                  label="Committed LPOs"
                  value={convertToDisplay(kpis.totalCommittedLPO, sourceCurrency)}
                  tone="warning"
                  footer={<span className="text-label-sm text-gray-500">Open, unpaid pipeline</span>}
                />
                <KpiCard
                  label="Burn Rate"
                  value={`${kpis.burnRate.toFixed(1)}%`}
                  tone={kpis.burnRate > 90 ? 'critical' : kpis.burnRate > 75 ? 'warning' : 'positive'}
                  footer={
                    <div className="h-1 w-full rounded-full bg-gray-700" role="progressbar" aria-valuenow={Math.round(kpis.burnRate)} aria-valuemin={0} aria-valuemax={100} aria-label="Burn rate">
                      <div className={`h-full rounded-full ${kpis.burnRate > 90 ? 'bg-alert-critical' : 'bg-brand-primary'}`} style={{ width: `${Math.min(kpis.burnRate, 100)}%` }} />
                    </div>
                  }
                />
                <KpiCard
                  label="Context Variance"
                  value={`${kpis.variancePercentage > 0 ? '+' : ''}${kpis.variancePercentage.toFixed(2)}%`}
                  tone={kpis.variancePercentage > 0 ? 'critical' : 'positive'}
                  footer={<span className="text-label-sm text-gray-500">{kpis.variancePercentage > 0 ? 'Over plan' : 'Under plan'}</span>}
                />
                <KpiCard
                  label="Burn Run-Rate"
                  value={convertToDisplay(kpis.avgDailySpend, sourceCurrency)}
                  tone="neutral"
                  footer={<span className="text-label-sm text-gray-500">Avg. daily spend</span>}
                />
                <KpiCard
                  label="Projected Exhaustion"
                  value={kpis.estimatedExhaustionDate ? new Date(kpis.estimatedExhaustionDate).toLocaleDateString('en-GB') : 'SUSTAINABLE'}
                  tone={kpis.riskLevel === 'CRITICAL' ? 'critical' : kpis.riskLevel === 'WARNING' ? 'warning' : 'positive'}
                  footer={<span className="text-label-sm text-gray-500">Risk: {kpis.riskLevel}</span>}
                />
              </div>
            </div>
          )}

          {/* Section 2: WBS Breakdown (Hierarchy and Chart View) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card title={selectedProjectId === 'all' ? 'Consolidated WBS Cost Structure' : 'Project WBS Cost Structure'} className="lg:col-span-1">
              {loading ? (
                <div className="flex items-center justify-center h-full text-brand-primary"><Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading WBS...</div>
              ) : filteredWBSData.length === 0 ? (
                <div className="flex items-center justify-center h-full text-gray-400">No WBS data available. Adjust search or date range.</div>
              ) : (
                <WBSHierarchyTree data={filteredWBSData} onWBSClick={handleWBSClick} sourceCurrency={sourceCurrency} />
              )}
            </Card>
            <Card title="WBS Level 1 Spending vs. Budget" className="lg:col-span-2">
              {loading ? (
                <div className="flex items-center justify-center h-full text-brand-primary"><Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading chart...</div>
              ) : filteredWBSData.length === 0 ? (
                <div className="flex items-center justify-center h-full text-gray-400">No chart data available. Adjust search or date range.</div>
              ) : (
                <SpendingChart data={filteredWBSData} sourceCurrency={sourceCurrency} />
              )}
            </Card>
          </div>

        </div>
      </PageContainer>

      {/* WBS Detail Modal */}
      <WBSDetailModal
        isOpen={showWBSDetailModal}
        onClose={() => setShowWBSDetailModal(false)}
        wbsId={selectedWBS?.id || null}
        wbsCode={selectedWBS?.code || null}
        description={selectedWBS?.description || null}
      />
    </>
  );
};

export default withAuth(CEODashboard, [Role.CEO, Role.FinanceManager]);