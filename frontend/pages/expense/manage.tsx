import React, { useState, useEffect, useMemo, useCallback } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import { useSecuredApi } from "../../components/hooks/useSecuredApi";
import PageContainer from "../../components/Layout/PageContainer";
import Card from "../../components/common/Card";
import Input from "../../components/common/Input";
import Button from "../../components/common/Button";
import { formatCurrency } from "../../lib/utils";
import { GetLiveExpensesDto, VarianceFlag } from "@shared/types/get-live-expenses.dto"; // Corrected alias and shared interface
import { LiveExpense } from "../../../shared/types/expense"; // Shared Live Expense Entity
import { DollarSign, Download, Printer, Search, RefreshCcw, Edit, Trash2 } from "lucide-react";
import Select from "../../components/common/Select"; // Assuming a Select component exists
import { ProjectEntity } from "../../../backend/src/projects/project.entity"; // Import ProjectEntity

const ExpenseManagementPage: React.FC = () => {
  const api = useSecuredApi();
  const router = useRouter();

  const [expenses, setExpenses] = useState<LiveExpense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [projects, setProjects] = useState<ProjectEntity[]>([]); // For project filter dropdown

  // Filters and Pagination State
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);
  const [wbsIdFilter, setWbsIdFilter] = useState(""); // Not directly used in GetLiveExpensesDto, but if we want to filter specific WBS items
  const [descriptionFilter, setDescriptionFilter] = useState("");
  const [varianceFlagFilter, setVarianceFlagFilter] = useState<VarianceFlag | "">("");
  const [startDateFilter, setStartDateFilter] = useState("");
  const [endDateFilter, setEndDateFilter] = useState("");
  const [projectIdFilter, setProjectIdFilter] = useState(""); // New project filter

  // Fetch projects for dropdown
  useEffect(() => {
    const fetchProjectsForFilter = async () => {
      try {
        const response = await api.get<{ projects: ProjectEntity[]; total: number }>("/projects?limit=9999"); // Fetch all projects for filter
        setProjects(response.data.projects);
      } catch (e: any) {
        console.error("Failed to fetch projects for filter:", e);
        // Optionally set an error state here
      }
    };
    fetchProjectsForFilter();
  }, [api]);

  const fetchExpenses = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: GetLiveExpensesDto = {
        page,
        limit,
        wbsId: wbsIdFilter || undefined,
        description: descriptionFilter || undefined, // Fixed
        varianceFlag: varianceFlagFilter || undefined,
        startDate: startDateFilter || undefined,
        endDate: endDateFilter || undefined,
        projectId: projectIdFilter || undefined, // Use new project filter
      };
      const response = await api.get<{ expenses: LiveExpense[]; total: number }>("/wbs/expenses", { params });
      setExpenses(response.data.expenses);
      setTotal(response.data.total);
    } catch (e: any) {
      setError(`Failed to fetch expenses: ${e.response?.data?.message || e.message}`);
    } finally {
      setLoading(false);
    }
  }, [api, page, limit, wbsIdFilter, descriptionFilter, varianceFlagFilter, startDateFilter, endDateFilter, projectIdFilter]);

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  const handleApplyFilters = () => {
    setPage(1); // Reset to first page on new filter
    fetchExpenses();
  };

  const handleClearFilters = () => {
    setWbsIdFilter("");
    setDescriptionFilter("");
    setVarianceFlagFilter("");
    setStartDateFilter("");
    setEndDateFilter("");
    setProjectIdFilter(""); // Clear project filter
    setPage(1);
    // fetchExpenses will be called by useEffect due to state changes
  };

  const handleDownloadCsv = async () => {
    try {
      const params: GetLiveExpensesDto = {
        wbsId: wbsIdFilter || undefined,
        description: descriptionFilter || undefined, // Fixed
        varianceFlag: varianceFlagFilter || undefined,
        startDate: startDateFilter || undefined,
        endDate: endDateFilter || undefined,
        projectId: projectIdFilter || undefined, // Use new project filter
        // No pagination for export
      };
      const response = await api.get(`/wbs/expenses/export`, { params, responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `live_expenses_${new Date().toISOString()}.csv`);
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

  if (loading && expenses.length === 0) { // Only show full loading screen if no data is present yet
    return (
      <PageContainer title="Expense Management" subtitle="Manage all live expense entries across projects.">
        <div className="text-brand-primary text-lg text-center my-10">Loading live expenses...</div>
      </PageContainer>
    );
  }

  if (error) {
    return (
      <PageContainer title="Expense Management" subtitle="Manage all live expense entries across projects.">
        <div className="text-alert-critical text-lg text-center my-10">{error}</div>
      </PageContainer>
    );
  }

  return (
    <>
      <Head><title>Expense Management | SentinelFi</title></Head>
      <PageContainer
        title="Expense Management"
        subtitle="View, filter, and manage all live expense entries."
        headerContent={<DollarSign className="w-8 h-8 text-brand-secondary" />}
      >
        <div className="space-y-6">
          {/* Filter and Actions Section */}
          <Card title="Filters & Actions" borderTopColor="primary" className="border border-gray-700">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4">
              <Input
                label="Item Description"
                placeholder="e.g., Software License"
                value={descriptionFilter}
                onChange={(e) => setDescriptionFilter(e.target.value)}
              />
              <Select
                label="Variance Flag"
                value={varianceFlagFilter}
                onChange={(e) => setVarianceFlagFilter(e.target.value as VarianceFlag | "")}
                options={[
                  { value: "", label: "All Flags" },
                  { value: VarianceFlag.NO_VARIANCE, label: "No Variance" },
                  { value: VarianceFlag.NEGATIVE_VARIANCE, label: "Negative Variance" },
                  { value: VarianceFlag.POSITIVE_VARIANCE, label: "Positive Variance" },
                  { value: VarianceFlag.MAJOR_VARIANCE_OVERRUN, label: "Major Overrun" },
                  { value: VarianceFlag.MAJOR_VARIANCE_UNBUDGETED, label: "Major Unbudgeted" },
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
              <Select
                label="Project"
                value={projectIdFilter}
                onChange={(e) => setProjectIdFilter(e.target.value)}
                options={[
                  { value: "", label: "All Projects" },
                  ...projects.map(p => ({ value: p.project_id, label: p.project_name }))
                ]}
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button onClick={handleClearFilters} variant="secondary">Clear Filters</Button>
              <Button onClick={handleApplyFilters} variant="primary"><Search className="w-4 h-4 mr-2" />Apply Filters</Button>
            </div>
            <div className="flex justify-start space-x-2 mt-4">
              <Button onClick={fetchExpenses} variant="outline" disabled={loading}><RefreshCcw className="w-4 h-4 mr-2" />{loading ? "Refreshing..." : "Refresh Data"}</Button>
              <Button onClick={handlePrint} variant="outline"><Printer className="w-4 h-4 mr-2" />Print</Button>
              <Button onClick={handleDownloadCsv} variant="outline"><Download className="w-4 h-4 mr-2" />Download CSV</Button>
            </div>
          </Card>

          {/* Live Expenses Table */}
          <Card title="All Live Expenses" borderTopColor="alert" className="border border-gray-700">
            {expenses.length === 0 && !loading ? (
              <p className="text-gray-500">No live expense entries found.</p>
            ) : (
              <>
                <div className="overflow-x-auto rounded-lg border border-gray-700">
                  <table className="min-w-full divide-y divide-gray-700">
                    <thead className="bg-brand-dark/50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Project Name</th> {/* NEW */}
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">WBS Code</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Description</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Expense Date</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase">Amount Paid</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Variance Flag</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">User</th>
                        <th className="px-6 py-3">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                      {expenses.map(expense => (
                        <tr key={expense.expense_id} className="hover:bg-gray-700/50 transition">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-brand-primary">{expense.wbsBudget?.project?.project_name || "N/A"}</td> {/* NEW */}
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{expense.wbsBudget?.wbs_code || "N/A"}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-brand-primary">{expense.description}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{new Date(expense.expense_date).toLocaleDateString()}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-white">{formatCurrency(expense.actual_paid_amount)}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{expense.variance_flag}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{expense.wbsBudget?.user?.email || "N/A"}</td>
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
                  <span>Showing {(page - 1) * limit + 1} - {Math.min(page * limit, total)} of {total} expenses</span>
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

export default ExpenseManagementPage;
