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
import { ProjectEntity } from '../../../../backend/src/projects/project.entity';
import toast from 'react-hot-toast';
import {
  DollarSign, Download, Printer, Search, RefreshCcw, Edit3, Trash2,
  Activity, CheckCircle, Clock, XCircle, Send, CheckSquare, Wallet, PieChart
} from 'lucide-react';

const STATUS_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string; bg: string }> = {
  draft: { label: 'Draft', icon: Edit3, color: 'text-gray-400', bg: 'bg-gray-700/50' },
  pending: { label: 'Pending', icon: Clock, color: 'text-yellow-400', bg: 'bg-yellow-900/30' },
  approved: { label: 'Approved', icon: CheckCircle, color: 'text-green-400', bg: 'bg-green-900/30' },
  rejected: { label: 'Rejected', icon: XCircle, color: 'text-red-400', bg: 'bg-red-900/30' },
};

const BudgetManagementPage: React.FC = () => {
  const { hasAnyRole, isAuthenticated } = useAuth();
  const { userCurrency, convertToDisplay, convertAmount } = useCurrency();

  const [budgets, setBudgets] = useState<WbsBudget[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [projects, setProjects] = useState<ProjectEntity[]>([]);

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
    api.get<{ projects: ProjectEntity[] }>('/projects?limit=100')
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
    toast('Preparing CSV...', { icon: '⏳' });
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
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-5 shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-brand-primary/10 rounded-lg"><PieChart className="w-5 h-5 text-brand-primary" /></div>
              <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Total Filtered Budget</p>
            </div>
            <p className="text-2xl font-black text-white">{convertToDisplay(kpis.totalBudgeted, userCurrency.code)}</p>
          </div>
          <div className="bg-gray-800 border border-gray-700 border-b-4 border-b-green-500 rounded-xl p-5 shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-green-500/10 rounded-lg"><CheckCircle className="w-5 h-5 text-green-400" /></div>
              <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Approved</p>
            </div>
            <p className="text-2xl font-black text-white">{kpis.approved} <span className="text-sm font-normal text-gray-400">items</span></p>
          </div>
          <div className="bg-gray-800 border border-gray-700 border-b-4 border-b-yellow-500 rounded-xl p-5 shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-yellow-500/10 rounded-lg"><Clock className="w-5 h-5 text-yellow-500" /></div>
              <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Pending Review</p>
            </div>
            <p className="text-2xl font-black text-white">{kpis.pending} <span className="text-sm font-normal text-gray-400">items</span></p>
          </div>
          <div className="bg-gray-800 border border-gray-700 border-b-4 border-b-red-500 rounded-xl p-5 shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-red-500/10 rounded-lg"><XCircle className="w-5 h-5 text-red-500" /></div>
              <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Rejected</p>
            </div>
            <p className="text-2xl font-black text-white">{kpis.rejected} <span className="text-sm font-normal text-gray-400">items</span></p>
          </div>
        </div>

        <div className="space-y-6">
          <Card title="Filters & Actions" borderTopColor="primary" className="border border-gray-700">
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

          <Card title="Budget Elements" borderTopColor="secondary" className="border border-gray-700">
            {budgets.length === 0 && !loading ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Wallet className="w-16 h-16 text-gray-700 mb-4" />
                <h3 className="text-lg font-bold text-gray-400 mb-2">No Budget Items Found</h3>
                <p className="text-sm text-gray-500 max-w-sm">Adjust your filters or use the WBS Manager to create new budget elements.</p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-gray-700">
                <table className="min-w-full divide-y divide-gray-700">
                  <thead className="bg-brand-dark/50">
                    <tr>
                      <th className="px-4 py-3 text-left text-[10px] font-black text-gray-500 uppercase tracking-widest">Project</th>
                      <th className="px-4 py-3 text-left text-[10px] font-black text-gray-500 uppercase tracking-widest">WBS Code</th>
                      <th className="px-4 py-3 text-left text-[10px] font-black text-gray-500 uppercase tracking-widest">Description</th>
                      <th className="px-4 py-3 text-right text-[10px] font-black text-gray-500 uppercase tracking-widest">Budgeted Amount</th>
                      <th className="px-4 py-3 text-left text-[10px] font-black text-gray-500 uppercase tracking-widest">Status</th>
                      <th className="px-4 py-3 text-right text-[10px] font-black text-gray-500 uppercase tracking-widest">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {loading ? (
                      [...Array(5)].map((_, i) => (
                        <tr key={i}><td colSpan={6} className="px-4 py-3"><div className="h-8 bg-gray-800 animate-pulse rounded"></div></td></tr>
                      ))
                    ) : budgets.map(budget => {
                      const st = STATUS_CONFIG[budget.status?.toLowerCase() || 'draft'] || STATUS_CONFIG.draft;
                      const StatusIcon = st.icon;
                      const isActing = actionLoading === budget.wbs_id;

                      return (
                        <tr key={budget.wbs_id} className="hover:bg-white/5 transition group">
                          <td className="px-4 py-3 whitespace-nowrap text-sm font-bold text-gray-300">
                            <Link href={`/projects/${budget.project?.project_id}/overview`} className="hover:text-brand-primary">
                              {budget.project?.project_name || 'N/A'}
                            </Link>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <Link href={`/financials/projects/wbs`} className="font-mono text-xs font-black text-brand-primary bg-brand-primary/10 px-2 py-0.5 rounded hover:bg-brand-primary/20 transition">
                              {budget.wbs_code}
                            </Link>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-300 truncate max-w-[250px]" title={budget.description}>
                            {budget.description}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-black text-white">
                            {convertToDisplay(budget.total_cost_budgeted, budget.project?.currency || 'NGN')}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className={`flex w-fit items-center gap-1 text-[10px] font-bold uppercase px-2 py-1 rounded ${st.bg} ${st.color}`}>
                              <StatusIcon className="w-3 h-3" /> {st.label}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-right">
                            <div className="flex justify-end items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              {budget.status === 'draft' && canManage && (
                                <button onClick={() => handleStatusChange(budget.wbs_id, 'pending')} disabled={isActing} className="p-1.5 text-yellow-400 hover:bg-yellow-900/30 rounded-lg transition" title="Submit">
                                  {isActing ? <RefreshCcw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                </button>
                              )}
                              {budget.status === 'pending' && canApprove && (
                                <>
                                  <button onClick={() => handleStatusChange(budget.wbs_id, 'approved')} disabled={isActing} className="p-1.5 text-green-400 hover:bg-green-900/30 rounded-lg transition" title="Approve">
                                    {isActing ? <RefreshCcw className="w-4 h-4 animate-spin" /> : <CheckSquare className="w-4 h-4" />}
                                  </button>
                                  <button onClick={() => handleStatusChange(budget.wbs_id, 'rejected')} disabled={isActing} className="p-1.5 text-red-400 hover:bg-red-900/30 rounded-lg transition" title="Reject">
                                    {isActing ? <RefreshCcw className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                                  </button>
                                </>
                              )}
                              <Link href={`/financials/projects/budgets?id=${budget.wbs_id}`} className="p-1.5 text-gray-400 hover:text-brand-secondary transition" title="View Details">
                                <Activity className="w-4 h-4" />
                              </Link>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {!loading && total > 0 && (
              <div className="flex justify-between items-center mt-4 border-t border-gray-700/50 pt-4">
                <span className="text-xs text-gray-500 font-bold uppercase tracking-wider">
                  Showing {(page - 1) * limit + 1} - {Math.min(page * limit, total)} of {total} records
                </span>
                <div className="flex space-x-2">
                  <Button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} size="sm" variant="secondary">Prev</Button>
                  <Button onClick={() => setPage(p => (p * limit < total ? p + 1 : p))} disabled={page * limit >= total} size="sm" variant="secondary">Next</Button>
                </div>
              </div>
            )}
          </Card>
        </div>
      </PageContainer>
    </>
  );
};

export default BudgetManagementPage;
