import React, { useEffect, useState, useMemo } from 'react';
import Head from 'next/head';
import PageContainer from '../../components/Layout/PageContainer';
import { useAuth, Role } from '../../components/context/AuthContext';
import { LayoutDashboard, Zap, FileText, Bell, Clock, BarChart2, Loader2, Briefcase, TrendingUp, ArrowRight, ShoppingCart } from 'lucide-react';
import Link from 'next/link';
import Card from '../../components/common/Card';
import { useSecuredApi } from '../../components/hooks/useSecuredApi';
import { useCurrency } from '../../components/context/CurrencyContext'; // Import Currency Hook
import Button from '../../components/common/Button';

interface SummaryStats {
  totalBudgeted: number;
  totalActualPaid: number;
  variancePercentage: number;
  burnRatePercentage: number;
  pendingApprovals?: number;
  avgDailySpend?: number;
  estimatedExhaustionDate?: string | null;
  history?: { date: string; amount: number }[];
}

import PredictiveAnalytics from '../../components/dashboard/PredictiveAnalytics';

interface ProjectData {
  project_id: string;
  project_name: string;
}

interface ActivityLog {
  id: string;
  action: string;
  details: any;
  timestamp: string;
}

import useGlobalStore from '../../store/globalStore';

const DashboardHome: React.FC = () => {
  const { user, hasAnyRole, getPrimaryRole } = useAuth();
  const api = useSecuredApi();
  const { convertToDisplay, userCurrency } = useCurrency();
  const { selectedProjectId, setSelectedProjectId } = useGlobalStore();
  const [stats, setStats] = useState<SummaryStats | null>(null);
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewContext, setViewContext] = useState<'project' | 'operational'>('project');
  const [pendingCount, setPendingCount] = useState(0);
  const [projects, setProjects] = useState<ProjectData[]>([]);

  useEffect(() => {
    if (!user) return;
    api.get('/projects?limit=100')
      .then((res: any) => setProjects(res.data?.projects || res.projects || []))
      .catch((err: any) => {
        if (err?.response?.status !== 403 && !err?._isForbidden) {
          console.error('Failed to fetch projects for dashboard', err);
        } else {
          console.debug('[Dashboard] Projects fetch skipped — forbidden for role');
        }
      });
  }, [user]);

  const projectCurrencyMap = useMemo(() => {
    return projects.reduce((acc, p) => {
      acc[p.project_id] = (p as any).currency || 'NGN';
      return acc;
    }, {} as Record<string, string>);
  }, [projects]);

  useEffect(() => {
    // Guard: Don't fetch if user isn't loaded yet
    if (!user) return;

    const controller = new AbortController();
    let isCancelled = false;

    const fetchDashboardContent = async () => {
      setLoading(true);
      try {
        const role = getPrimaryRole();
        const isSuperAdmin = role === Role.SuperAdmin;
        const auditLogPath = isSuperAdmin ? '/admin/audit-logs' : '/admin/audit-logs/tenant';

        // Choose endpoint based on viewContext
        // If 'operational', we might want a different filtering or just consolidated
        const dashboardUrl = selectedProjectId === 'all'
          ? '/dashboard/executive'
          : `/dashboard/executive?projectId=${selectedProjectId}`;

        const [execRes, summaryRes, activityRes] = await Promise.all([
          api.get(dashboardUrl, { signal: controller.signal }),
          api.get('/dashboard/summary', { signal: controller.signal }),
          api.get(`${auditLogPath}?limit=5`, { signal: controller.signal })
        ]);

        if (!isCancelled) {
          const executiveData = execRes.data;
          setStats({
            ...executiveData.overview,
            history: executiveData.history
          });
          setPendingCount(summaryRes.data.pendingApprovals);
          setActivities(activityRes.data.logs || activityRes.data.data || []);
        }
      } catch (error: any) {
        if (error.name === 'AbortError' || error.name === 'CanceledError' || error.code === 'ERR_CANCELED') {
          return;
        }
        if (!isCancelled) {
          if (error?.response?.status === 403 || error?._isForbidden) {
            console.debug('[Dashboard] Insufficient role for dashboard endpoint:', error?.config?.url);
            // Show empty state instead of error spam — role lacks dashboard permission
          } else {
            console.error('Failed to load dashboard data:', error);
          }
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    };

    fetchDashboardContent();

    return () => {
      isCancelled = true;
      controller.abort();
    };
  }, [user?.id, api, selectedProjectId, viewContext]);

  const actionLinks = [
    { label: 'View Executive Dashboard', href: '/dashboard/ceo', icon: LayoutDashboard, roles: [Role.CEO, Role.FinanceManager, Role.AdminDirector, Role.TechnicalDirector, Role.OperationalDirector] },
    { label: 'Initiate Spend (P2P)', href: '/budget/p2p', icon: ShoppingCart, roles: [Role.CEO, Role.FinanceManager, Role.AdminDirector, Role.TechnicalDirector, Role.OperationalDirector] },
    { label: 'Log New Expense', href: '/expense/tracker', icon: Zap, roles: [Role.AssignedProjectUser, Role.AdminDirector, Role.CEO, Role.FinanceManager, Role.TechnicalDirector, Role.OperationalDirector] },
    { label: 'Draft a New Budget', href: '/budget/draft', icon: FileText, roles: [Role.FinanceManager, Role.AdminDirector] },
    { label: 'View Financial Reports', href: '/reporting/variance', icon: LayoutDashboard, roles: [Role.FinanceManager, Role.AdminDirector, Role.OperationalDirector, Role.CEO] },
  ];

  const relevantActions = actionLinks.filter(link => hasAnyRole(link.roles));

  const displayName = (user?.first_name || user?.last_name) 
    ? `${user?.first_name || ''} ${user?.last_name || ''}`.trim() 
    : user?.email.split('@')[0];

  return (
    <>
      <Head><title>Welcome | SentinelFi</title></Head>
      <PageContainer
        title={`Welcome, ${displayName}!`}
        subtitle={`You are logged in as a ${(getPrimaryRole() || '').replace(/_/g, ' ').replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.substring(1).toLowerCase())}.`}
      >
        {/* Executive Controls Row */}
        <div className="flex items-center justify-start gap-4 p-4 bg-brand-dark rounded-2xl border border-gray-700 mb-8">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewContext('project')}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition flex items-center gap-2 ${viewContext === 'project' ? 'bg-brand-primary text-white shadow-lg shadow-brand-primary/20' : 'bg-gray-800 text-gray-400'}`}
            >
              <Zap className="w-4 h-4" /> Project & Operations
            </button>
            <button
              onClick={() => setViewContext('operational')}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition flex items-center gap-2 ${viewContext === 'operational' ? 'bg-brand-primary text-white shadow-lg shadow-brand-primary/20' : 'bg-gray-800 text-gray-400'}`}
            >
              <BarChart2 className="w-4 h-4" /> Operational Overhead
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
          {relevantActions.map((action, index) => (
            <Link
              key={index}
              href={action.href}
              className="flex flex-col items-center justify-center p-6 bg-brand-dark/40 rounded-2xl border border-gray-700 hover:border-brand-primary/50 hover:bg-white/5 transition duration-300 text-center group"
            >
              <div className="w-12 h-12 rounded-full bg-brand-primary/10 flex items-center justify-center mb-4 group-hover:scale-110 transition">
                <action.icon className="w-6 h-6 text-brand-primary" />
              </div>
              <p className="font-bold text-white mb-1">{action.label}</p>
              <p className="text-[10px] text-gray-500 uppercase tracking-widest">Perform Action</p>
            </Link>
          ))}
        </div>

        {/* Unified Intelligence Section (Forecasting & Trend) */}
        {stats && (
          <div className="mb-12">
            <PredictiveAnalytics
              history={stats.history || []}
              totalBudgeted={stats.totalBudgeted}
              totalActualPaid={stats.totalActualPaid}
              avgDailySpend={stats.avgDailySpend || 0}
              estimatedExhaustionDate={stats.estimatedExhaustionDate || null}
              currency={selectedProjectId === 'all' ? 'NGN' : (projectCurrencyMap[selectedProjectId] || 'NGN')}
            />
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pb-8">
          <div className="lg:col-span-4 flex flex-col gap-6">
            <Card title="Activity Stream" borderTopColor="secondary" className="h-full min-h-[400px]">
              <div className="space-y-4">
                {activities.length > 0 ? (
                  activities.map(log => (
                    <div key={log.id} className="flex items-start gap-3 p-2 hover:bg-white/5 rounded-lg transition">
                      <div className="mt-1 p-1 bg-gray-800 rounded">
                        <Clock className="w-3 h-3 text-gray-400" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-200 capitalize">{log.action.replace(/_/g, ' ')}</p>
                        <p className="text-[10px] text-gray-500 uppercase tracking-tighter">{new Date(log.timestamp).toLocaleString()}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 text-sm italic">Quiescent. No activities recorded.</p>
                )}
                <Link href="/admin/audit-logs" className="text-brand-primary text-xs font-bold mt-4 block hover:underline uppercase tracking-widest">Monitor Full Audit</Link>
              </div>
            </Card>
          </div>

          <div className="lg:col-span-8">
            {loading ? (
              <div className="flex items-center justify-center h-full min-h-[400px] bg-brand-dark rounded-2xl border border-dashed border-gray-700">
                <Loader2 className="w-8 h-8 animate-spin text-brand-primary" />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
                {/* Financial Snapshot - Dynamic based on selection */}
                <Card title="Financial Snapshot" borderTopColor="primary">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 mb-4">
                    <div className="min-w-0">
                      <p className="text-[10px] text-gray-500 uppercase font-black mb-1">Total Allocated</p>
                      <p className="text-xl sm:text-2xl font-bold text-white break-words">{convertToDisplay(stats?.totalBudgeted || 0, selectedProjectId === 'all' ? 'NGN' : (projectCurrencyMap[selectedProjectId] || 'NGN'))}</p>
                    </div>
                    <div className="sm:text-right min-w-0">
                      <p className="text-[10px] text-gray-500 uppercase font-black mb-1">Spent to Date</p>
                      <p className="text-xl sm:text-2xl font-bold text-white break-words">{convertToDisplay(stats?.totalActualPaid || 0, selectedProjectId === 'all' ? 'NGN' : (projectCurrencyMap[selectedProjectId] || 'NGN'))}</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-gray-400 font-bold uppercase tracking-tight">Relative Variance</span>
                      <span className={`px-2 py-0.5 rounded text-black font-black ${stats && stats.variancePercentage > 0 ? 'bg-alert-critical' : 'bg-alert-positive'}`}>
                        {stats?.variancePercentage.toFixed(2)}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-800 h-2 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-1000 ${stats && stats.variancePercentage > 5 ? 'bg-alert-critical' : 'bg-brand-primary'}`}
                        style={{ width: `${Math.min(100, (stats?.totalActualPaid || 0) / (stats?.totalBudgeted || 1) * 100)}%` }}
                      ></div>
                    </div>
                  </div>
                </Card>

                {/* Budget Utilization - Performance indicator */}
                <Card title="Budget Utilization" borderTopColor="alert">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-2xl sm:text-3xl font-black text-white">
                      {stats?.burnRatePercentage.toFixed(1)}%
                    </p>
                    <div className={`p-2 rounded-full ${stats && stats.burnRatePercentage > 90 ? 'bg-red-900/40' : 'bg-brand-primary/20'}`}>
                      <TrendingUp className={`w-5 h-5 ${stats && stats.burnRatePercentage > 90 ? 'text-red-500' : 'text-brand-primary'}`} />
                    </div>
                  </div>
                  <p className="text-[10px] sm:text-xs text-gray-500 mb-4">Percentage of total approved budget consumed to date.</p>
                  <div className="flex gap-1 h-3">
                    {[...Array(10)].map((_, i) => (
                      <div
                        key={i}
                        className={`flex-grow rounded-sm transition-all duration-500 ${stats && stats.burnRatePercentage > (i * 10) ? (i > 7 ? 'bg-alert-critical' : 'bg-brand-primary') : 'bg-gray-800'}`}
                      />
                    ))}
                  </div>
                </Card>

                {/* Notifications & Approvals */}
                <Card title="Pending Review" borderTopColor="alert" className="md:col-span-2">
                  <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-alert-critical/10 flex items-center justify-center">
                        <Bell className="w-6 h-6 text-alert-critical" />
                      </div>
                      <div>
                        <p className="text-xl font-bold text-white">{pendingCount} Items Pending</p>
                        <p className="text-xs text-gray-500">Budget drafts and exceptions awaiting your directive.</p>
                      </div>
                    </div>
                    <Link href="/financials/approvals">
                      <Button variant="primary" className="whitespace-nowrap">Go to Approvals <ArrowRight className="w-4 h-4 ml-2" /></Button>
                    </Link>
                  </div>
                </Card>
              </div>
            )}
          </div>
        </div>

        <p className="mt-8 text-sm text-gray-500 italic">
          Tip: You can use the left-hand sidebar for quick access to specific modules like the WBS Manager or Executive Reports.
        </p>
      </PageContainer>
    </>
  );
};

export default DashboardHome;
