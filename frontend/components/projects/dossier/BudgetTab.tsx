import React, { useState } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import api from '../../../lib/api';
import Card from '../../common/Card';
import Modal from '../../common/Modal';
import Button from '../../common/Button';
import Input from '../../common/Input';
import DataTable from '../../common/DataTable';
import { useCurrency } from '../../context/CurrencyContext';
import { useAuth } from '../../context/AuthContext';
import { Role } from '../../../../shared/types/role.enum';
import { Trash2, Edit, FileText, AlertTriangle } from 'lucide-react';
import { WbsBudget } from '@shared/types/wbs';
import { apiErrorMessage } from './errors';
import { ProjectDetail } from './types';

interface BudgetTabProps {
  project: ProjectDetail;
  budgets: WbsBudget[];
  onChanged: () => void;
}

interface BudgetImpact {
  draftAmount: number;
  totalApprovedAmount: number;
  totalPendingAmount: number;
  contractValue: number;
  newTotalIfApproved: number;
  remainingContractBuffer: number;
  percentageOfContractValue: number;
  estimatedVatImpact: number;
  estimatedWhtImpact: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-gray-800 text-gray-400 border-gray-700',
  pending: 'bg-yellow-900/20 text-yellow-400 border-yellow-800',
  approved: 'bg-green-900/20 text-green-400 border-green-800',
  rejected: 'bg-red-900/20 text-red-400 border-red-800',
  recalled: 'bg-orange-900/20 text-orange-400 border-orange-800',
};

const STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  pending: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
  recalled: 'Recalled',
};

const BudgetTab: React.FC<BudgetTabProps> = ({ project, budgets, onChanged }) => {
  const { convertToDisplay } = useCurrency();
  const currency = project.currency || 'NGN';
  const { hasAnyRole } = useAuth();
  const canManageBudget = hasAnyRole([Role.AdminDirector, Role.AdminManager, Role.CFO, Role.FinanceManager, Role.CEO]);

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    description: '',
    unit_cost_budgeted: '',
    quantity_budgeted: '',
    days_budgeted: '',
    total_cost_budgeted: '',
    uom: '',
  });
  const [impact, setImpact] = useState<BudgetImpact | null>(null);

  const handleEditBudget = async (budget: WbsBudget) => {
    setEditingId(budget.wbs_id);
    setEditForm({
      description: budget.description || '',
      unit_cost_budgeted: budget.unit_cost_budgeted !== undefined && budget.unit_cost_budgeted !== null ? String(budget.unit_cost_budgeted) : '',
      quantity_budgeted: budget.quantity_budgeted !== undefined && budget.quantity_budgeted !== null ? String(budget.quantity_budgeted) : '',
      days_budgeted: budget.days_budgeted !== undefined && budget.days_budgeted !== null ? String(budget.days_budgeted) : '',
      total_cost_budgeted: String(budget.total_cost_budgeted ?? ''),
      uom: budget.uom || '',
    });
    setImpact(null);
    setIsEditOpen(true);

    try {
      const res = await api.get<BudgetImpact>(`/wbs/budget-draft/${budget.wbs_id}/impact`);
      setImpact(res.data);
    } catch {
      setImpact(null);
    }
  };

  const handleUpdateBudget = async () => {
    if (!editingId) return;
    setIsSubmitting(true);
    try {
      const payload: Record<string, any> = {};
      if (editForm.description.trim()) payload.description = editForm.description.trim();
      if (editForm.uom.trim()) payload.uom = editForm.uom.trim();

      const numericFields: Array<[string, string]> = [
        ['unit_cost_budgeted', editForm.unit_cost_budgeted],
        ['quantity_budgeted', editForm.quantity_budgeted],
        ['days_budgeted', editForm.days_budgeted],
        ['total_cost_budgeted', editForm.total_cost_budgeted],
      ];
      numericFields.forEach(([key, raw]) => {
        if (raw !== '' && raw !== null) {
          const num = Number(raw);
          if (!isNaN(num) && num >= 0) payload[key] = num;
        }
      });

      await api.patch(`/wbs/budget-draft/${editingId}`, payload);
      toast.success('Budget line updated.');
      setIsEditOpen(false);
      onChanged();
    } catch (e: any) {
      toast.error(`Failed to update budget: ${apiErrorMessage(e)}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteBudget = async (wbs_id: string) => {
    if (window.confirm(`Are you sure you want to delete WBS Budget ID: ${wbs_id}? This action cannot be undone.`)) {
      try {
        await api.delete(`/wbs/budget-draft/${wbs_id}`);
        toast.success('Budget deleted successfully!');
        onChanged();
      } catch (e: any) {
        toast.error(`Failed to delete budget: ${apiErrorMessage(e)}`);
      }
    }
  };

  const riskStyles: Record<string, string> = {
    LOW: 'bg-green-900/20 text-green-400 border-green-800',
    MEDIUM: 'bg-yellow-900/20 text-yellow-400 border-yellow-800',
    HIGH: 'bg-orange-900/20 text-orange-400 border-orange-800',
    CRITICAL: 'bg-red-900/20 text-red-400 border-red-800',
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
      <Card title="Project Budget Ledger (WBS)" accent="secondary" className="border border-gray-700">
        <div className="flex justify-between items-center mb-4">
          <p className="text-sm text-gray-400 font-medium">Detailed breakdown of projected costs.</p>
          <Link href={`/wbs-manager?projectId=${project.project_id}`} className="text-xs text-brand-primary hover:text-white flex items-center p-2 rounded-lg bg-brand-primary/10 border border-brand-primary/30 transition">
            Open Master Builder <Edit className="w-3 h-3 ml-1" />
          </Link>
        </div>
        {budgets.length === 0 ? (
          <div className="p-10 text-center border-2 border-dashed border-gray-800 rounded-xl">
            <FileText className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-500">No WBS budget items found for this project.</p>
          </div>
        ) : (
          <DataTable<WbsBudget>
            rows={budgets}
            rowKey={b => b.wbs_id}
            columns={[
              {
                key: 'code',
                label: 'WBS Code',
                tier: 'P0',
                get: b => <span className="text-sm font-bold text-brand-primary font-mono">{b.wbs_code}</span>,
              },
              {
                key: 'amount',
                label: 'Budgeted Amount',
                tier: 'P0',
                cellClassName: 'text-right',
                get: b => <span className="text-sm text-white font-mono font-bold">{convertToDisplay(b.total_cost_budgeted, currency)}</span>,
              },
              {
                key: 'description',
                label: 'Description',
                tier: 'P1',
                get: b => <span className="text-sm text-gray-300 truncate">{b.description}</span>,
                title: b => b.description,
              },
              {
                key: 'status',
                label: 'Status',
                tier: 'P2',
                get: b => (
                  <span className={`px-2 py-1 inline-flex text-xs leading-4 font-bold rounded-md border ${STATUS_STYLES[b.status] || STATUS_STYLES.draft}`}>
                    {STATUS_LABELS[b.status] || b.status.toUpperCase()}
                  </span>
                ),
              },
            ]}
            actions={canManageBudget ? [
              {
                key: 'edit',
                label: 'Edit',
                icon: <Edit className="w-4 h-4" />,
                primary: true,
                onClick: handleEditBudget,
                title: 'Edit budget line',
              },
              {
                key: 'delete',
                label: 'Delete',
                icon: <Trash2 className="w-4 h-4" />,
                danger: true,
                onClick: (b) => handleDeleteBudget(b.wbs_id),
              },
            ] : undefined}
          />
        )}
      </Card>

      {/* Edit Budget Modal */}
      <Modal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        title="Edit WBS Budget Line"
        size="md"
        footer={
          <div className="flex justify-end space-x-3 w-full">
            <Button variant="secondary" onClick={() => setIsEditOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleUpdateBudget} isLoading={isSubmitting}>Save Changes</Button>
          </div>
        }
      >
        <div className="space-y-4">
          {impact && (
            <div className={`p-3 rounded-lg border ${impact.riskLevel !== 'LOW' ? 'bg-yellow-900/10 border-yellow-800/40' : 'bg-brand-dark/50 border-gray-700'}`}>
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold  text-gray-400">Contract Impact</p>
                <span className={`px-2 py-0.5 text-xs font-bold rounded border ${riskStyles[impact.riskLevel]}`}>{impact.riskLevel}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-2 text-[11px]">
                <span className="text-gray-500">Approved Budget</span>
                <span className="text-white font-mono text-right">{convertToDisplay(impact.totalApprovedAmount, currency)}</span>
                <span className="text-gray-500">Contract Coverage</span>
                <span className="text-white font-mono text-right">{impact.percentageOfContractValue.toFixed(1)}%</span>
                <span className="text-gray-500">Remaining Buffer</span>
                <span className={`font-mono text-right ${impact.remainingContractBuffer < 0 ? 'text-red-400' : 'text-green-400'}`}>{convertToDisplay(impact.remainingContractBuffer, currency)}</span>
                <span className="text-gray-500">VAT / WHT Est.</span>
                <span className="text-white font-mono text-right">{convertToDisplay(impact.estimatedVatImpact, currency)} / {convertToDisplay(impact.estimatedWhtImpact, currency)}</span>
              </div>
            </div>
          )}

          {impact && impact.remainingContractBuffer < 0 && (
            <div className="p-3 bg-red-900/10 border border-red-800/40 rounded-lg flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <p className="text-[11px] text-red-200/80 leading-relaxed">
                The approved budget sum already exceeds the contract value. Raising amounts here widens the over-allocation.
              </p>
            </div>
          )}

          <Input
            label="Description"
            value={editForm.description}
            onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Unit Cost"
              type="number"
              value={editForm.unit_cost_budgeted}
              onChange={(e) => setEditForm({ ...editForm, unit_cost_budgeted: e.target.value })}
            />
            <Input
              label="Quantity"
              type="number"
              value={editForm.quantity_budgeted}
              onChange={(e) => setEditForm({ ...editForm, quantity_budgeted: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Days"
              type="number"
              value={editForm.days_budgeted}
              onChange={(e) => setEditForm({ ...editForm, days_budgeted: e.target.value })}
            />
            <Input
              label="UoM"
              placeholder="e.g., lot, run, unit"
              value={editForm.uom}
              onChange={(e) => setEditForm({ ...editForm, uom: e.target.value })}
            />
          </div>

          <div className="p-3 bg-brand-dark/50 border border-gray-700 rounded-lg">
            <label className="block text-gray-300 text-sm font-bold mb-2">Total Budgeted Amount</label>
            <input
              type="number"
              value={editForm.total_cost_budgeted}
              onChange={(e) => setEditForm({ ...editForm, total_cost_budgeted: e.target.value })}
              className="block w-full py-2 px-4 border border-gray-600 rounded-lg elev-sm focus:outline-none focus:ring-brand-primary focus:border-brand-primary bg-brand-dark/50 text-white"
            />
            <p className="text-xs text-gray-500 mt-1">Explicit override. Leave empty to keep the computed unit Ã— quantity Ã— days value.</p>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default BudgetTab;