import React, { useState, useEffect, useCallback } from 'react';
import { useFinanceCore } from '../../hooks/useFinanceCore';
import Card from '../common/Card';
import Button from '../common/Button';
import Input from '../common/Input';
import Modal from '../common/Modal';
import { Plus, Building2, GitBranch, Tag } from 'lucide-react';
import toast from 'react-hot-toast';

interface CostCenter {
  id: string;
  name: string;
  code?: string;
}

interface Department {
  id: string;
  name: string;
  code?: string;
  costCenters?: CostCenter[];
}

const unwrapDepartments = (raw: any): Department[] => {
  if (Array.isArray(raw)) return raw;
  return raw?.data || raw?.departments || [];
};

const CostCenterManager: React.FC = () => {
  const { loading, fetchDepartments, createDepartment, createCostCenter } = useFinanceCore();

  const [departments, setDepartments] = useState<Department[]>([]);
  const [deptName, setDeptName] = useState('');
  const [deptCode, setDeptCode] = useState('');
  const [isCcModalOpen, setIsCcModalOpen] = useState(false);
  const [selectedDeptId, setSelectedDeptId] = useState('');
  const [ccName, setCcName] = useState('');
  const [ccCode, setCcCode] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadDepartments = useCallback(async () => {
    try {
      const raw = await fetchDepartments();
      setDepartments(unwrapDepartments(raw));
    } catch {
      toast.error('Failed to load organization structure');
    }
  }, [fetchDepartments]);

  useEffect(() => {
    loadDepartments();
  }, [loadDepartments]);

  const handleAddDepartment = async () => {
    if (!deptName.trim() || !deptCode.trim()) {
      toast.error('Department name and code are required');
      return;
    }
    setSubmitting(true);
    try {
      await createDepartment({ name: deptName.trim(), code: deptCode.trim() });
      toast.success('Department created');
      setDeptName('');
      setDeptCode('');
      await loadDepartments();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to create department');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddCostCenter = async () => {
    if (!selectedDeptId || !ccName.trim() || !ccCode.trim()) {
      toast.error('Cost center name, code, and department are required');
      return;
    }
    setSubmitting(true);
    try {
      await createCostCenter({ name: ccName.trim(), code: ccCode.trim(), departmentId: selectedDeptId });
      toast.success('Cost center created');
      setIsCcModalOpen(false);
      setCcName('');
      setCcCode('');
      await loadDepartments();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to create cost center');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card title="Organization Structure" subtitle="Manage departments and cost centers routed against operational budgets." accent="primary">
      <div className="space-y-6">
        {/* Add Department */}
        <div className="flex gap-2 items-end bg-gray-800/50 p-4 rounded-lg border border-gray-700">
          <Input
            label="Department Name"
            value={deptName}
            onChange={(e) => setDeptName(e.target.value)}
            placeholder="e.g. Engineering"
          />
          <div className="w-40">
            <Input
              label="Code"
              value={deptCode}
              onChange={(e) => setDeptCode(e.target.value)}
              placeholder="e.g. ENG"
            />
          </div>
          <Button onClick={handleAddDepartment} disabled={submitting} isLoading={submitting} className="mb-0.5">
            <Plus className="w-4 h-4 mr-2" /> Add Department
          </Button>
        </div>

        {/* Departments List */}
        <div className="space-y-3">
          {loading && departments.length === 0 ? (
            <p className="text-xs italic text-gray-500">Synchronizing organization structure...</p>
          ) : departments.length === 0 ? (
            <p className="text-xs font-bold text-gray-500 italic py-6 text-center">No departments configured yet.</p>
          ) : (
            departments.map(dept => (
              <div key={dept.id} className="bg-brand-dark border border-gray-700 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-brand-primary" />
                    <span className="text-sm font-bold text-white">{dept.name}</span>
                    {dept.code && <span className="text-xs font-mono text-slate-500">{dept.code}</span>}
                  </div>
                  <Button variant="outline" size="sm" onClick={() => { setSelectedDeptId(dept.id); setCcName(''); setCcCode(''); setIsCcModalOpen(true); }}>
                    <Plus className="w-3.5 h-3.5 mr-1.5" /> Cost Center
                  </Button>
                </div>
                {(dept.costCenters || []).length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                    {(dept.costCenters || []).map(cc => (
                      <div key={cc.id} className="flex items-center gap-2 bg-gray-800/40 border border-gray-700 rounded-lg px-3 py-2">
                        <GitBranch className="w-3 h-3 text-brand-secondary" />
                        <span className="text-xs font-medium text-gray-300">{cc.name}</span>
                        {cc.code && <span className="ml-auto text-xs font-mono text-gray-600">{cc.code}</span>}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-600 italic">No cost centers assigned.</p>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Add Cost Center Modal */}
      <Modal
        isOpen={isCcModalOpen}
        onClose={() => setIsCcModalOpen(false)}
        title="Add Cost Center"
      >
        <div className="space-y-6 pt-4">
          <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-2xl flex gap-3">
            <Tag className="w-5 h-5 text-blue-400 shrink-0" />
            <p className="text-xs text-slate-400 leading-tight">
              Cost centers are the routing unit for requisitions and payroll line items under the selected department.
            </p>
          </div>
          <Input
            label="Cost Center Name"
            value={ccName}
            onChange={(e) => setCcName(e.target.value)}
            placeholder="e.g. Cloud Infrastructure"
          />
          <Input
            label="Code"
            value={ccCode}
            onChange={(e) => setCcCode(e.target.value)}
            placeholder="e.g. CLOUD-INFRA"
          />
          <div className="flex gap-2 justify-end pt-4">
            <Button variant="outline" onClick={() => setIsCcModalOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleAddCostCenter} isLoading={submitting}>Add Cost Center</Button>
          </div>
        </div>
      </Modal>
    </Card>
  );
};

export default CostCenterManager;