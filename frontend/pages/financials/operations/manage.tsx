import React, { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import { useCurrency } from '../../../components/context/CurrencyContext';
import { useAuth } from '../../../components/context/AuthContext';
import PageContainer from '../../../components/Layout/PageContainer';
import Card from '../../../components/common/Card';
import Button from '../../../components/common/Button';
import Input from '../../../components/common/Input';
import Modal from '../../../components/common/Modal';
import {
  DollarSign, LayoutGrid, List, Settings, RefreshCcw, Activity, CheckCircle, CheckCircle2, XCircle, Target, Trash2, Edit, AlertTriangle, ChevronDown
} from 'lucide-react';
import DataTable from '../../../components/common/DataTable';
import CategoryManager from '../../../components/budgets/CategoryManager';
import CostCenterManager from '../../../components/budgets/CostCenterManager';
import BudgetGrid from '../../../components/budgets/BudgetGrid';
import Tabs from '../../../components/common/Tabs';
import ConfirmDialog from '../../../components/common/ConfirmDialog';
import { ErrorBoundary } from '../../../components/common/ErrorBoundary';
import EmptyState from '../../../components/common/EmptyState';
import { TableSkeleton, CardSkeleton } from '../../../components/common/LoadingSkeleton';
import { OperationalBudget } from '@shared/types/operational-budget';
import { useFinanceCore } from '../../../hooks/useFinanceCore';
import toast from 'react-hot-toast';

interface OperationalExpense {
  operational_expense_id: string;
  item_description: string;
  amount: number;
  expense_date: string;
  vendor: string | null;
  status: string;
  category?: { name: string; operational_budget_id: string };
}

const OperationalBudgetWorkspace: React.FC = () => {
  const { userCurrency, convertToDisplay } = useCurrency();
  const { user } = useAuth();
  const {
    fetchOperationalBudgets, fetchOperationalExpenses, updateOperationalExpense, deleteOperationalExpense, approveOperationalExpense, rejectOperationalExpense
  } = useFinanceCore();
  const [budgets, setBudgets] = useState<OperationalBudget[]>([]);
  const [selectedBudgetId, setSelectedBudgetId] = useState<string | null>(null);
  const [view, setView] = useState<'workspace' | 'categories' | 'expenses'>('workspace');
  const [loading, setLoading] = useState(true);

  // Expense List State
  const [expenses, setExpenses] = useState<OperationalExpense[]>([]);
  const [loadingExpenses, setLoadingExpenses] = useState(false);

  // Correction State
  const [selectedExpense, setSelectedExpense] = useState<OperationalExpense | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [isApproving, setIsApproving] = useState(false);
  const [editAmount, setEditAmount] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [isSubmittingCorrection, setIsSubmittingCorrection] = useState(false);

  const fetchBudgets = useCallback(async () => {
    setLoading(true);
    try {
      const res: any = await fetchOperationalBudgets();
      const data = res?.operationalBudgets || [];
      setBudgets(data);
      if (data.length > 0 && !selectedBudgetId) {
        setSelectedBudgetId(data[0].operational_budget_id);
      }
    } catch (error) {
      console.error('Failed to fetch budgets');
    } finally {
      setLoading(false);
    }
  }, [selectedBudgetId]);

  const fetchExpenses = useCallback(async () => {
    if (!selectedBudgetId) return;
    setLoadingExpenses(true);
    try {
      const res: any = await fetchOperationalExpenses(selectedBudgetId, 'PENDING');
      setExpenses(res || []);
    } catch (error) {
      toast.error('Failed to load expenses');
    } finally {
      setLoadingExpenses(false);
    }
  }, [selectedBudgetId]);

  useEffect(() => {
    fetchBudgets();
  }, [fetchBudgets]);

  useEffect(() => {
    if (view === 'expenses') {
      fetchExpenses();
    }
  }, [view, fetchExpenses]);

  const openEditModal = (expense: OperationalExpense) => {
    setSelectedExpense(expense);
    setEditAmount(expense.amount.toString());
    setEditDescription(expense.item_description);
    setIsEditModalOpen(true);
  };

  const handleUpdateExpense = async () => {
    if (!selectedExpense) return;
    setIsSubmittingCorrection(true);
    try {
      await updateOperationalExpense(selectedExpense.operational_expense_id, {
        amount: parseFloat(editAmount), item_description: editDescription,
      });
      toast.success("Expense corrected. Budget metrics updated.");
      setIsEditModalOpen(false);
      fetchExpenses();
      fetchBudgets(); // Refresh KPIs
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
      await deleteOperationalExpense(selectedExpense.operational_expense_id);
      toast.success("Expense recalled. Budget actuals reverted.");
      setIsDeleteModalOpen(false);
      fetchExpenses();
      fetchBudgets(); // Refresh KPIs
    } catch (err: any) {
      toast.error(`Recall failed: ${err.response?.data?.message || err.message}`);
    } finally {
      setIsSubmittingCorrection(false);
    }
  };

  const handleApproveExpense = async (expense: OperationalExpense) => {
    setIsApproving(true);
    try {
      await approveOperationalExpense(expense.operational_expense_id, {
        tenant_id: user?.tenant_id,
        actor_user_id: user?.id,
      });
      toast.success("Expense approved.");
      fetchExpenses();
    } catch (err: any) {
      toast.error(`Approval failed: ${err.response?.data?.message || err.message}`);
    } finally {
      setIsApproving(false);
    }
  };

  const handleRejectExpense = async () => {
    if (!selectedExpense) return;
    setIsApproving(true);
    try {
      await rejectOperationalExpense(selectedExpense.operational_expense_id, {
        tenant_id: user?.tenant_id,
        actor_user_id: user?.id,
        reason: rejectReason || 'No reason provided',
      });
      toast.success("Expense rejected.");
      setIsRejectModalOpen(false);
      setRejectReason('');
      fetchExpenses();
    } catch (err: any) {
      toast.error(`Rejection failed: ${err.response?.data?.message || err.message}`);
    } finally {
      setIsApproving(false);
    }
  };

  return (
    <>
      <Head>
        <title>Operations Ledger (OPEX) | SentinelFi</title>
      </Head>

      <PageContainer
        title="Operations Ledger (OPEX)"
        subtitle="Centralized registry for operational expenditures, budget consumption, and mistake correction."
      >
        <ErrorBoundary>
          {/* KPI Ribbon */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800 rounded-2xl p-6 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full -mr-16 -mt-16 group-hover:scale-110 transition-transform duration-700" />
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-blue-500/10 rounded-lg"><Target className="w-5 h-5 text-blue-400" /></div>
                <p className="text-xs font-black text-slate-500 uppercase tracking-[0.2em]">Total Master Budget</p>
              </div>
              <p className="text-3xl font-black text-white tracking-tighter">
                {budgets.length > 0 ? convertToDisplay(budgets.reduce((acc, b) => acc + Number(b.budgeted_amount || 0), 0), 'NGN') : convertToDisplay(0, 'NGN')}
              </p>
            </div>

            <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800 rounded-2xl p-6 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full -mr-16 -mt-16 group-hover:scale-110 transition-transform duration-700" />
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-emerald-500/10 rounded-lg"><CheckCircle className="w-5 h-5 text-emerald-400" /></div>
                <p className="text-xs font-black text-slate-500 uppercase tracking-[0.2em]">Total Allocated (Actual)</p>
              </div>
              <p className="text-3xl font-black text-white tracking-tighter">
                {budgets.length > 0 ? convertToDisplay(budgets.reduce((acc, b) => acc + Number(b.actual_spent || 0), 0), 'NGN') : convertToDisplay(0, 'NGN')}
              </p>
            </div>

            <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800 rounded-2xl p-6 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/5 rounded-full -mr-16 -mt-16 group-hover:scale-110 transition-transform duration-700" />
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-orange-500/10 rounded-lg"><Activity className="w-5 h-5 text-orange-500" /></div>
                <p className="text-xs font-black text-slate-500 uppercase tracking-[0.2em]">Total Remaining</p>
              </div>
              <p className="text-3xl font-black text-white tracking-tighter">
                {budgets.length > 0 ? convertToDisplay(budgets.reduce((acc, b) => acc + (Number(b.budgeted_amount || 0) - Number(b.actual_spent || 0)), 0), 'NGN') : convertToDisplay(0, 'NGN')}
              </p>
            </div>
          </div>

          <div className="space-y-6">
            {/* Workspace Controls */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-900/30 backdrop-blur-sm p-4 rounded-2xl border border-slate-800 elev-sm">
              <div className="flex items-center gap-3 flex-wrap">
                <Tabs
                  tabs={[
                    { key: 'workspace', label: 'Workspace', icon: <LayoutGrid className="w-4 h-4" /> },
                    { key: 'expenses', label: 'Expenses', icon: <List className="w-4 h-4" /> },
                    { key: 'categories', label: 'Categories', icon: <Settings className="w-4 h-4" /> },
                  ]}
                  active={view}
                  onChange={(key) => setView(key as 'workspace' | 'categories' | 'expenses')}
                />

                {(view === 'workspace' || view === 'expenses') && budgets.length > 0 && (
                  <div className="relative">
                    <select
                      value={selectedBudgetId || ''}
                      onChange={(e) => setSelectedBudgetId(e.target.value)}
                      className="bg-slate-950/60 border border-slate-800 text-white text-xs font-black uppercase tracking-tighter rounded-xl focus:ring-1 focus:ring-brand-primary focus:border-brand-primary block w-72 p-3 outline-none appearance-none pr-10"
                    >
                      {budgets.map(b => (
                        <option key={b.operational_budget_id} value={b.operational_budget_id} className="bg-slate-900">
                          {b.name} ({new Date(b.start_date).getFullYear()})
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-3.5 w-4 h-4 text-slate-500 pointer-events-none" />
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="bg-slate-950" onClick={() => fetchBudgets()} icon={<RefreshCcw className="w-4 h-4" />}>
                  Sync Ledger
                </Button>
              </div>
            </div>

            {/* Content Area */}
            {loading ? (
              <div className="space-y-4">
                <CardSkeleton title lines={2} />
                <TableSkeleton columns={5} rows={6} />
              </div>
            ) : view === 'categories' ? (
              <div className="space-y-6">
                <CategoryManager />
                <CostCenterManager />
              </div>
            ) : view === 'expenses' ? (
              <div className="bg-slate-900/30 backdrop-blur-sm border border-slate-800 rounded-3xl overflow-hidden">
                <div className="p-6 border-b border-white/[0.03] flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-black text-white ">Operational Spend Tracking</h3>
                    <p className="text-xs text-slate-500 font-bold uppercase tracking-tight">Review and correct periodic expenditures.</p>
                  </div>
                </div>
                {loadingExpenses ? (
                  <div className="p-6"><TableSkeleton columns={4} rows={6} /></div>
                ) : expenses.length === 0 ? (
                  <EmptyState
                    icon={<List className="w-10 h-10 text-slate-600" />}
                    title="No Expenses Registered"
                    subtitle="No pending expenses are registered for the selected budget in this period."
                  />
                ) : (
                  <DataTable
                    columns={[
                      { key: 'category', label: 'Category Mapping', tier: 'P0', get: (exp) => (
                        <span className="text-xs font-black text-slate-300 uppercase tracking-tight">{exp.category?.name || 'Uncategorized'}</span>
                      )},
                      { key: 'description', label: 'Spend Narration', tier: 'P1', get: (exp) => (
                        <span className="text-xs text-slate-400 font-medium">{exp.item_description}</span>
                      )},
                      { key: 'expense_date', label: 'Posting Date', tier: 'P1', get: (exp) => (
                        <span className="text-xs text-slate-500 font-mono italic">{new Date(exp.expense_date).toLocaleDateString()}</span>
                      )},
                      { key: 'amount', label: 'Net Amount', tier: 'P0', cellClassName: 'text-right text-sm font-black text-white tracking-tighter italic', get: (exp) => (
                        convertToDisplay(exp.amount, 'NGN')
                      )},
                    ]}
                    rows={expenses}
                    rowKey={(exp) => exp.operational_expense_id}
                    actions={[
                      { key: 'approve', label: 'Approve', primary: true, icon: <CheckCircle2 size={14} />, onClick: (exp) => handleApproveExpense(exp) },
                      { key: 'reject', label: 'Reject', danger: true, icon: <XCircle size={14} />, onClick: (exp) => { setSelectedExpense(exp); setRejectReason(''); setIsRejectModalOpen(true); } },
                      { key: 'edit', label: 'Edit Entry', icon: <Edit size={14} />, onClick: (exp) => openEditModal(exp) },
                      { key: 'delete', label: 'Void Entry', icon: <Trash2 size={14} />, danger: true, onClick: (exp) => { setSelectedExpense(exp); setIsDeleteModalOpen(true); } },
                    ]}
                  />
                )}
              </div>
            ) : selectedBudgetId ? (
              <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                <BudgetGrid budgetId={selectedBudgetId} />
              </div>
            ) : (
              <EmptyState
                icon={<DollarSign className="w-10 h-10 text-slate-600" />}
                title="No Budget Selected"
                subtitle="Select an operational budget to view the matrix workspace."
              />
            )}
          </div>
        </ErrorBoundary>
      </PageContainer>

      {/* Edit Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Correct Operational Expense"
      >
        <div className="space-y-6 pt-4">
          <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-2xl flex gap-3">
            <AlertTriangle className="w-5 h-5 text-blue-400 shrink-0" />
            <p className="text-xs text-slate-400 leading-tight">
              Adjusting this amount will automatically recalibrate the associated budget category and parent budget totals in high-fidelity.
            </p>
          </div>
          <Input
            label="Adjusted Amount"
            type="number"
            value={editAmount}
            onChange={(e) => setEditAmount(e.target.value)}
          />
          <Input
            label="Item Description"
            value={editDescription}
            onChange={(e) => setEditDescription(e.target.value)}
          />
          <div className="flex gap-2 justify-end pt-4">
            <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleUpdateExpense} isLoading={isSubmittingCorrection}>Save Correction</Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirm */}
      <ConfirmDialog
        open={isDeleteModalOpen}
        title="Recall Expenditure"
        message={`This will permanently remove the expense record and revert the actual spend metrics for "${selectedExpense?.item_description}".`}
        confirmLabel="Recall Expense"
        cancelLabel="Cancel"
        tone="danger"
        busy={isSubmittingCorrection}
        onConfirm={handleDeleteExpense}
        onCancel={() => setIsDeleteModalOpen(false)}
      />

      {/* Reject Modal */}
      <Modal
        isOpen={isRejectModalOpen}
        onClose={() => setIsRejectModalOpen(false)}
        title="Reject Operational Expense"
      >
        <div className="space-y-6 pt-4 text-center">
          <div className="w-20 h-20 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-500/20">
            <XCircle className="w-10 h-10" />
          </div>
          <div>
            <h3 className="text-xl font-black text-white uppercase tracking-tighter">Confirm Rejection?</h3>
            <p className="text-sm text-slate-400 max-w-xs mx-auto mt-2 font-medium">
              This will deny the pending expense <span className="text-white italic">{selectedExpense?.item_description}</span> and record the decision on the audit trail.
            </p>
          </div>
          <Input
            label="Rejection Reason"
            placeholder="Required for audit trail"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
          />
          <div className="flex gap-3 justify-center pt-6">
            <Button variant="outline" className="px-8 border-slate-800" onClick={() => setIsRejectModalOpen(false)}>Cancel</Button>
            <Button className="bg-red-600 hover:bg-red-700 text-white px-8 font-black  text-xs" onClick={handleRejectExpense} isLoading={isApproving}>Reject Expense</Button>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default OperationalBudgetWorkspace;