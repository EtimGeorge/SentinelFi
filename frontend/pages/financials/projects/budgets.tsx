import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import PageContainer from '../../../components/Layout/PageContainer';
import Card from '../../../components/common/Card';
import Input from '../../../components/common/Input';
import Button from '../../../components/common/Button';
import Select from '../../../components/common/Select';
import api from '../../../lib/api'; // Direct import to avoid AbortController issues
import { useAuth, Role } from '../../../components/context/AuthContext';
import { useCurrency } from '../../../components/context/CurrencyContext';
import { WbsBudgetStatus } from '@shared/types/wbs-budget-status.enum';
import { WbsBudget } from '@shared/types/wbs';
import { Project } from '@shared/types/project';
import toast from 'react-hot-toast';
import {
  DollarSign, Download, Printer, Search, RefreshCcw, Edit3, Trash2,
  Activity, CheckCircle, Clock, XCircle, Send, CheckSquare, Wallet, PieChart
} from 'lucide-react';
import EmptyState from '../../../components/common/EmptyState';
import DataTable from '../../../components/common/DataTable';
import { useRouter } from 'next/router';
import { TableSkeleton } from '../../../components/common/LoadingSkeleton';

const STATUS_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string; bg: string }> = {
  draft: { label: 'Draft', icon: Edit3, color: 'text-gray-400', bg: 'bg-gray-700/50' },
  pending: { label: 'Pending', icon: Clock, color: 'text-yellow-400', bg: 'bg-yellow-900/30' },
  approved: { label: 'Approved', icon: CheckCircle, color: 'text-green-400', bg: 'bg-green-900/30' },
  rejected: { label: 'Rejected', icon: XCircle, color: 'text-red-400', bg: 'bg-red-900/30' },
};

const BudgetManagementPage: React.FC = () => {
  const router = useRouter();
  const { hasAnyRole, isAuthenticated } = useAuth();
  const { userCurrency, convertToDisplay, convertAmount } = useCurrency();

  const [budgets, setBudgets] = useState<WbsBudget[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);

  // Filters
  const [wbsCodeFilter, setWbsCodeFilter] = useState('');
  const [descriptionFilter, setDescriptionFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<WbsBudgetStatus | ''>('');
  const [projectIdFilter, setProjectIdFilter] = useState('');

  const canManage = hasAnyRole([Role.AdminDirector, Role.FinanceManager]);
  const canApprove = hasAnyRole([Role.AdminDirector, Role.FinanceManager, Role.OperationalDirector]);

  // KPIs
  const kpis = useMemo(() => {
    let totalBudgeted = 0;
    let approved = 0;
    let pending = 0;
    let rejected = 0;

    budgets.forEach(b => {
      // Convert to user currency before summing for accurate global KPIs
      const amountInUserCurrency = convertAmount(
        Number(b.total_cost_budgeted || 0),
        b.project?.currency || 'NGN',
        userCurrency.code
      );
      totalBudgeted += amountInUserCurrency;
      if (b.status === WbsBudgetStatus.APPROVED) approved++;
      if (b.status === WbsBudgetStatus.PENDING) pending++;
      if (b.status === WbsBudgetStatus.REJECTED) rejected++;
    });

    return { totalBudgeted, approved, pending, rejected };
  }, [budgets]);

  useEffect(() => {
    if (!isAuthenticated) return;
    api.get<{ projects: Project[] }>('/projects?limit=100')
      .then(res => setProjects(res.data.projects))
      .catch(() => toast.error("Failed to load projects filter"));
  }, [isAuthenticated]);

  const fetchBudgets = useCallback(async () => {
    if (!isAuthenticated) return;
    setLoading(true);
    try {
      const params = {
        page, limit,
        wbsCode: wbsCodeFilter || undefined,
        description: descriptionFilter || undefined,
        status: statusFilter || undefined,
        projectId: projectIdFilter || undefined,
      };
      // Important constraint limit=100 for backend validation rules
      const response = await api.get<{ data: WbsBudget[]; total: number }>('/wbs/budgets', { params });
      setBudgets(response.data.data);
      setTotal(response.data.total);
    } catch (e: any) {
      if (e.name !== 'CanceledError') {
        toast.error(`Fetch failed: ${e.response?.data?.message || e.message}`);
      }
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, page, limit, wbsCodeFilter, descriptionFilter, statusFilter, projectIdFilter]);

  useEffect(() => {
    fetchBudgets();
  }, [fetchBudgets]);

  const handleStatusChange = async (id: string, newStatus: string) => {
    if (!canApprove) {
      toast.error('You do not have permission to change status.');
      return;
    }
    setActionLoading(id);
    try {
      await api.patch(`/wbs/budget-draft/${id}/status`, { status: newStatus });
      toast.success(`Budget marked as ${newStatus}`);
      fetchBudgets(); // Refresh row
    } catch (e: any) {
      toast.error(`Status update failed: ${e.response?.data?.message || e.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDownloadCsv = async () => {
    setIsDownloading(true);
    toast('Preparing CSV...', { icon: 'â³' });
    try {
      const params = {
        wbsCode: wbsCodeFilter || undefined,
        description: descriptionFilter || undefined,
        status: statusFilter || undefined,
        projectId: projectIdFilter || undefined,
      };
      const response = await api.get(`/wbs/budgets/export`, { params, responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `budgets_${new Date().toISOString()}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Download complete');
    } catch (e: any) {
      toast.error('Failed to download CSV');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <>
      <Head><title>Budget Management | SentinelFi</title></Head>
      <PageContainer
        title="Budget Management"
        subtitle="Review, filter, and approve WBS budget items across all projects."
        headerContent={<Wallet className="w-8 h-8 text-brand-secondary" />}
      >
        {/* KPI Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-5 elev-sm">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-brand-primary/10 rounded-lg"><PieChart className="w-5 h-5 text-brand-primary" /></div>
              <p className="text-xs font-black text-gray-500 ">Total Filtered Budget</p>
            </div>
            <p className="text-2xl font-black text-white">{convertToDisplay(kpis.totalBudgeted, userCurrency.code)}</p>
          </div>
          <div className="bg-gray-800 border border-gray-700 border-b-4 border-b-green-500 rounded-xl p-5 elev-sm">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-green-500/10 rounded-lg"><CheckCircle className="w-5 h-5 text-green-400" /></div>
              <p className="text-xs font-black text-gray-500 ">Approved</p>
            </div>
            <p className="text-2xl font-black text-white">{kpis.approved} <span className="text-sm font-normal text-gray-400">items</span></p>
          </div>
          <div className="bg-gray-800 border border-gray-700 border-b-4 border-b-yellow-500 rounded-xl p-5 elev-sm">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-yellow-500/10 rounded-lg"><Clock className="w-5 h-5 text-yellow-500" /></div>
              <p className="text-xs font-black text-gray-500 ">Pending Review</p>
            </div>
            <p className="text-2xl font-black text-white">{kpis.pending} <span className="text-sm font-normal text-gray-400">items</span></p>
          </div>
          <div className="bg-gray-800 border border-gray-700 border-b-4 border-b-red-500 rounded-xl p-5 elev-sm">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-red-500/10 rounded-lg"><XCircle className="w-5 h-5 text-red-500" /></div>
              <p className="text-xs font-black text-gray-500 ">Rejected</p>
            </div>
            <p className="text-2xl font-black text-white">{kpis.rejected} <span className="text-sm font-normal text-gray-400">items</span></p>
          </div>
        </div>

        <div className="space-y-6">
          <Card title="Filters & Actions" accent="primary" className="border border-gray-700">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
              <Input label="WBS Code" placeholder="e.g., 1.1.2" value={wbsCodeFilter} onChange={(e) => setWbsCodeFilter(e.target.value)} />
              <Input label="Description" placeholder="Search description..." value={descriptionFilter} onChange={(e) => setDescriptionFilter(e.target.value)} />
              <Select
                label="Status"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as WbsBudgetStatus | '')}
                options={[
                  { value: '', label: 'All Statuses' },
                  { value: WbsBudgetStatus.PENDING, label: 'Pending' },
                  { value: WbsBudgetStatus.APPROVED, label: 'Approved' },
                  { value: WbsBudgetStatus.REJECTED, label: 'Rejected' },
                  { value: 'draft', label: 'Draft' },
                ]}
              />
              <Select
                label="Project"
                value={projectIdFilter}
                onChange={(e) => setProjectIdFilter(e.target.value)}
                options={[{ value: '', label: 'All Projects' }, ...projects.map(p => ({ value: p.project_id, label: p.project_name }))]}
              />
            </div>
            <div className="flex justify-between items-center">
              <div className="flex space-x-2">
                <Button onClick={fetchBudgets} variant="outline" isLoading={loading} icon={<RefreshCcw className="w-4 h-4" />}>Refresh</Button>
                <Button onClick={() => window.print()} variant="outline" icon={<Printer className="w-4 h-4" />}>Print</Button>
                <Button onClick={handleDownloadCsv} variant="outline" isLoading={isDownloading} icon={<Download className="w-4 h-4" />}>Export CSV</Button>
              </div>
              <div className="flex justify-end space-x-2">
                <Button onClick={() => { setWbsCodeFilter(''); setDescriptionFilter(''); setStatusFilter(''); setProjectIdFilter(''); setPage(1); }} variant="secondary">Clear Filters</Button>
                <Button onClick={() => { setPage(1); fetchBudgets(); }} variant="primary" icon={<Search className="w-4 h-4" />}>Apply Filters</Button>
              </div>
            </div>
          </Card>

          <Card title="Budget Elements" accent="secondary" className="border border-gray-700">
            {loading ? (
              <TableSkeleton columns={6} rows={5} />
            ) : budgets.length === 0 ? (
              <EmptyState pathname="/financials/projects/budgets" />
            ) : (
              <>
                <DataTable
                  columns={[
                    {
                      key: 'project',
                      label: 'Project',
                      tier: 'P0',
                      get: (b: WbsBudget) => (
                        <>
                          <Link href={`/projects/${b.project?.project_id}/overview`} className="text-sm font-bold text-gray-300 hover:text-brand-primary block truncate">
                            {b.project?.project_name || 'N/A'}
                          </Link>
                          <span className="font-mono text-xs font-black text-brand-primary bg-brand-primary/10 px-1.5 py-0.5 rounded mt-1 inline-block">
                            {b.wbs_code}
                          </span>
                        </>
                      ),
                      title: (b: WbsBudget) => b.project?.project_name || 'N/A',
                    },
                    {
                      key: 'amount',
                      label: 'Budgeted Amount',
                      tier: 'P0',
                      cellClassName: 'text-right',
                      get: (b: WbsBudget) => <span className="text-sm font-black text-white">{convertToDisplay(b.total_cost_budgeted, b.project?.currency || 'NGN')}</span>,
                      title: (b: WbsBudget) => convertToDisplay(b.total_cost_budgeted, b.project?.currency || 'NGN'),
                    },
                    {
                      key: 'description',
                      label: 'Description',
                      tier: 'P1',
                      get: (b: WbsBudget) => <span className="text-sm text-gray-300">{b.description}</span>,
                      title: (b: WbsBudget) => b.description,
                    },
                    {
                      key: 'status',
                      label: 'Status',
                      tier: 'P2',
                      get: (b: WbsBudget) => {
                        const st = STATUS_CONFIG[b.status?.toLowerCase() || 'draft'] || STATUS_CONFIG.draft;
                        const StatusIcon = st.icon;
                        return (
                          <span className={`flex w-fit items-center gap-1 text-xs font-bold uppercase px-2 py-1 rounded ${st.bg} ${st.color}`}>
                            <StatusIcon className="w-3 h-3" /> {st.label}
                          </span>
                        );
                      },
                    },
                  ]}
                  rows={budgets}
                  rowKey={(b) => b.wbs_id}
                  actions={[
                    {
                      key: 'view',
                      label: 'View Details',
                      primary: true,
                      icon: <Activity className="w-4 h-4" />,
                      onClick: (b) => router.push(`/financials/projects/budgets?id=${b.wbs_id}`),
                    },
                    {
                      key: 'submit',
                      label: 'Submit',
                      icon: <Send className="w-4 h-4" />,
                      visible: (b: WbsBudget) => b.status === 'draft' && canManage,
                      onClick: (b) => handleStatusChange(b.wbs_id, 'pending'),
                    },
                    {
                      key: 'approve',
                      label: 'Approve',
                      icon: <CheckSquare className="w-4 h-4" />,
                      visible: (b: WbsBudget) => b.status === 'pending' && canApprove,
                      onClick: (b) => handleStatusChange(b.wbs_id, 'approved'),
                    },
                    {
                      key: 'reject',
                      label: 'Reject',
                      danger: true,
                      icon: <XCircle className="w-4 h-4" />,
                      visible: (b: WbsBudget) => b.status === 'pending' && canApprove,
                      onClick: (b) => handleStatusChange(b.wbs_id, 'rejected'),
                    },
                  ]}
                />

                {total > 0 && (
                  <div className="flex justify-between items-center mt-4 border-t border-gray-700/50 pt-4">
                    <span className="text-xs text-gray-500 font-bold r">
                      Showing {(page - 1) * limit + 1} - {Math.min(page * limit, total)} of {total} records
                    </span>
                    <div className="flex space-x-2">
                      <Button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} size="sm" variant="secondary">Prev</Button>
                      <Button onClick={() => setPage(p => (p * limit < total ? p + 1 : p))} disabled={page * limit >= total} size="sm" variant="secondary">Next</Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </Card>
        </div>
      </PageContainer>
    </>
  );
};

export default BudgetManagementPage;
