import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Head from 'next/head';
import api from '../../../lib/api'; // Fix API hook to direct import
import { useCurrency } from '../../../components/context/CurrencyContext';
import PageContainer from '../../../components/Layout/PageContainer';
import Card from '../../../components/common/Card';
import Button from '../../../components/common/Button';
import Input from '../../../components/common/Input';
import Modal from '../../../components/common/Modal';
import {
  DollarSign, Settings, LayoutGrid, List, RefreshCcw,
  Briefcase, Activity, CheckCircle, Target, Trash2, Edit, AlertTriangle, Search, ChevronDown
} from 'lucide-react';
import CategoryManager from '../../../components/budgets/CategoryManager';
import BudgetGrid from '../../../components/budgets/BudgetGrid';
import { OperationalBudget } from '@shared/types/operational-budget';
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
  const [editAmount, setEditAmount] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [isSubmittingCorrection, setIsSubmittingCorrection] = useState(false);

  const fetchBudgets = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/operational-budgets');
      const data = res.data.operationalBudgets || [];
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
      const res = await api.get('/operational-budgets/expense/all', {
        params: { budget_id: selectedBudgetId }
      });
      setExpenses(res.data);
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
      await api.patch(`/operational-budgets/expense/${selectedExpense.operational_expense_id}`, {
        amount: parseFloat(editAmount),
        item_description: editDescription,
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
      await api.delete(`/operational-budgets/expense/${selectedExpense.operational_expense_id}`);
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

  return (
    <>
      <Head>
        <title>Operations Ledger (OPEX) | SentinelFi</title>
      </Head>

      <PageContainer
        title="Operations Ledger (OPEX)"
        subtitle="Centralized registry for operational expenditures, budget consumption, and mistake correction."
      >
        {/* KPI Ribbon */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800 rounded-2xl p-6 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full -mr-16 -mt-16 group-hover:scale-110 transition-transform duration-700" />
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-blue-500/10 rounded-lg"><Target className="w-5 h-5 text-blue-400" /></div>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Total Master Budget</p>
            </div>
            <p className="text-3xl font-black text-white tracking-tighter">
              {budgets.length > 0 ? convertToDisplay(budgets.reduce((acc, b) => acc + Number(b.budgeted_amount || 0), 0), 'NGN') : convertToDisplay(0, 'NGN')}
            </p>
          </div>

          <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800 rounded-2xl p-6 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full -mr-16 -mt-16 group-hover:scale-110 transition-transform duration-700" />
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-emerald-500/10 rounded-lg"><CheckCircle className="w-5 h-5 text-emerald-400" /></div>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Total Allocated (Actual)</p>
            </div>
            <p className="text-3xl font-black text-white tracking-tighter">
              {budgets.length > 0 ? convertToDisplay(budgets.reduce((acc, b) => acc + Number(b.actual_spent || 0), 0), 'NGN') : convertToDisplay(0, 'NGN')}
            </p>
          </div>

          <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800 rounded-2xl p-6 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/5 rounded-full -mr-16 -mt-16 group-hover:scale-110 transition-transform duration-700" />
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-orange-500/10 rounded-lg"><Activity className="w-5 h-5 text-orange-500" /></div>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Total Remaining</p>
            </div>
            <p className="text-3xl font-black text-white tracking-tighter">
              {budgets.length > 0 ? convertToDisplay(budgets.reduce((acc, b) => acc + (Number(b.budgeted_amount || 0) - Number(b.actual_spent || 0)), 0), 'NGN') : convertToDisplay(0, 'NGN')}
            </p>
          </div>
        </div>

        <div className="space-y-6">
          {/* Workspace Controls */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-900/30 backdrop-blur-sm p-4 rounded-2xl border border-slate-800 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex bg-slate-950/60 rounded-xl p-1 border border-slate-800">
                <button
                  onClick={() => setView('workspace')}
                  className={`px-5 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all ${view === 'workspace' ? 'bg-brand-primary text-black shadow-[0_0_15px_rgba(var(--brand-primary-rgb),0.3)]' : 'text-slate-500 hover:text-white'}`}
                >
                  <LayoutGrid className="w-4 h-4" /> Workspace
                </button>
                <button
                  onClick={() => setView('expenses')}
                  className={`px-5 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all ${view === 'expenses' ? 'bg-brand-primary text-black shadow-[0_0_15px_rgba(var(--brand-primary-rgb),0.3)]' : 'text-slate-500 hover:text-white'}`}
                >
                  <List className="w-4 h-4" /> Expenses
                </button>
                <button
                  onClick={() => setView('categories')}
                  className={`px-5 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all ${view === 'categories' ? 'bg-brand-primary text-black shadow-[0_0_15px_rgba(var(--brand-primary-rgb),0.3)]' : 'text-slate-500 hover:text-white'}`}
                >
                  <Settings className="w-4 h-4" /> Categories
                </button>
              </div>

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
            <div className="p-20 text-center text-slate-500 flex flex-col items-center">
              <RefreshCcw className="w-8 h-8 animate-spin text-brand-primary mb-4" />
              <p className="font-black uppercase tracking-widest text-xs">Synchronizing Workspace...</p>
            </div>
          ) : view === 'categories' ? (
            <CategoryManager />
          ) : view === 'expenses' ? (
            <div className="bg-slate-900/30 backdrop-blur-sm border border-slate-800 rounded-3xl overflow-hidden">
              <div className="p-6 border-b border-white/[0.03] flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black text-white uppercase tracking-widest">Operational Spend Tracking</h3>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tight">Review and correct periodic expenditures.</p>
                </div>
              </div>
              {loadingExpenses ? (
                <div className="py-20 flex justify-center"><RefreshCcw className="w-8 h-8 animate-spin text-brand-primary" /></div>
              ) : expenses.length === 0 ? (
                <div className="py-20 text-center text-slate-500 text-xs font-bold uppercase tracking-widest">No expenses registered in this period.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-800">
                    <thead className="bg-slate-950/60">
                      <tr>
                        <th className="px-6 py-4 text-left text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Category Mapping</th>
                        <th className="px-6 py-4 text-left text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Spend Narration</th>
                        <th className="px-6 py-4 text-left text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Posting Date</th>
                        <th className="px-6 py-4 text-right text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Net Amount</th>
                        <th className="px-6 py-4 text-right text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Governance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/40">
                      {expenses.map(exp => (
                        <tr key={exp.operational_expense_id} className="hover:bg-blue-500/[0.02] transition-colors group">
                          <td className="px-6 py-4">
                            <span className="text-[11px] font-black text-slate-300 uppercase tracking-tight">{exp.category?.name || 'Uncategorized'}</span>
                          </td>
                          <td className="px-6 py-4 text-xs text-slate-400 font-medium">{exp.item_description}</td>
                          <td className="px-6 py-4 text-[11px] text-slate-500 font-mono italic">{new Date(exp.expense_date).toLocaleDateString()}</td>
                          <td className="px-6 py-4 text-right text-sm font-black text-white tracking-tighter italic">
                            {convertToDisplay(exp.amount, 'NGN')}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => openEditModal(exp)}
                                className="p-1.5 bg-blue-500/10 text-blue-400 hover:bg-blue-500 hover:text-white rounded-lg transition-all"
                                title="Edit Entry"
                              >
                                <Edit size={14} />
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedExpense(exp);
                                  setIsDeleteModalOpen(true);
                                }}
                                className="p-1.5 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-lg transition-all"
                                title="Void Entry"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : selectedBudgetId ? (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
              <BudgetGrid budgetId={selectedBudgetId} />
            </div>
          ) : (
            <div className="p-20 text-center bg-slate-900/20 border border-slate-800 border-dashed rounded-3xl">
              <DollarSign className="w-12 h-12 text-slate-700 mx-auto mb-4" />
              <h3 className="text-sm font-black text-slate-500 uppercase tracking-widest">No Budget Selected</h3>
              <p className="text-xs text-slate-600 mt-2">Select an operational budget to view the matrix workspace.</p>
            </div>
          )}
        </div>
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
            <p className="text-[11px] text-slate-400 leading-tight">
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

      {/* Delete Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Recall Expenditure"
      >
        <div className="space-y-6 pt-4 text-center">
          <div className="w-20 h-20 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-500/20">
            <Trash2 className="w-10 h-10" />
          </div>
          <div>
            <h3 className="text-xl font-black text-white uppercase tracking-tighter">Confirm Recall?</h3>
            <p className="text-sm text-slate-400 max-w-xs mx-auto mt-2 font-medium">
              This will permanently remove the expense record and revert the actual spend metrics for <span className="text-white italic">{selectedExpense?.item_description}</span>.
            </p>
          </div>
          <div className="flex gap-3 justify-center pt-6">
            <Button variant="outline" className="px-8 border-slate-800" onClick={() => setIsDeleteModalOpen(false)}>Cancel</Button>
            <Button className="bg-red-600 hover:bg-red-700 text-white px-8 font-black uppercase tracking-widest text-[10px]" onClick={handleDeleteExpense} isLoading={isSubmittingCorrection}>Recall Expense</Button>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default OperationalBudgetWorkspace;
