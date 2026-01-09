import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useSecuredApi } from '../../components/hooks/useSecuredApi';
import PageContainer from '../../components/Layout/PageContainer';
import Card from '../../components/common/Card';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import { formatCurrency } from '../../lib/utils';
import { OperationalBudgetEntity } from '../../../backend/src/operational-budgets/operational-budget.entity'; // Import OperationalBudgetEntity
import { GetOperationalBudgetsDto } from '../../../backend/src/operational-budgets/dto/get-operational-budgets.dto'; // Import DTO
import { DollarSign, Download, Printer, Search, RefreshCcw, Edit, Trash2 } from 'lucide-react';
import Select from '../../components/common/Select'; // Assuming a Select component exists

const OperationalBudgetManagementPage: React.FC = () => {
  const api = useSecuredApi();
  const router = useRouter();

  const [operationalBudgets, setOperationalBudgets] = useState<OperationalBudgetEntity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters and Pagination State
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);
  const [nameFilter, setNameFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState<OperationalBudgetEntity['type'] | ''>('');
  const [statusFilter, setStatusFilter] = useState<OperationalBudgetEntity['status'] | ''>('');
  const [startDateFilter, setStartDateFilter] = useState('');
  const [endDateFilter, setEndDateFilter] = useState('');

  const fetchOperationalBudgets = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: GetOperationalBudgetsDto = {
        page,
        limit,
        name: nameFilter || undefined,
        type: typeFilter || undefined,
        status: statusFilter || undefined,
        startDate: startDateFilter || undefined,
        endDate: endDateFilter || undefined,
      };
      const response = await api.get<{ operationalBudgets: OperationalBudgetEntity[]; total: number }>('/operational-budgets', { params });
      setOperationalBudgets(response.data.operationalBudgets);
      setTotal(response.data.total);
    } catch (e: any) {
      setError(`Failed to fetch operational budgets: ${e.response?.data?.message || e.message}`);
    } finally {
      setLoading(false);
    }
  }, [api, page, limit, nameFilter, typeFilter, statusFilter, startDateFilter, endDateFilter]);

  useEffect(() => {
    fetchOperationalBudgets();
  }, [fetchOperationalBudgets]);

  const handleApplyFilters = () => {
    setPage(1); // Reset to first page on new filter
    fetchOperationalBudgets();
  };

  const handleClearFilters = () => {
    setNameFilter('');
    setTypeFilter('');
    setStatusFilter('');
    setStartDateFilter('');
    setEndDateFilter('');
    setPage(1);
    // fetchOperationalBudgets will be called by useEffect due to state changes
  };

  const handleDownloadCsv = async () => {
    try {
      const params: GetOperationalBudgetsDto = {
        name: nameFilter || undefined,
        type: typeFilter || undefined,
        status: statusFilter || undefined,
        startDate: startDateFilter || undefined,
        endDate: endDateFilter || undefined,
        // No pagination for export
      };
      const response = await api.get(`/operational-budgets/export`, { params, responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `operational_budgets_${new Date().toISOString()}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (e: any) {
      alert(`Failed to download CSV: ${e.response?.data?.message || e.message}`);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading && operationalBudgets.length === 0) { // Only show full loading screen if no data is present yet
    return (
      <PageContainer title="Operational Budget Management" subtitle="Manage all company-wide and departmental budgets.">
        <div className="text-brand-primary text-lg text-center my-10">Loading operational budgets...</div>
      </PageContainer>
    );
  }

  if (error) {
    return (
      <PageContainer title="Operational Budget Management" subtitle="Manage all company-wide and departmental budgets.">
        <div className="text-alert-critical text-lg text-center my-10">{error}</div>
      </PageContainer>
    );
  }

  return (
    <>
      <Head><title>Operational Budget Management | SentinelFi</title></Head>
      <PageContainer
        title="Operational Budget Management"
        subtitle="View, filter, and manage all company-wide and departmental budgets."
        headerContent={<DollarSign className="w-8 h-8 text-brand-secondary" />}
      >
        <div className="space-y-6">
          {/* Filter and Actions Section */}
          <Card title="Filters & Actions" borderTopColor="primary" className="border border-gray-700">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4">
              <Input
                label="Budget Name"
                placeholder="e.g., Q1 Marketing"
                value={nameFilter}
                onChange={(e) => setNameFilter(e.target.value)}
              />
              <Select
                label="Type"
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as OperationalBudgetEntity['type'] | '')}
                options={[
                  { value: '', label: 'All Types' },
                  { value: 'departmental', label: 'Departmental' },
                  { value: 'company-wide', label: 'Company-Wide' },
                  { value: 'recurring', label: 'Recurring' },
                ]}
              />
              <Select
                label="Status"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as OperationalBudgetEntity['status'] | '')}
                options={[
                  { value: '', label: 'All Statuses' },
                  { value: 'active', label: 'Active' },
                  { value: 'closed', label: 'Closed' },
                  { value: 'archived', label: 'Archived' },
                ]}
              />
              <Input
                type="date"
                label="Start Date"
                value={startDateFilter}
                onChange={(e) => setStartDateFilter(e.target.value)}
              />
              <Input
                type="date"
                label="End Date"
                value={endDateFilter}
                onChange={(e) => setEndDateFilter(e.target.value)}
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button onClick={handleClearFilters} variant="secondary">Clear Filters</Button>
              <Button onClick={handleApplyFilters} variant="primary"><Search className="w-4 h-4 mr-2" />Apply Filters</Button>
            </div>
            <div className="flex justify-start space-x-2 mt-4">
              <Button onClick={fetchOperationalBudgets} variant="outline" disabled={loading}><RefreshCcw className="w-4 h-4 mr-2" />{loading ? 'Refreshing...' : 'Refresh Data'}</Button>
              <Button onClick={handlePrint} variant="outline"><Printer className="w-4 h-4 mr-2" />Print</Button>
              <Button onClick={handleDownloadCsv} variant="outline"><Download className="w-4 h-4 mr-2" />Download CSV</Button>
            </div>
          </Card>

          {/* Operational Budgets Table */}
          <Card title="All Operational Budgets" borderTopColor="primary" className="border border-gray-700">
            {operationalBudgets.length === 0 && !loading ? (
              <p className="text-gray-500">No operational budgets found.</p>
            ) : (
              <>
                <div className="overflow-x-auto rounded-lg border border-gray-700">
                  <table className="min-w-full divide-y divide-gray-700">
                    <thead className="bg-brand-dark/50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Budget Name</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Type</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase">Budgeted Amount</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase">Actual Spent</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Start Date</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">End Date</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Status</th>
                        <th className="px-6 py-3">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                      {operationalBudgets.map(budget => (
                        <tr key={budget.operational_budget_id} className="hover:bg-gray-700/50 transition">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-brand-primary">{budget.name}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{budget.type}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-white">{formatCurrency(budget.budgeted_amount)}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-white">{formatCurrency(budget.actual_spent)}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{new Date(budget.start_date).toLocaleDateString()}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{new Date(budget.end_date).toLocaleDateString()}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{budget.status}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <Button variant="ghost" size="sm" className="mr-2"><Edit className="w-4 h-4" /></Button>
                            <Button variant="ghost" size="sm"><Trash2 className="w-4 h-4" /></Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {/* Pagination */}
                <div className="flex justify-between items-center mt-4 text-gray-400">
                  <span>Showing {(page - 1) * limit + 1} - {Math.min(page * limit, total)} of {total} budgets</span>
                  <div className="flex space-x-2">
                    <Button onClick={() => setPage(prev => Math.max(1, prev - 1))} disabled={page === 1}>Previous</Button>
                    <Button onClick={() => setPage(prev => (prev * limit < total ? prev + 1 : prev))} disabled={page * limit >= total}>Next</Button>
                  </div>
                </div>
              </>
            )}
          </Card>
        </div>
      </PageContainer>
    </>
  );
};

export default OperationalBudgetManagementPage;
