import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Head from 'next/head';
import { useSecuredApi } from '../../components/hooks/useSecuredApi';
import PageContainer from '../../components/Layout/PageContainer';
import Card from '../../components/common/Card';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import { formatCurrency } from '../../lib/utils';
import { GetWbsBudgetsDto } from '../../../backend/src/wbs/dto/get-wbs-budgets.dto';
import { WbsBudgetStatus } from '@shared/types/wbs-budget-status.enum'; // Import directly from shared
import { WbsBudget } from '../../../shared/types/wbs';
import { DollarSign, Download, Printer, Search, RefreshCcw, Edit, Trash2 } from 'lucide-react';
import Select from '../../components/common/Select';
import { ProjectEntity } from '../../../backend/src/projects/project.entity';
import useToast from '../../store/toastStore';

const BudgetManagementPage: React.FC = () => {
  const api = useSecuredApi();
  const addToast = useToast(state => state.addToast);

  const [budgets, setBudgets] = useState<WbsBudget[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [projects, setProjects] = useState<ProjectEntity[]>([]);

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);
  const [wbsCodeFilter, setWbsCodeFilter] = useState('');
  const [descriptionFilter, setDescriptionFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<WbsBudgetStatus | ''>('');
  const [projectIdFilter, setProjectIdFilter] = useState('');

  useEffect(() => {
    const fetchProjectsForFilter = async () => {
      try {
        const response = await api.get<{ projects: ProjectEntity[] }>('/projects?limit=9999');
        setProjects(response.data.projects);
      } catch (e: any) {
        addToast("Failed to fetch projects for filter.", 'error');
      }
    };
    fetchProjectsForFilter();
  }, [api, addToast]);

  const fetchBudgets = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: GetWbsBudgetsDto = {
        page,
        limit,
        wbsCode: wbsCodeFilter || undefined,
        description: descriptionFilter || undefined,
        status: statusFilter || undefined,
        projectId: projectIdFilter || undefined,
      };
      const response = await api.get<{ budgets: WbsBudget[]; total: number }>('/wbs/budgets', { params });
      setBudgets(response.data.budgets);
      setTotal(response.data.total);
    } catch (e: any) {
      const errorMsg = `Failed to fetch budgets: ${e.response?.data?.message || e.message}`;
      setError(errorMsg);
      addToast(errorMsg, 'error');
    } finally {
      setLoading(false);
    }
  }, [api, page, limit, wbsCodeFilter, descriptionFilter, statusFilter, projectIdFilter, addToast]);

  useEffect(() => {
    fetchBudgets();
  }, [fetchBudgets]);

  const handleApplyFilters = () => {
    setPage(1);
    fetchBudgets();
  };

  const handleClearFilters = () => {
    setWbsCodeFilter('');
    setDescriptionFilter('');
    setStatusFilter('');
    setProjectIdFilter('');
    setPage(1);
  };

  const handleDownloadCsv = async () => {
    setIsDownloading(true);
    addToast('Preparing your CSV download...', 'info');
    try {
      const params: GetWbsBudgetsDto = {
        wbsCode: wbsCodeFilter || undefined,
        description: descriptionFilter || undefined,
        status: statusFilter || undefined,
        projectId: projectIdFilter || undefined,
      };
      const response = await api.get(`/wbs/budgets/export`, { params, responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `wbs_budgets_${new Date().toISOString()}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      addToast('CSV download started.', 'success');
    } catch (e: any) {
      addToast(`Failed to download CSV: ${e.response?.data?.message || e.message}`, 'error');
    } finally {
      setIsDownloading(false);
    }
  };

  const handlePrint = () => window.print();
  const handleActionClick = (action: 'Edit' | 'Delete') => addToast(`${action} function not yet implemented.`, 'info');

  if (loading && budgets.length === 0) {
    return (
      <PageContainer title="Budget Management" subtitle="Manage all WBS budget items across projects.">
        <div className="text-brand-primary text-lg text-center my-10">Loading WBS budgets...</div>
      </PageContainer>
    );
  }

  if (error && budgets.length === 0) {
    return (
      <PageContainer title="Budget Management" subtitle="Manage all WBS budget items across projects.">
        <div className="text-alert-critical text-lg text-center my-10">{error}</div>
      </PageContainer>
    );
  }

  return (
    <>
      <Head><title>Budget Management | SentinelFi</title></Head>
      <PageContainer
        title="Budget Management"
        subtitle="View, filter, and manage all WBS budget items."
        headerContent={<DollarSign className="w-8 h-8 text-brand-secondary" />}
      >
        <div className="space-y-6">
          <Card title="Filters & Actions" borderTopColor="primary" className="border border-gray-700">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
              <Input label="WBS Code" placeholder="e.g., 1.1.2" value={wbsCodeFilter} onChange={(e) => setWbsCodeFilter(e.target.value)} />
              <Input label="Description" placeholder="e.g., Software Development" value={descriptionFilter} onChange={(e) => setDescriptionFilter(e.target.value)} />
              <Select
                label="Status"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as WbsBudgetStatus | '')}
                options={[
                  { value: '', label: 'All Statuses' },
                  { value: WbsBudgetStatus.PENDING, label: 'Pending' },
                  { value: WbsBudgetStatus.APPROVED, label: 'Approved' },
                  { value: WbsBudgetStatus.REJECTED, label: 'Rejected' },
                ]}
              />
              <Select
                label="Project"
                value={projectIdFilter}
                onChange={(e) => setProjectIdFilter(e.target.value)}
                options={[ { value: '', label: 'All Projects' }, ...projects.map(p => ({ value: p.project_id, label: p.project_name })) ]}
              />
            </div>
            <div className="flex justify-between items-center">
              <div className="flex space-x-2">
                <Button onClick={fetchBudgets} variant="outline" isLoading={loading} icon={<RefreshCcw className="w-4 h-4" />}>Refresh</Button>
                <Button onClick={handlePrint} variant="outline" icon={<Printer className="w-4 h-4" />}>Print</Button>
                <Button onClick={handleDownloadCsv} variant="outline" isLoading={isDownloading} icon={<Download className="w-4 h-4" />}>Download CSV</Button>
              </div>
              <div className="flex justify-end space-x-2">
                <Button onClick={handleClearFilters} variant="secondary">Clear Filters</Button>
                <Button onClick={handleApplyFilters} variant="primary" icon={<Search className="w-4 h-4" />}>Apply Filters</Button>
              </div>
            </div>
          </Card>

          <Card title="All WBS Budgets" borderTopColor="secondary" className="border border-gray-700">
            <div className="overflow-x-auto rounded-lg border border-gray-700">
              <table className="min-w-full divide-y divide-gray-700">
                <thead className="bg-brand-dark/50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Project Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">WBS Code</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Description</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase">Budgeted Amount</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Created By</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Created At</th>
                    <th className="px-6 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {loading && budgets.length === 0 ? (
                    <tr><td colSpan={8} className="text-center py-10">Loading...</td></tr>
                  ) : budgets.map(budget => (
                    <tr key={budget.wbs_id} className="hover:bg-gray-800/50 transition">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-brand-primary">{budget.project?.project_name || 'N/A'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-brand-primary">{budget.wbs_code}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{budget.description}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-white">{formatCurrency(budget.total_cost_budgeted)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{budget.status}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{budget.user?.email || 'N/A'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{new Date(budget.created_at).toLocaleDateString()}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <Button variant="ghost" size="sm" onClick={() => handleActionClick('Edit')} icon={<Edit className="w-4 h-4" />} />
                        <Button variant="ghost" size="sm" onClick={() => handleActionClick('Delete')} icon={<Trash2 className="w-4 h-4" />} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {total > 0 && (
              <div className="flex justify-between items-center mt-4 text-gray-400">
                <span>Showing {(page - 1) * limit + 1} - {Math.min(page * limit, total)} of {total} budgets</span>
                <div className="flex space-x-2">
                  <Button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1 || loading}>Previous</Button>
                  <Button onClick={() => setPage(p => (p * limit < total ? p + 1 : p))} disabled={page * limit >= total || loading}>Next</Button>
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
