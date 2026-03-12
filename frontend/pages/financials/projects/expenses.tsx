import React, { useState, useEffect, useCallback, useMemo } from "react";
import Head from "next/head";
import Link from 'next/link';
import PageContainer from "../../../components/Layout/PageContainer";
import Card from "../../../components/common/Card";
import Input from "../../../components/common/Input";
import Button from "../../../components/common/Button";
import Select from "../../../components/common/Select";
import api from "../../../lib/api"; // Direct import to avoid AbortController issues
import { useAuth } from "../../../components/context/AuthContext";
import { useCurrency } from "../../../components/context/CurrencyContext";
import { GetLiveExpensesDto, VarianceFlag } from "@shared/types/get-live-expenses.dto";
import { LiveExpense } from "@shared/types/expense";
import { ProjectEntity } from "../../../../backend/src/projects/project.entity";
import toast from 'react-hot-toast';
import {
  DollarSign, Download, Printer, Search, RefreshCcw, Edit, Trash2, Activity,
  AlertTriangle, TrendingUp, CheckCircle, Target, X
} from "lucide-react";
import Modal from "../../../components/common/Modal";

const ExpenseManagementPage: React.FC = () => {
  const { isAuthenticated, user } = useAuth();
  const { userCurrency, convertToDisplay, convertAmount } = useCurrency();

  const [expenses, setExpenses] = useState<LiveExpense[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);
  const [projects, setProjects] = useState<ProjectEntity[]>([]);

  // Correction state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<LiveExpense | null>(null);
  const [isSubmittingCorrection, setIsSubmittingCorrection] = useState(false);

  // Edit form state
  const [editAmount, setEditAmount] = useState<string>("");
  const [editDescription, setEditDescription] = useState<string>("");
  const [editQuantity, setEditQuantity] = useState<string>("");
  const [editDays, setEditDays] = useState<string>("");

  // Filters and Pagination State
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);

  const [wbsIdFilter, setWbsIdFilter] = useState("");
  const [descriptionFilter, setDescriptionFilter] = useState("");
  const [varianceFlagFilter, setVarianceFlagFilter] = useState<VarianceFlag | "">("");
  const [startDateFilter, setStartDateFilter] = useState("");
  const [endDateFilter, setEndDateFilter] = useState("");
  const [projectIdFilter, setProjectIdFilter] = useState("");

  // KPIs
  const kpis = useMemo(() => {
    let totalExpenses = 0;
    let overBudget = 0;
    let withinBudget = 0;
    let majorVariance = 0;

    expenses.forEach(e => {
      // Convert to user currency before summing for accurate global KPIs
      const amountInUserCurrency = convertAmount(
        Number(e.amount || 0),
        e.wbsBudget?.project?.currency || 'NGN',
        userCurrency.code
      );
      totalExpenses += amountInUserCurrency;

      const flag = e.variance_flag as string;
      if (flag === VarianceFlag.MAJOR_VARIANCE_OVERRUN || flag === VarianceFlag.MAJOR_VARIANCE_UNBUDGETED) {
        majorVariance++;
      } else if (flag === VarianceFlag.OVER_BUDGET) {
        overBudget++;
      } else if (flag === VarianceFlag.WITHIN_BUDGET || flag === VarianceFlag.NEGATIVE_VARIANCE || flag === VarianceFlag.NO_VARIANCE) {
        withinBudget++;
      }
    });

    return { totalExpenses, overBudget, withinBudget, majorVariance };
  }, [expenses]);

  useEffect(() => {
    if (!isAuthenticated) return;
    api.get<{ projects: ProjectEntity[] }>("/projects?limit=100")
      .then(res => setProjects(res.data.projects))
      .catch(() => toast.error("Failed to fetch projects filter"));
  }, [isAuthenticated]);

  const fetchExpenses = useCallback(async () => {
    if (!isAuthenticated) return;
    setLoading(true);
    try {
      const params: GetLiveExpensesDto = {
        page, limit,
        wbsId: wbsIdFilter || undefined,
        description: descriptionFilter || undefined,
        varianceFlag: varianceFlagFilter || undefined,
        startDate: startDateFilter || undefined,
        endDate: endDateFilter || undefined,
        projectId: projectIdFilter || undefined,
      };
      // Important constraint limit=100 for backend validation rules
      const response = await api.get<{ data: LiveExpense[]; total: number }>("/wbs/expenses", { params });
      setExpenses(response.data.data);
      setTotal(response.data.total);
    } catch (e: any) {
      if (e.name !== 'CanceledError') {
        toast.error(`Fetch failed: ${e.response?.data?.message || e.message}`);
      }
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, page, limit, wbsIdFilter, descriptionFilter, varianceFlagFilter, startDateFilter, endDateFilter, projectIdFilter]);

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  const handleDownloadCsv = async () => {
    setIsDownloading(true);
    toast('Preparing CSV...', { icon: '⏳' });
    try {
      const params: GetLiveExpensesDto = {
        wbsId: wbsIdFilter || undefined,
        description: descriptionFilter || undefined,
        varianceFlag: varianceFlagFilter || undefined,
        startDate: startDateFilter || undefined,
        endDate: endDateFilter || undefined,
        projectId: projectIdFilter || undefined,
      };
      const response = await api.get(`/wbs/expenses/export`, { params, responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `expenses_${new Date().toISOString()}.csv`);
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

  const openEditModal = (expense: LiveExpense) => {
    setSelectedExpense(expense);
    setEditAmount(expense.amount.toString());
    setEditDescription(expense.description || "");
    setEditQuantity(expense.quantity?.toString() || "");
    setEditDays(expense.days?.toString() || "");
    setIsEditModalOpen(true);
  };

  const openDeleteModal = (expense: LiveExpense) => {
    setSelectedExpense(expense);
    setIsDeleteModalOpen(true);
  };

  const handleUpdateExpense = async () => {
    if (!selectedExpense) return;
    setIsSubmittingCorrection(true);
    try {
      await api.patch(`/wbs/expense/live-entry/${selectedExpense.id}`, {
        amount: parseFloat(editAmount),
        description: editDescription,
        quantity: editQuantity ? parseFloat(editQuantity) : undefined,
        days: editDays ? parseFloat(editDays) : undefined,
      });
      toast.success("Expense corrected successfully. Metrics recalibrated.");
      setIsEditModalOpen(false);
      fetchExpenses();
    } catch (err: any) {
      toast.error(`Correction failed: ${err.response?.data?.message || err.message}`);
    } finally {
      setIsSubmittingCorrection(false);
    }
  };

  const handleDeleteExpense = async () => {
    if (!selectedExpense) return;
    setIsSubmittingCorrection(true);
    try {
      await api.delete(`/wbs/expense/live-entry/${selectedExpense.id}`);
      toast.success("Expense recalled. Budget metrics reverted.");
      setIsDeleteModalOpen(false);
      fetchExpenses();
    } catch (err: any) {
      toast.error(`Deletion failed: ${err.response?.data?.message || err.message}`);
    } finally {
      setIsSubmittingCorrection(false);
    }
  };

  return (
    <>
      <Head><title>Expense Management | SentinelFi</title></Head>
      <PageContainer
        title="Expense Management"
        subtitle="Track, filter, and analyze live real-world expense data against WBS budgets."
        headerContent={<Target className="w-8 h-8 text-brand-secondary" />}
      >
        {/* KPI Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-5 shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-brand-primary/10 rounded-lg"><TrendingUp className="w-5 h-5 text-brand-primary" /></div>
              <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Total Filtered Expenses</p>
            </div>
            <p className="text-2xl font-black text-white">{convertToDisplay(kpis.totalExpenses, userCurrency.code)}</p>
          </div>
          <div className="bg-gray-800 border border-gray-700 border-b-4 border-b-green-500 rounded-xl p-5 shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-green-500/10 rounded-lg"><CheckCircle className="w-5 h-5 text-green-400" /></div>
              <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Within Budget</p>
            </div>
            <p className="text-2xl font-black text-white">{kpis.withinBudget} <span className="text-sm font-normal text-gray-400">entries</span></p>
          </div>
          <div className="bg-gray-800 border border-gray-700 border-b-4 border-b-orange-500 rounded-xl p-5 shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-orange-500/10 rounded-lg"><Activity className="w-5 h-5 text-orange-500" /></div>
              <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Over Budget</p>
            </div>
            <p className="text-2xl font-black text-white">{kpis.overBudget} <span className="text-sm font-normal text-gray-400">entries</span></p>
          </div>
          <div className="bg-gray-800 border border-gray-700 border-b-4 border-b-red-500 rounded-xl p-5 shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-red-500/10 rounded-lg"><AlertTriangle className="w-5 h-5 text-red-500 animate-pulse" /></div>
              <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Major Variance</p>
            </div>
            <p className="text-2xl font-black text-white">{kpis.majorVariance} <span className="text-sm font-normal text-gray-400">entries</span></p>
          </div>
        </div>

        <div className="space-y-6">
          <Card title="Filters & Actions" borderTopColor="primary" className="border border-gray-700">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4">
              <Input label="Description" placeholder="Search..." value={descriptionFilter} onChange={(e) => setDescriptionFilter(e.target.value)} />
              <Select
                label="Variance Flag"
                value={varianceFlagFilter}
                onChange={(e) => setVarianceFlagFilter(e.target.value as VarianceFlag | "")}
                options={[
                  { value: "", label: "All Flags" },
                  { value: VarianceFlag.NO_VARIANCE, label: "No Variance" },
                  { value: VarianceFlag.NEGATIVE_VARIANCE, label: "Negative Variance" },
                  { value: VarianceFlag.POSITIVE_VARIANCE, label: "Positive Variance" },
                  { value: VarianceFlag.OVER_BUDGET, label: "Over Budget" },
                  { value: VarianceFlag.MAJOR_VARIANCE_OVERRUN, label: "Major Overrun" },
                  { value: VarianceFlag.MAJOR_VARIANCE_UNBUDGETED, label: "Major Unbudgeted" },
                ]}
              />
              <Input type="date" label="Start Date" value={startDateFilter} onChange={(e) => setStartDateFilter(e.target.value)} />
              <Input type="date" label="End Date" value={endDateFilter} onChange={(e) => setEndDateFilter(e.target.value)} />
              <Select
                label="Project"
                value={projectIdFilter}
                onChange={(e) => setProjectIdFilter(e.target.value)}
                options={[{ value: "", label: "All Projects" }, ...projects.map(p => ({ value: p.project_id, label: p.project_name }))]}
              />
            </div>

            <div className="flex justify-between items-center">
              <div className="flex space-x-2">
                <Button onClick={fetchExpenses} variant="outline" isLoading={loading} icon={<RefreshCcw className="w-4 h-4" />}>Refresh</Button>
                <Button onClick={() => window.print()} variant="outline" icon={<Printer className="w-4 h-4" />}>Print</Button>
                <Button onClick={handleDownloadCsv} variant="outline" isLoading={isDownloading} icon={<Download className="w-4 h-4" />}>Export CSV</Button>
              </div>
              <div className="flex justify-end space-x-2">
                <Button onClick={() => { setWbsIdFilter(""); setDescriptionFilter(""); setVarianceFlagFilter(""); setStartDateFilter(""); setEndDateFilter(""); setProjectIdFilter(""); setPage(1); }} variant="secondary">Clear Filters</Button>
                <Button onClick={() => { setPage(1); fetchExpenses(); }} variant="primary" icon={<Search className="w-4 h-4" />}>Apply Filters</Button>
              </div>
            </div>
          </Card>

          <Card title="Live Expense Stream" borderTopColor="alert" className="border border-gray-700">
            {expenses.length === 0 && !loading ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Activity className="w-16 h-16 text-gray-700 mb-4" />
                <h3 className="text-lg font-bold text-gray-400 mb-2">No Expenses Found</h3>
                <p className="text-sm text-gray-500 max-w-sm">Adjust your filters or use the Expense Tracker to log a new live expense.</p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-gray-700">
                <table className="min-w-full divide-y divide-gray-700">
                  <thead className="bg-brand-dark/50">
                    <tr>
                      <th className="px-4 py-3 text-left text-[10px] font-black text-gray-500 uppercase tracking-widest">Project & WBS</th>
                      <th className="px-4 py-3 text-left text-[10px] font-black text-gray-500 uppercase tracking-widest">Description</th>
                      <th className="px-4 py-3 text-left text-[10px] font-black text-gray-500 uppercase tracking-widest">Date</th>
                      <th className="px-4 py-3 text-right text-[10px] font-black text-gray-500 uppercase tracking-widest">Amount</th>
                      <th className="px-4 py-3 text-left text-[10px] font-black text-gray-500 uppercase tracking-widest">Variance Analysis</th>
                      <th className="px-4 py-3 text-right text-[10px] font-black text-gray-500 uppercase tracking-widest">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {loading ? (
                      [...Array(5)].map((_, i) => (
                        <tr key={i}><td colSpan={6} className="px-4 py-3"><div className="h-8 bg-gray-800 animate-pulse rounded"></div></td></tr>
                      ))
                    ) : expenses.map(expense => {
                      let badgeColor = 'bg-gray-800 text-gray-400';
                      let icon = <CheckCircle className="w-3 h-3" />;

                      const flag = expense.variance_flag as string;
                      if (flag === VarianceFlag.NO_VARIANCE || flag === VarianceFlag.WITHIN_BUDGET) {
                        badgeColor = 'bg-green-900/30 text-green-400 border border-green-800/50';
                      } else if (flag === VarianceFlag.NEGATIVE_VARIANCE || flag === 'POSITIVE_VARIANCE') {
                        badgeColor = 'bg-blue-900/30 text-blue-400 border border-blue-800/50';
                      } else if (flag === VarianceFlag.OVER_BUDGET) {
                        badgeColor = 'bg-orange-900/30 text-orange-400 border border-orange-800/50';
                        icon = <AlertTriangle className="w-3 h-3" />;
                      } else if (flag === VarianceFlag.MAJOR_VARIANCE_OVERRUN || flag === VarianceFlag.MAJOR_VARIANCE_UNBUDGETED) {
                        badgeColor = 'bg-red-900/30 text-red-500 border border-red-700/50 animate-pulse';
                        icon = <AlertTriangle className="w-3 h-3 text-red-500" />;
                      }

                      return (
                        <tr key={expense.id} className="hover:bg-white/5 transition group">
                          <td className="px-4 py-3 whitespace-nowrap">
                            <Link href={`/projects/${expense.wbsBudget?.project?.project_id}/overview`} className="text-sm font-bold text-gray-300 hover:text-brand-primary block truncate max-w-[200px]" title={expense.wbsBudget?.project?.project_name}>
                              {expense.wbsBudget?.project?.project_name || "N/A"}
                            </Link>
                            <Link href={`/financials/projects/wbs`} className="font-mono text-[10px] font-black text-brand-primary bg-brand-primary/10 px-1.5 py-0.5 rounded mt-1 inline-block hover:bg-brand-primary/20">
                              {expense.wbsBudget?.wbs_code || "UNMAPPED"}
                            </Link>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className="text-sm text-gray-300 block truncate max-w-[250px]" title={expense.description}>
                              {expense.description}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-400">
                            {new Date(expense.expense_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-right">
                            <p className="text-sm font-black text-white">{convertToDisplay(expense.amount, expense.wbsBudget?.project?.currency || 'NGN')}</p>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${badgeColor}`}>
                              {icon} {expense.variance_flag.replace(/_/g, ' ')}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-right text-sm">
                            <div className="flex justify-end items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Link href={`/financials/projects/expenses?id=${expense.id}`} className="p-1.5 text-gray-400 hover:text-brand-secondary transition" title="View Dossier">
                                <Activity className="w-4 h-4" />
                              </Link>
                              <button
                                onClick={() => openEditModal(expense)}
                                className="p-1.5 hover:bg-brand-primary/20 text-brand-primary rounded-lg transition"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => openDeleteModal(expense)}
                                className="p-1.5 hover:bg-red-900/30 text-red-500 rounded-lg transition"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
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

        {/* Edit Modal */}
        <Modal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          title="Correct Expense Entry"
        >
          <div className="space-y-4 pt-4">
            <div className="bg-brand-primary/10 border border-brand-primary/20 p-4 rounded-lg flex items-start gap-3 mb-2">
              <AlertTriangle className="w-5 h-5 text-brand-primary shrink-0 mt-0.5" />
              <div className="text-xs text-brand-secondary">
                <p className="font-bold uppercase tracking-wider mb-1">Metric Recalibration Active</p>
                <p>Changing these values will automatically adjust the project's actual spend and fulfillment metrics (Qty/Days).</p>
              </div>
            </div>

            <Input
              label="Item Description"
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
            />
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Amount (NGN)"
                type="number"
                value={editAmount}
                onChange={(e) => setEditAmount(e.target.value)}
              />
              <Input
                label="Quantity"
                type="number"
                value={editQuantity}
                onChange={(e) => setEditQuantity(e.target.value)}
              />
            </div>
            <Input
              label="Duration (Days/Hours)"
              type="number"
              value={editDays}
              onChange={(e) => setEditDays(e.target.value)}
              placeholder="Leave blank if not applicable"
            />

            <div className="flex justify-end gap-3 mt-6">
              <Button variant="secondary" onClick={() => setIsEditModalOpen(false)}>Cancel</Button>
              <Button variant="primary" onClick={handleUpdateExpense} isLoading={isSubmittingCorrection}>Save Correction</Button>
            </div>
          </div>
        </Modal>

        {/* Delete Confirmation Modal */}
        <Modal
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          title="Recall Expense"
        >
          <div className="pt-4 text-center">
            <div className="bg-red-500/10 p-4 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4 border border-red-500/20">
              <Trash2 className="w-10 h-10 text-red-500" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Are you sure?</h3>
            <p className="text-gray-400 text-sm mb-6 px-4">
              Recalling this expense will permanently remove the record and **rollback** its financial impact on the budget metrics. This cannot be undone.
            </p>

            <div className="flex justify-center gap-3">
              <Button variant="secondary" onClick={() => setIsDeleteModalOpen(false)}>No, Keep It</Button>
              <Button
                variant="primary"
                className="bg-red-600 hover:bg-red-700 border-red-800"
                onClick={handleDeleteExpense}
                isLoading={isSubmittingCorrection}
              >
                Yes, Recall Expense
              </Button>
            </div>
          </div>
        </Modal>
      </PageContainer>
    </>
  );
};

export default ExpenseManagementPage;
