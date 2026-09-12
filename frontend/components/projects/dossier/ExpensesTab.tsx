import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import api from '../../../lib/api';
import Card from '../../common/Card';
import Modal from '../../common/Modal';
import Button from '../../common/Button';
import Input from '../../common/Input';
import WBSSelect from '../WBSSelect';
import DataTable from '../../common/DataTable';
import { useFormAutoSave } from '../../../lib/formAutoSave';
import { useCurrency } from '../../context/CurrencyContext';
import { useAuth } from '../../context/AuthContext';
import { Role } from '../../../../shared/types/role.enum';
import { Plus, DollarSign, Edit, Trash2, AlertCircle } from 'lucide-react';
import { LiveExpense } from '@shared/types/expense';
import { apiErrorMessage } from './errors';
import { ProjectDetail } from './types';

interface ExpensesTabProps {
  project: ProjectDetail;
  expenses: LiveExpense[];
  onChanged: () => void;
}

const ExpensesTab: React.FC<ExpensesTabProps> = ({ project, expenses, onChanged }) => {
  const { userCurrency, convertToDisplay } = useCurrency();
  const currency = project.currency || 'NGN';
  const { hasAnyRole } = useAuth();
  const canLogExpense = hasAnyRole([Role.FinanceOfficer, Role.FinanceManager, Role.CFO, Role.CEO, Role.AdminDirector, Role.AssignedProjectUser]);
  const canCorrectExpense = hasAnyRole([Role.AdminDirector, Role.AdminManager, Role.CFO, Role.FinanceManager, Role.CEO]);

  const { autoSave: autoSaveExpense, restoreData: restoreExpense, clearData: clearExpenseData } = useFormAutoSave(`project-${project.project_id}-expense`);

  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isSubmittingExpense, setIsSubmittingExpense] = useState(false);
  const [expenseForm, setExpenseForm] = useState({
    description: '',
    amount: 0,
    expense_date: new Date().toISOString().split('T')[0],
    wbs_id: ''
  });

  const [selectedExpense, setSelectedExpense] = useState<LiveExpense | null>(null);
  const [isDeleteExpenseModalOpen, setIsDeleteExpenseModalOpen] = useState(false);
  const [isEditExpenseModalOpen, setIsEditExpenseModalOpen] = useState(false);
  const [editExpenseAmount, setEditExpenseAmount] = useState('');
  const [editExpenseDescription, setEditExpenseDescription] = useState('');
  const [editExpenseOverrideReason, setEditExpenseOverrideReason] = useState('');
  const [isSubmittingCorrection, setIsSubmittingCorrection] = useState(false);

  // Restore expense draft when modal opens
  useEffect(() => {
    if (isExpenseModalOpen) {
      const restored = restoreExpense();
      if (restored && confirm('Restore previous expense draft?')) {
        setExpenseForm(restored);
      }
    }
  }, [isExpenseModalOpen]);

  const resetExpenseForm = () => {
    setExpenseForm({
      description: '',
      amount: 0,
      expense_date: new Date().toISOString().split('T')[0],
      wbs_id: ''
    });
  };

  const handleLogExpense = async () => {
    const amount = Number(expenseForm.amount);
    if (!expenseForm.description || !expenseForm.wbs_id || !Number.isFinite(amount) || amount <= 0) {
      toast.error('Please fill in all required fields.');
      return;
    }
    setIsSubmittingExpense(true);
    try {
      await api.post('/wbs/expense/live-entry', {
        wbs_id: expenseForm.wbs_id,
        project_id: project.project_id,
        description: expenseForm.description,
        amount,
        unit_cost: amount,
        quantity: 1,
        expense_date: expenseForm.expense_date || new Date().toISOString().split('T')[0],
      });
      clearExpenseData();
      setIsExpenseModalOpen(false);
      resetExpenseForm();
      onChanged();
    } catch (e: any) {
      toast.error(`Error logging expense: ${apiErrorMessage(e)}`);
    } finally {
      setIsSubmittingExpense(false);
    }
  };

  const handleEditExpense = (expense: LiveExpense) => {
    setSelectedExpense(expense);
    setEditExpenseAmount(expense.amount?.toString() ?? '');
    setEditExpenseDescription(expense.description);
    setEditExpenseOverrideReason((expense as any).override_reason || '');
    setIsEditExpenseModalOpen(true);
  };

  const handleUpdateExpenseSubmission = async () => {
    if (!selectedExpense) return;
    setIsSubmittingCorrection(true);
    try {
      const payload: Record<string, any> = {
        amount: parseFloat(editExpenseAmount),
        description: editExpenseDescription,
      };
      if (editExpenseOverrideReason.trim()) payload.override_reason = editExpenseOverrideReason.trim();
      await api.patch(`/wbs/expense/live-entry/${selectedExpense.id}`, payload);
      toast.success('Expense corrected. WBS metrics recalibrated.');
      setIsEditExpenseModalOpen(false);
      onChanged();
    } catch (e: any) {
      toast.error(`Correction failed: ${apiErrorMessage(e)}`);
    } finally {
      setIsSubmittingCorrection(false);
    }
  };

  const handleDeleteExpenseFinal = async () => {
    if (!selectedExpense) return;
    setIsSubmittingCorrection(true);
    try {
      await api.delete(`/wbs/expense/live-entry/${selectedExpense.id}`);
      toast.success('Expense recalled. Budget actuals reverted!');
      setIsDeleteExpenseModalOpen(false);
      onChanged();
    } catch (e: any) {
      toast.error(`Failed to delete expense: ${apiErrorMessage(e)}`);
    } finally {
      setIsSubmittingCorrection(false);
    }
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
      <Card title="Project Expense Journal" accent="alert" className="border border-gray-700 bg-brand-dark/10">
        <div className="flex justify-between items-center mb-6">
          <p className="text-sm text-gray-400 font-medium">Chronological record of actual payments and disbursements.</p>
          {canLogExpense && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsExpenseModalOpen(true)}
              className="elev-lg shadow-brand-primary/20"
            >
              <Plus className="w-4 h-4 mr-1" /> Log New Expense
            </Button>
          )}
        </div>
        {expenses.length === 0 ? (
          <div className="p-10 text-center border-2 border-dashed border-gray-800 rounded-xl">
            <DollarSign className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-500">No live expense entries found for this project.</p>
          </div>
        ) : (
          <DataTable<LiveExpense>
            rows={expenses}
            rowKey={e => String(e.id || e.expense_id || '')}
            columns={[
              {
                key: 'description',
                label: 'Description',
                tier: 'P0',
                get: e => <span className="text-sm text-white font-medium">{e.description}</span>,
                title: e => e.description,
              },
              {
                key: 'amount',
                label: 'Amount Paid',
                tier: 'P0',
                cellClassName: 'text-right',
                get: e => <span className="text-sm text-white font-mono font-bold">{convertToDisplay(e.amount, currency)}</span>,
              },
              {
                key: 'date',
                label: 'Payment Date',
                tier: 'P1',
                get: e => <span className="text-sm text-gray-400">{new Date(e.expense_date).toLocaleDateString()}</span>,
              },
              {
                key: 'variance',
                label: 'Variance',
                tier: 'P2',
                get: e => (
                  <span className={`px-2 py-1 text-xs font-bold rounded uppercase ${e.variance_flag ? 'bg-red-900/30 text-red-500 border border-red-800' : 'bg-gray-800 text-gray-500'}`}>
                    {e.variance_flag ? e.variance_flag.replace(/_/g, ' ') : 'NORMAL'}
                  </span>
                ),
              },
            ]}
            actions={canCorrectExpense ? [
              {
                key: 'edit',
                label: 'Edit',
                icon: <Edit className="w-4 h-4" />,
                primary: true,
                onClick: handleEditExpense,
                title: 'Correct expense',
              },
              {
                key: 'delete',
                label: 'Delete',
                icon: <Trash2 className="w-4 h-4" />,
                danger: true,
                onClick: (e) => { setSelectedExpense(e); setIsDeleteExpenseModalOpen(true); },
              },
            ] : undefined}
          />
        )}
      </Card>

      {/* Log Expense Modal */}
      <Modal
        isOpen={isExpenseModalOpen}
        onClose={() => setIsExpenseModalOpen(false)}
        title="Log New Project Expense"
        size="md"
        footer={
          <div className="flex justify-end space-x-3 w-full">
            <Button variant="secondary" onClick={() => setIsExpenseModalOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleLogExpense} disabled={isSubmittingExpense}>
              {isSubmittingExpense ? 'Logging...' : 'Confirm Payment'}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="p-4 bg-brand-primary/10 border border-brand-primary/20 rounded-xl mb-4">
            <p className="text-xs text-brand-primary font-bold ">Budget Allocation</p>
            <p className="text-xs text-gray-500 mt-1">Select the WBS node this expense should be deducted from.</p>
          </div>

          <WBSSelect
            projectId={project.project_id}
            value={expenseForm.wbs_id}
            onChange={(val) => {
              const updated = { ...expenseForm, wbs_id: val };
              setExpenseForm(updated);
              autoSaveExpense(updated);
            }}
            label="WBS Node"
          />

          <Input
            label="Expense Description"
            placeholder="e.g., Procurement of 5.5kVA Generator"
            value={expenseForm.description}
            onChange={(e) => {
              const updated = { ...expenseForm, description: e.target.value };
              setExpenseForm(updated);
              autoSaveExpense(updated);
            }}
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label={`Amount (${userCurrency.code})`}
              type="number"
              value={expenseForm.amount}
              onChange={(e) => {
                const updated = { ...expenseForm, amount: parseFloat(e.target.value) };
                setExpenseForm(updated);
                autoSaveExpense(updated);
              }}
            />
            <Input
              label="Payment Date"
              type="date"
              value={expenseForm.expense_date}
              onChange={(e) => {
                const updated = { ...expenseForm, expense_date: e.target.value };
                setExpenseForm(updated);
                autoSaveExpense(updated);
              }}
            />
          </div>

          <div className="p-3 bg-yellow-900/10 border border-yellow-800/30 rounded-lg">
            <div className="flex items-start">
              <AlertCircle className="w-4 h-4 text-yellow-500 mr-2 mt-0.5" />
              <p className="text-xs text-yellow-200/70 leading-relaxed">
                Validation: This entry will be checked against the specific WBS node budget. If the amount exceeds the remaining balance, a <span className="text-red-400 font-bold">MAJOR VARIANCE</span> alert will be triggered in the journal.
              </p>
            </div>
          </div>
        </div>
      </Modal>

      {/* Edit Expense Modal */}
      <Modal
        isOpen={isEditExpenseModalOpen}
        onClose={() => setIsEditExpenseModalOpen(false)}
        title="Correct Project Expense"
        size="md"
      >
        <div className="space-y-4 pt-4">
          <div className="p-4 bg-brand-primary/10 border border-brand-primary/20 rounded-xl flex gap-3">
            <AlertCircle className="w-5 h-5 text-brand-primary shrink-0" />
            <p className="text-xs text-brand-primary leading-tight font-medium">
              Adjusting this amount will automatically recalibrate the associated WBS node actuals and rollout metrics across the project.
            </p>
          </div>
          <Input
            label="Corrected Amount"
            type="number"
            value={editExpenseAmount}
            onChange={(e) => setEditExpenseAmount(e.target.value)}
          />
          <Input
            label="Updated Description"
            value={editExpenseDescription}
            onChange={(e) => setEditExpenseDescription(e.target.value)}
          />
          <Input
            label="Override Justification (optional)"
            placeholder="Required if the corrected amount breaches the WBS budget"
            value={editExpenseOverrideReason}
            onChange={(e) => setEditExpenseOverrideReason(e.target.value)}
          />
          <div className="flex gap-2 justify-end pt-4">
            <Button variant="secondary" onClick={() => setIsEditExpenseModalOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleUpdateExpenseSubmission} isLoading={isSubmittingCorrection}>Save Correction</Button>
          </div>
        </div>
      </Modal>

      {/* Delete Expense Modal */}
      <Modal
        isOpen={isDeleteExpenseModalOpen}
        onClose={() => setIsDeleteExpenseModalOpen(false)}
        title="Recall Project Expenditure"
      >
        <div className="space-y-4 pt-4 text-center">
          <div className="w-16 h-16 bg-red-900/20 text-red-500 rounded-full flex items-center justify-center mx-auto mb-2">
            <Trash2 className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-white">Confirm Recall?</h3>
          <p className="text-sm text-gray-400 max-w-xs mx-auto">
            This will permanently remove the expense record and revert the actual spend metrics for <strong>{selectedExpense?.description}</strong>.
          </p>
          <div className="flex gap-2 justify-center pt-6">
            <Button variant="secondary" onClick={() => setIsDeleteExpenseModalOpen(false)}>Cancel</Button>
            <Button className="bg-red-600 hover:bg-red-700 text-white border-none" onClick={handleDeleteExpenseFinal} isLoading={isSubmittingCorrection}>Recall Expense</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default ExpensesTab;