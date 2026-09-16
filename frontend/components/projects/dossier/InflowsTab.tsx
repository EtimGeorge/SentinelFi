import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import api from '../../../lib/api';
import Card from '../../common/Card';
import Modal from '../../common/Modal';
import Button from '../../common/Button';
import Input from '../../common/Input';
import DataTable from '../../common/DataTable';
import { useFormAutoSave } from '../../../lib/formAutoSave';
import { useCurrency } from '../../context/CurrencyContext';
import { useAuth } from '../../context/AuthContext';
import { Role } from '../../../../shared/types/role.enum';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { apiErrorMessage } from './errors';
import { ProjectDetail, InflowData } from './types';

interface InflowsTabProps {
  project: ProjectDetail;
  inflows: InflowData[];
  onChanged: () => void;
}

interface InflowForm {
  milestone_name: string;
  amount_received: number;
  receipt_date: string;
  description: string;
}

const EMPTY_FORM: InflowForm = {
  milestone_name: '', amount_received: 0, receipt_date: new Date().toISOString().split('T')[0], description: '',
};

const InflowsTab: React.FC<InflowsTabProps> = ({ project, inflows, onChanged }) => {
  const { convertToDisplay } = useCurrency();
  const currency = project.currency || 'NGN';
  const { hasAnyRole } = useAuth();
  const canManageInflow = hasAnyRole([Role.AdminDirector, Role.AdminManager, Role.CFO, Role.FinanceManager, Role.SuperAdmin, Role.CEO]);

  const { autoSave: autoSaveInflow, restoreData: restoreInflow, clearData: clearInflowData } = useFormAutoSave(`project-${project.project_id}-inflow`);

  const [isInflowModalOpen, setIsInflowModalOpen] = useState(false);
  const [isSubmittingInflow, setIsSubmittingInflow] = useState(false);
  const [inflowForm, setInflowForm] = useState<InflowForm>(EMPTY_FORM);

  const [selectedInflow, setSelectedInflow] = useState<InflowData | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);
  const [editForm, setEditForm] = useState<InflowForm>(EMPTY_FORM);

  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isSubmittingDelete, setIsSubmittingDelete] = useState(false);

  // Restore inflow draft when modal opens
  useEffect(() => {
    if (isInflowModalOpen) {
      const restored = restoreInflow();
      if (restored && confirm('Restore previous inflow draft?')) {
        setInflowForm({ ...EMPTY_FORM, ...restored });
      }
    }
  }, [isInflowModalOpen]);

  const handleLogInflow = async () => {
    if (!inflowForm.milestone_name || !inflowForm.amount_received) {
      toast.error('Please fill in required fields.');
      return;
    }
    setIsSubmittingInflow(true);
    try {
      await api.post(`/projects/${project.project_id}/inflow`, {
        ...inflowForm, amount_received: Number(inflowForm.amount_received),
      });
      clearInflowData();
      setIsInflowModalOpen(false);
      setInflowForm(EMPTY_FORM);
      toast.success('Inflow recorded.');
      onChanged();
    } catch (e: any) {
      toast.error(`Error logging inflow: ${apiErrorMessage(e)}`);
    } finally {
      setIsSubmittingInflow(false);
    }
  };

  const openEdit = (inflow: InflowData) => {
    setSelectedInflow(inflow);
    setEditForm({
      milestone_name: inflow.milestone_name, amount_received: Number(inflow.amount_received), receipt_date: String(inflow.receipt_date).slice(0, 10), description: inflow.description,
    });
    setIsEditOpen(true);
  };

  const handleEditSubmit = async () => {
    if (!selectedInflow) return;
    setIsSubmittingEdit(true);
    try {
      const payload: Record<string, any> = {};
      if (editForm.milestone_name.trim()) payload.milestone_name = editForm.milestone_name.trim();
      if (editForm.description.trim()) payload.description = editForm.description.trim();
      if (editForm.receipt_date) payload.receipt_date = editForm.receipt_date;
      const amount = Number(editForm.amount_received);
      if (!isNaN(amount) && amount > 0) payload.amount_received = amount;
      await api.patch(`/projects/${project.project_id}/inflow/${selectedInflow.id}`, payload);
      setIsEditOpen(false);
      toast.success('Inflow updated.');
      onChanged();
    } catch (e: any) {
      toast.error(`Update failed: ${apiErrorMessage(e)}`);
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  const handleDeleteFinal = async () => {
    if (!selectedInflow) return;
    setIsSubmittingDelete(true);
    try {
      await api.delete(`/projects/${project.project_id}/inflow/${selectedInflow.id}`);
      setIsDeleteOpen(false);
      toast.success('Inflow removed. Revenue rollup recalibrated.');
      onChanged();
    } catch (e: any) {
      toast.error(`Failed to delete inflow: ${apiErrorMessage(e)}`);
    } finally {
      setIsSubmittingDelete(false);
    }
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
      <Card title="Revenue Ledger (Inflows)" accent="secondary" className="border border-gray-700 bg-brand-dark/10">
        <div className="flex justify-between items-center mb-6">
          <p className="text-sm text-gray-400 font-medium">Record of all payments received from the client for milestones.</p>
          {canManageInflow && (
          <Button variant="primary" size="sm" onClick={() => setIsInflowModalOpen(true)}>
            <Plus className="w-4 h-4 mr-1" /> Log Inflow
          </Button>
        )}
        </div>
        {inflows.length === 0 ? (
          <div className="p-10 text-center border-2 border-dashed border-gray-800 rounded-xl text-gray-500">
            No inflows recorded for this project.
          </div>
        ) : (
          <DataTable<InflowData>
            rows={inflows}
            rowKey={inf => inf.id}
            columns={[
              {
                key: 'milestone', label: 'Milestone', tier: 'P0', get: inf => (
                  <div>
                    <div className="text-sm font-bold text-white truncate">{inf.milestone_name}</div>
                    {inf.description && <div className="text-xs text-gray-500 truncate lowercase">{inf.description}</div>}
                  </div>
                ), title: inf => inf.milestone_name,
              },
              {
                key: 'amount', label: 'Amount Received', tier: 'P0', cellClassName: 'text-right', get: inf => <span className="text-sm text-right text-green-400 font-mono font-bold">{convertToDisplay(inf.amount_received, currency)}</span>,
              },
              {
                key: 'date', label: 'Receipt Date', tier: 'P1', get: inf => <span className="text-sm text-gray-400">{new Date(inf.receipt_date).toLocaleDateString()}</span>,
              },
              {
                key: 'recordedBy', label: 'Recorded By', tier: 'P2', get: inf => <span className="text-xs text-gray-500">{inf.receivedBy?.email || 'System'}</span>,
              },
            ]}
            actions={canManageInflow ? [
              {
                key: 'edit', label: 'Edit', icon: <Edit className="w-4 h-4" />, primary: true, onClick: openEdit, title: 'Edit inflow',
              },
              {
                key: 'delete', label: 'Delete', icon: <Trash2 className="w-4 h-4" />, danger: true, onClick: (inf) => { setSelectedInflow(inf); setIsDeleteOpen(true); },
              },
            ] : undefined}
          />
        )}
      </Card>

      {/* Log Inflow Modal */}
      <Modal
        isOpen={isInflowModalOpen}
        onClose={() => setIsInflowModalOpen(false)}
        title="Log Project Inflow (Milestone Payment)"
        size="md"
        footer={
          <div className="flex justify-end space-x-3 w-full">
            <Button variant="secondary" onClick={() => setIsInflowModalOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleLogInflow} disabled={isSubmittingInflow} isLoading={isSubmittingInflow}>
              {isSubmittingInflow ? 'Logging...' : 'Confirm Receipt'}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="p-4 bg-brand-secondary/10 border border-brand-secondary/20 rounded-xl mb-4">
            <p className="text-xs text-brand-secondary font-bold ">Revenue Tracking</p>
            <p className="text-xs text-gray-500 mt-1">Record payments received from the client for this project.</p>
          </div>

          <Input
            label="Milestone/Payment Name"
            placeholder="e.g., Mobilization Fee (30%)"
            value={inflowForm.milestone_name}
            onChange={(e) => {
              const updated = { ...inflowForm, milestone_name: e.target.value };
              setInflowForm(updated);
              autoSaveInflow(updated);
            }}
          />

          <Input
            label="Description"
            placeholder="Details of the payment or milestone achieved..."
            value={inflowForm.description}
            onChange={(e) => {
              const updated = { ...inflowForm, description: e.target.value };
              setInflowForm(updated);
              autoSaveInflow(updated);
            }}
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Amount Received"
              type="number"
              value={inflowForm.amount_received}
              onChange={(e) => {
                const updated = { ...inflowForm, amount_received: parseFloat(e.target.value) };
                setInflowForm(updated);
                autoSaveInflow(updated);
              }}
            />
            <Input
              label="Receipt Date"
              type="date"
              value={inflowForm.receipt_date}
              onChange={(e) => {
                const updated = { ...inflowForm, receipt_date: e.target.value };
                setInflowForm(updated);
                autoSaveInflow(updated);
              }}
            />
          </div>
        </div>
      </Modal>

      {/* Edit Inflow Modal */}
      <Modal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        title="Edit Project Inflow"
        size="md"
        footer={
          <div className="flex justify-end space-x-3 w-full">
            <Button variant="secondary" onClick={() => setIsEditOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleEditSubmit} isLoading={isSubmittingEdit} disabled={isSubmittingEdit}>
              {isSubmittingEdit ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <Input
            label="Milestone/Payment Name"
            value={editForm.milestone_name}
            onChange={(e) => setEditForm({ ...editForm, milestone_name: e.target.value })}
          />
          <Input
            label="Description"
            value={editForm.description}
            onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Amount Received"
              type="number"
              value={editForm.amount_received}
              onChange={(e) => setEditForm({ ...editForm, amount_received: parseFloat(e.target.value) })}
            />
            <Input
              label="Receipt Date"
              type="date"
              value={editForm.receipt_date}
              onChange={(e) => setEditForm({ ...editForm, receipt_date: e.target.value })}
            />
          </div>
        </div>
      </Modal>

      {/* Delete Inflow Modal */}
      <Modal
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        title="Remove Inflow Record"
      >
        <div className="space-y-4 pt-4 text-center">
          <div className="w-16 h-16 bg-red-900/20 text-red-500 rounded-full flex items-center justify-center mx-auto mb-2">
            <Trash2 className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-white">Confirm Removal?</h3>
          <p className="text-sm text-gray-400 max-w-xs mx-auto">
            This will permanently delete the inflow for <strong>{selectedInflow?.milestone_name}</strong> and reduce the project&apos;s received revenue.
          </p>
          <div className="flex gap-2 justify-center pt-6">
            <Button variant="secondary" onClick={() => setIsDeleteOpen(false)}>Cancel</Button>
            <Button className="bg-red-600 hover:bg-red-700 text-white border-none" onClick={handleDeleteFinal} isLoading={isSubmittingDelete}>Remove Inflow</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default InflowsTab;