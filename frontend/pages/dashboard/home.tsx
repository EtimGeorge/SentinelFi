import React, { useMemo } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { Zap, BarChart2, ArrowRight, Clock, CircleAlert } from 'lucide-react';
import PageContainer from '../../components/Layout/PageContainer';
import { useAuth, Role } from '../../components/context/AuthContext';
import Card from '../../components/common/Card';
import KpiCard from '../../components/common/KpiCard';
import MetricHero from '../../components/dashboard/MetricHero';
import TimeRangeSelector from '../../components/dashboard/TimeRangeSelector';
import ViewManager from '../../components/dashboard/ViewManager';
import MetricDrilldown from '../../components/dashboard/MetricDrilldown';
import PredictiveAnalytics from '../../components/dashboard/PredictiveAnalytics';
import { useSecuredApi } from '../../components/hooks/useSecuredApi';
import { useCurrency } from '../../components/context/CurrencyContext';
import useGlobalStore from '../../store/globalStore';
import { TIME_RANGE_PRESETS } from '../../store/globalStore';
import { formatDateRange } from '../../lib/dateRange';
import { useDashboardMetrics } from '../../components/hooks/useDashboardMetrics';

interface ProjectData {
  project_id: string;
  project_name: string;
  currency?: string;
}

const timeAgo = (timestamp: string): string => {
  const diffMs = Date.now() - new Date(timestamp).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
};

const DashboardHome: React.FC = () => {
  const { user, hasAnyRole, getPrimaryRole } = useAuth();
  const api = useSecuredApi();
  const { convertToDisplay, userCurrency } = useCurrency();
  const { selectedProjectId, timeRange } = useGlobalStore();
  const [projects, setProjects] = React.useState<ProjectData[]>([]);
  const [viewContext, setViewContext] = React.useState<'project' | 'operational'>('project');
  const [isDrilldownOpen, setIsDrilldownOpen] = React.useState(false);
  const { metrics, activities, loading, error } = useDashboardMetrics();

  React.useEffect(() => {
    if (!user) return;
    api.get('/projects?limit=100')
      .then((res: any) => setProjects(res.data?.projects || res.projects || []))
      .catch((err: any) => {
        if (err?.response?.status !== 403 && !err?._isForbidden) {
          console.error('Failed to fetch projects for dashboard', err);
        }
      });
  }, [user]);

  const projectCurrencyMap = useMemo(() => {
    return projects.reduce((acc, p) => {
      acc[p.project_id] = p.currency || 'NGN';
      return acc;
    }, {} as Record<string, string>);
  }, [projects]);

  const currency = selectedProjectId === 'all' ? 'USD' : (projectCurrencyMap[selectedProjectId] || 'NGN');
  const periodLabel = formatDateRange(timeRange);
  const periodShort = TIME_RANGE_PRESETS[timeRange].label;

  const actionLinks = [
    { label: 'Executive Dashboard', href: '/dashboard/ceo', roles: [Role.CEO, Role.FinanceManager, Role.AdminDirector, Role.TechnicalDirector, Role.OperationalDirector] },
    { label: 'Initiate Spend (P2P)', href: '/budget/p2p', roles: [Role.CEO, Role.FinanceManager, Role.AdminDirector, Role.TechnicalDirector, Role.OperationalDirector] },
    { label: 'Log Expense', href: '/expense/tracker', roles: [Role.AssignedProjectUser, Role.AdminDirector, Role.CEO, Role.FinanceManager, Role.TechnicalDirector, Role.OperationalDirector] },
    { label: 'Draft Budget', href: '/budget/draft', roles: [Role.FinanceManager, Role.AdminDirector] },
  ];
  const relevantActions = actionLinks.filter(link => hasAnyRole(link.roles));

  const firstName = (user?.first_name || user?.email?.split('@')[0] || '').trim();
  const roleLabel = (getPrimaryRole() || '').replace(/_/g, ' ').replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.substring(1).toLowerCase());
  const budgetRemaining = (metrics?.totalBudgeted ?? 0) - (metrics?.totalActualPaid ?? 0);
  const isOverBudget = (metrics?.totalActualPaid ?? 0) > (metrics?.totalBudgeted ?? 0);

  return (
    <>
      <Head><title>Dashboard | SentinelFi</title></Head>
      <PageContainer className="pb-10 print:hidden">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-white sm:text-2xl">Financial Overview</h1>
            <p className="mt-1 text-sm text-gray-400">
              {firstName}, here&apos;s your financial position · {periodLabel}
            </p>
          </div>

          {/* Global time-range selector */}
          <div className="flex items-center gap-2">
            <TimeRangeSelector />
            <ViewManager />
          </div>
        </div>

        {/* Action bar — text links, no icon tiles */}
        <nav className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 border-b border-gray-700/60 pb-3" aria-label="Quick actions">
          {relevantActions.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="inline-flex items-center gap-1 text-sm font-medium text-gray-300 transition-colors hover:text-brand-primary"
            >
              {link.label}
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          ))}
        </nav>

        {/* Project / Operational segmented control */}
        <div className="mt-4 flex items-center gap-1 rounded-lg border border-gray-700 bg-gray-800/60 p-1 w-fit" role="group" aria-label="View scope">
          <button
            type="button"
            onClick={() => setViewContext('project')}
            aria-pressed={viewContext === 'project'}
            className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${viewContext === 'project' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'}`}
          >
            <Zap className="h-3.5 w-3.5" /> Projects & Operations
          </button>
          <button
            type="button"
            onClick={() => setViewContext('operational')}
            aria-pressed={viewContext === 'operational'}
            className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${viewContext === 'operational' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'}`}
          >
            <BarChart2 className="h-3.5 w-3.5" /> Operational Overhead
          </button>
        </div>

        {error && (
          <div className="mt-6 flex items-center gap-2 rounded-lg border border-alert-critical/30 bg-alert-critical/10 p-4 text-sm text-alert-critical" role="alert">
            <CircleAlert className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        {/* Primary metric + three secondary metrics */}
        <div className="mt-6 space-y-4">
          <MetricHero
            label="Total Allocated"
            value={convertToDisplay(metrics?.totalBudgeted || 0, currency)}
            period={`${periodLabel} · ${currency}`}
            trend={{
              value: isOverBudget ? -Math.abs(metrics?.variancePercentage || 0) : Math.abs(metrics?.variancePercentage || 0),
              period: 'vs allocation',
              sparkline: (metrics?.history || []).map(h => h.amount),
            }}
            progress={{
              current: metrics?.totalActualPaid || 0,
              target: metrics?.totalBudgeted || 1,
              label: 'Spent of allocated',
            }}
            anomaly={isOverBudget ? `Spend exceeds allocation by ${convertToDisplay((metrics?.totalActualPaid ?? 0) - (metrics?.totalBudgeted ?? 0), currency)}` : null}
            onInteractiveElementClick={hasAnyRole([Role.CEO, Role.FinanceManager, Role.AdminDirector, Role.TechnicalDirector, Role.OperationalDirector]) ? () => setIsDrilldownOpen(true) : undefined}
          />

          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <KpiCard
              label="Burn Rate"
              value={<span className="font-mono">{metrics?.burnRatePercentage.toFixed(1) || '—'}%</span>}
              tone={(metrics?.burnRatePercentage ?? 0) > 90 ? 'critical' : (metrics?.burnRatePercentage ?? 0) > 75 ? 'warning' : 'neutral'}
              footer={metrics?.estimatedExhaustionDate ? (
                <span className="text-caption">Funds exhausted by {new Date(metrics.estimatedExhaustionDate).toLocaleDateString()}</span>
              ) : undefined}
              trend={{
                value: metrics?.burnRatePercentage || 0,
                period: 'of budget consumed',
                sparkline: (metrics?.history || []).map(h => h.amount),
              }}
            />
            <KpiCard
              label="Pending Approvals"
              value={<span className="font-mono">{(metrics?.pendingApprovals ?? 0).toString()}</span>}
              tone={(metrics?.pendingApprovals ?? 0) > 0 ? 'critical' : 'positive'}
              footer={
                (metrics?.pendingApprovals ?? 0) > 0 ? (
                  <Link href="/financials/approvals" className="inline-flex items-center gap-1 text-label text-brand-primary hover:underline">
                    Review now <ArrowRight className="h-3 w-3" />
                  </Link>
                ) : (
                  <span className="text-caption">No items awaiting review</span>
                )
              }
            />
            <KpiCard
              label="Budget Remaining"
              value={<span className="font-mono">{convertToDisplay(budgetRemaining, currency)}</span>}
              tone={budgetRemaining < 0 ? 'critical' : 'neutral'}
              footer={<span className="text-caption">{isOverBudget ? 'Over allocation' : `${periodShort} spend position`}</span>}
              trend={{
                value: (metrics?.variancePercentage || 0),
                period: 'relative variance',
                sparkline: (metrics?.history || []).map(h => h.amount),
              }}
            />
          </div>
        </div>

        <div className="mt-6">
          <PredictiveAnalytics
            history={metrics?.history || []}
            totalBudgeted={metrics?.totalBudgeted || 0}
            totalActualPaid={metrics?.totalActualPaid || 0}
            avgDailySpend={metrics?.avgDailySpend || 0}
            estimatedExhaustionDate={metrics?.estimatedExhaustionDate || null}
            currency={currency}
          />
        </div>

        <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Activity stream */}
          <div className="lg:col-span-4">
            <Card variant="default" title="Activity Stream">
              <div className="space-y-3">
                {loading && activities.length === 0 ? (
                  <div className="space-y-2" aria-hidden>
                    <div className="h-9 animate-skeleton rounded-md bg-gray-700/40 motion-skeleton" />
                    <div className="h-9 animate-skeleton rounded-md bg-gray-700/40 motion-skeleton" />
                    <div className="h-9 animate-skeleton rounded-md bg-gray-700/40 motion-skeleton" />
                  </div>
                ) : activities.length > 0 ? (
                  activities.map(log => (
                    <div key={log.id} className="flex items-start gap-2.5 py-1">
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded bg-gray-700/60 text-gray-400">
                        <Clock className="h-3 w-3" />
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-200 capitalize">{log.action.replace(/_/g, ' ')}</p>
                        <p className="text-label-sm text-gray-500">{timeAgo(log.timestamp)}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-500">No activity recorded in this period.</p>
                )}
                <Link href="/admin/audit-logs" className="mt-2 inline-block text-label text-brand-primary hover:underline">
                  View full audit log
                </Link>
              </div>
            </Card>
          </div>

          {/* Executive summary card */}
          <div className="lg:col-span-8">
            <Card variant="default" title="Position Summary" subtitle={periodShort}>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <dl className="rounded-lg border border-gray-700/60 bg-gray-800/40 p-3">
                  <dt className="text-label text-gray-500">Total Allocated</dt>
                  <dd className="mt-1 font-mono text-base font-semibold text-white whitespace-nowrap overflow-hidden text-ellipsis">{convertToDisplay(metrics?.totalBudgeted || 0, currency)}</dd>
                </dl>
                <dl className="rounded-lg border border-gray-700/60 bg-gray-800/40 p-3">
                  <dt className="text-label text-gray-500">Spent to Date</dt>
                  <dd className="mt-1 font-mono text-base font-semibold text-white whitespace-nowrap overflow-hidden text-ellipsis">{convertToDisplay(metrics?.totalActualPaid || 0, currency)}</dd>
                </dl>
                <dl className="rounded-lg border border-gray-700/60 bg-gray-800/40 p-3 sm:col-span-2">
                  <dt className="text-label text-gray-500">Budget utilization</dt>
                  <dd className="mt-1">
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-700" role="progressbar" aria-valuenow={Math.round(metrics?.burnRatePercentage || 0)} aria-valuemin={0} aria-valuemax={100} aria-label="Budget utilization">
                      <div className={`h-full rounded-full ${(metrics?.burnRatePercentage ?? 0) > 90 ? 'bg-alert-critical' : 'bg-brand-primary'}`} style={{ width: `${Math.min(100, metrics?.burnRatePercentage || 0)}%` }} />
                    </div>
                    <div className="mt-1.5 flex items-center justify-between">
                      <span className="font-mono text-sm text-gray-300">{metrics?.burnRatePercentage?.toFixed(1) || '—'}% consumed</span>
                      <span className="text-label-sm text-gray-500">est. exhaustion {metrics?.estimatedExhaustionDate ? new Date(metrics.estimatedExhaustionDate).toLocaleDateString() : '—'}</span>
                    </div>
                  </dd>
                </dl>
              </div>
            </Card>
          </div>
        </div>
      </PageContainer>

      <MetricDrilldown
        isOpen={isDrilldownOpen}
        onClose={() => setIsDrilldownOpen(false)}
        title="Total Allocated"
        subtitle={`${periodLabel} · ${currency}`}
        history={(metrics?.history || []).map(h => ({ date: h.date, amount: h.amount }))}
        sourceCurrency={currency}
        footer={
          hasAnyRole([Role.CEO, Role.FinanceManager, Role.AdminDirector, Role.TechnicalDirector, Role.OperationalDirector]) ? (
            <Link href="/dashboard/ceo" className="inline-flex w-full items-center justify-between rounded-lg border border-gray-700 bg-gray-800/60 px-4 py-3 text-sm font-medium text-gray-200 transition-colors hover:border-brand-primary hover:text-brand-primary">
              Open executive breakdown <ArrowRight className="h-4 w-4" />
            </Link>
          ) : undefined
        }
      />
    </>
  );
};

export default DashboardHome;