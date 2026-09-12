import React, { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import PageContainer from '../../../../../components/Layout/PageContainer';
import Card from '../../../../../components/common/Card';
import Input from '../../../../../components/common/Input';
import Button from '../../../../../components/common/Button';
import Select from '../../../../../components/common/Select';
import api from '../../../../../lib/api';
import { useAuth, Role } from '../../../../../components/context/AuthContext';
import { useCurrency } from '../../../../../components/context/CurrencyContext';
import toast from 'react-hot-toast';
import {
  DollarSign, Save, X, AlertTriangle, ChevronRight, ChevronLeft,
  CheckCircle, Clock, XCircle, Send, Zap, Brain, FileText, Upload, Plus
} from 'lucide-react';
import { ApprovalPanel } from '../../../../../components/approvals/ApprovalPanel';
import { DocumentToFormModal } from '../../../../../components/approvals/DocumentToFormModal';

interface WBSItem {
  wbs_id: string;
  wbs_code: string;
  description: string;
  total_cost_budgeted: number;
  total_paid_rollup: number;
  total_committed_lpo: number;
  unit_cost_budgeted: number;
  quantity_budgeted: number;
  days_budgeted: number;
  uom: string;
  project_id: string;
  project_name: string;
  project_currency: string;
  category_id: string;
  category_name: string;
  status: string;
  custom_metadata?: Record<string, any>;
}

interface WBSCategory {
  id: string;
  code: string | null;
  name: string;
  description: string | null;
  color: string | null;
  sort_order: number;
  parent_id?: string | null;
}

const STATUS_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string; bg: string }> = {
  draft: { label: 'Draft', icon: FileText, color: 'text-gray-400', bg: 'bg-gray-700/50' },
  pending: { label: 'Pending', icon: Clock, color: 'text-yellow-400', bg: 'bg-yellow-900/30' },
  approved: { label: 'Approved', icon: CheckCircle, color: 'text-green-400', bg: 'bg-green-900/30' },
  rejected: { label: 'Rejected', icon: XCircle, color: 'text-red-400', bg: 'bg-red-900/30' },
};

const BudgetEditPage: React.FC = () => {
  const router = useRouter();
  const { id: projectId, budgetId } = router.query;
  const { hasAnyRole, user } = useAuth();
  const { userCurrency, convertToDisplay } = useCurrency();

  const [item, setItem] = useState<WBSItem | null>(null);
  const [categories, setCategories] = useState<WBSCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showApproval, setShowApproval] = useState(false);
  const [showDocumentModal, setShowDocumentModal] = useState(false);
  const [anomalies, setAnomalies] = useState<any[]>([]);

  // Form state
  const [formData, setFormData] = useState({
    wbs_code: '',
    description: '',
    unit_cost_budgeted: 0,
    quantity_budgeted: 1,
    days_budgeted: 1,
    uom: '',
    category_id: '',
    custom_metadata: [] as { key: string; value: string }[],
  });

  const canManage = hasAnyRole([Role.AdminDirector, Role.AdminManager, Role.CFO, Role.FinanceManager]);
  const canApprove = hasAnyRole([Role.AdminDirector, Role.FinanceManager, Role.OperationalDirector, Role.CFO]);

  const fetchData = useCallback(async () => {
    if (!budgetId) return;
    setLoading(true);
    try {
      const [itemRes, catRes] = await Promise.all([
        api.get<WBSItem>(`/wbs/budget-draft/${budgetId}`),
        api.get<WBSCategory[]>('/wbs/categories'),
      ]);
      setItem(itemRes.data);
      setCategories(catRes.data);

      const data = itemRes.data;
      setFormData({
        wbs_code: data.wbs_code,
        description: data.description,
        unit_cost_budgeted: data.unit_cost_budgeted || 0,
        quantity_budgeted: data.quantity_budgeted || 1,
        days_budgeted: data.days_budgeted || 1,
        uom: data.uom || '',
        category_id: data.category_id || '',
        custom_metadata: data.custom_metadata ? Object.entries(data.custom_metadata).map(([k, v]) => ({ key: k, value: String(v) })) : [],
      });

      // Generate AI anomalies for pending items
      if (data.status === 'pending') {
        generateAnomalies(data);
      }
    } catch (e: any) {
      toast.error(`Failed to load budget item: ${e.message}`);
    } finally {
      setLoading(false);
    }
  }, [budgetId]);

  const generateAnomalies = (data: WBSItem) => {
    const generatedAnomalies = [];
    const variance = data.total_cost_budgeted > 0 ? ((data.total_cost_budgeted - data.total_paid_rollup) / data.total_cost_budgeted) * 100 : 0;
    
    if (variance < -10) {
      generatedAnomalies.push({
        type: 'variance',
        severity: 'critical',
        message: `Budget shows ${Math.abs(variance).toFixed(1)}% overrun vs planned expenditure`,
        field: 'Variance',
        currentValue: variance,
        expectedValue: 0,
      });
    }

    if (data.total_committed_lpo > data.total_cost_budgeted * 0.8) {
      generatedAnomalies.push({
        type: 'threshold',
        severity: 'warning',
        message: 'LPO commitments exceed 80% of budgeted amount',
        field: 'LPO Commitment',
        currentValue: data.total_committed_lpo,
        expectedValue: data.total_cost_budgeted * 0.8,
      });
    }

    if (data.unit_cost_budgeted > 1000000 && data.quantity_budgeted === 1) {
      generatedAnomalies.push({
        type: 'pattern',
        severity: 'info',
        message: 'High unit cost with quantity of 1 â€” verify if this should be split into multiple line items',
        field: 'Unit Cost',
        currentValue: data.unit_cost_budgeted,
      });
    }

    if (data.days_budgeted > 365) {
      generatedAnomalies.push({
        type: 'forecast',
        severity: 'warning',
        message: `Duration of ${data.days_budgeted} days exceeds 1 year â€” consider phasing`,
        field: 'Duration',
        currentValue: data.days_budgeted,
        expectedValue: 365,
      });
    }

    setAnomalies(generatedAnomalies);
  };

  useEffect(() => {
    fetchData();
    fetchCategories();
  }, [fetchData, budgetId]);

  const fetchCategories = async () => {
    try {
      const res = await api.get<WBSCategory[]>('/wbs/categories');
      setCategories(res.data);
    } catch (e) { console.error('Failed to fetch categories', e); }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.wbs_code || !formData.description) {
      toast.error('WBS Code and Description are required');
      return;
    }

    setSaving(true);
    try {
      await api.patch(`/wbs/budget-draft/${budgetId}`, {
        wbs_code: formData.wbs_code,
        description: formData.description,
        unit_cost_budgeted: formData.unit_cost_budgeted,
        quantity_budgeted: formData.quantity_budgeted,
        days_budgeted: formData.days_budgeted,
        uom: formData.uom,
        total_cost_budgeted: formData.unit_cost_budgeted * formData.quantity_budgeted * formData.days_budgeted,
        category_id: formData.category_id || null,
        custom_metadata: formData.custom_metadata.reduce((acc, curr) => {
          if (curr.key.trim()) acc[curr.key.trim()] = curr.value;
          return acc;
        }, {} as Record<string, any>),
      });
      toast.success('Budget item updated');
      router.push(`/project/${projectId}?mode=expense`);
    } catch (e: any) {
      toast.error(`Update failed: ${e.response?.data?.message || e.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleSubmitForApproval = () => {
    setShowApproval(true);
  };

  const handleApprove = async (comment?: string) => {
    try {
      await api.patch(`/wbs/budget-draft/${budgetId}/status`, { status: 'approved', comment });
      toast.success('Budget approved');
      setShowApproval(false);
      fetchData();
    } catch (e: any) {
      toast.error(`Approval failed: ${e.message}`);
    }
  };

  const handleReject = async (comment: string) => {
    try {
      await api.patch(`/wbs/budget-draft/${budgetId}/status`, { status: 'rejected', comment });
      toast.success('Budget rejected');
      setShowApproval(false);
      fetchData();
    } catch (e: any) {
      toast.error(`Rejection failed: ${e.message}`);
    }
  };

  if (loading) {
    return (
      <PageContainer title="Loading..." subtitle="Fetching budget item">
        <div className="flex items-center justify-center h-64"><Zap className="w-12 h-12 text-brand-primary animate-pulse" /></div>
      </PageContainer>
    );
  }

  if (!item) {
    return (
      <PageContainer title="Not Found" subtitle="Budget item not found">
        <Link href={`/project/${projectId}?mode=expense`} className="text-brand-primary hover:underline">â† Back</Link>
      </PageContainer>
    );
  }

  const projectCurrency = item.project_currency || 'NGN';
  const estimatedTotal = formData.unit_cost_budgeted * formData.quantity_budgeted * formData.days_budgeted;

  return (
    <>
      <Head><title>Edit Budget | {item.wbs_code}</title></Head>
      <PageContainer
        title={`Edit Budget: ${item.wbs_code}`}
        subtitle={item.description}
        headerContent={
          <div className="flex items-center gap-4">
            <Link href={`/project/${projectId}?mode=expense`} className="text-gray-400 hover:text-white transition">
              <ChevronLeft className="w-5 h-5" />
            </Link>
            <div className="w-px h-6 bg-gray-700" />
            <span className="px-2 py-0.5 rounded-full text-xs font-bold ${
              item.status === 'pending' ? 'bg-yellow-900/30 text-yellow-400' :
              item.status === 'approved' ? 'bg-green-900/30 text-green-400' :
              item.status === 'rejected' ? 'bg-red-900/30 text-red-400' :
              'bg-gray-700 text-gray-400'
            }">
              {item.status.toUpperCase()}
            </span>
          </div>
        }
      >
        {showApproval && item && (
          <ApprovalPanel
            budget={item}
            anomalies={anomalies}
            onApprove={handleApprove}
            onReject={handleReject}
            onCancel={() => setShowApproval(false)}
          />
        )}

        {showDocumentModal && (
          <DocumentToFormModal
            isOpen={showDocumentModal}
            onClose={() => setShowDocumentModal(false)}
            targetForm="wbs-budget"
            projectId={projectId as string}
            onSave={async (data) => {
              setFormData(prev => ({ ...prev, ...data }));
              toast.success('Document data applied to form');
            }}
          />
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Form */}
          <div className="lg:col-span-2 space-y-6">
            <Card title="WBS Details" accent="primary">
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-white mb-1">WBS Code <span className="text-alert-critical">*</span></label>
                    <Input
                      value={formData.wbs_code}
                      onChange={e => setFormData(prev => ({ ...prev, wbs_code: e.target.value }))}
                      placeholder="e.g., 1.1.2"
                      disabled={item.status !== 'draft'}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-white mb-1">Status</label>
                    <Select
                      value={item.status}
                      onChange={() => {}}
                      options={Object.entries(STATUS_CONFIG).map(([key, cfg]) => ({ value: key, label: cfg.label }))}
                      disabled
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-white mb-1">Description <span className="text-alert-critical">*</span></label>
                  <Input
                    value={formData.description}
                    onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Detailed description of the budget item"
                    disabled={item.status !== 'draft'}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-white mb-1">Category</label>
                    <Select
                      value={formData.category_id}
                      onChange={e => setFormData(prev => ({ ...prev, category_id: e.target.value }))}
                      options={[{ value: '', label: 'Select Category' }, ...categories.map(c => ({ value: c.id, label: c.name }))]}
                      disabled={item.status !== 'draft'}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-white mb-1">UoM</label>
                    <Input
                      value={formData.uom}
                      onChange={e => setFormData(prev => ({ ...prev, uom: e.target.value.toUpperCase() }))}
                      placeholder="EA"
                      maxLength={10}
                      disabled={item.status !== 'draft'}
                    />
                  </div>
                </div>
              </div>
            </Card>

            <Card title="Financials" accent="primary">
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-white mb-1">Unit Cost ({projectCurrency})</label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.unit_cost_budgeted}
                      onChange={e => setFormData(prev => ({ ...prev, unit_cost_budgeted: parseFloat(e.target.value) || 0 }))}
                      className="w-full font-mono"
                      disabled={item.status !== 'draft'}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-white mb-1">Quantity</label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={formData.quantity_budgeted}
                      onChange={e => setFormData(prev => ({ ...prev, quantity_budgeted: parseFloat(e.target.value) || 1 }))}
                      className="w-full"
                      disabled={item.status !== 'draft'}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-white mb-1">Days</label>
                    <Input
                      type="number"
                      min="1"
                      value={formData.days_budgeted}
                      onChange={e => setFormData(prev => ({ ...prev, days_budgeted: parseInt(e.target.value) || 1 }))}
                      className="w-full"
                      disabled={item.status !== 'draft'}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-white mb-1">Estimated Total</label>
                    <div className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 font-mono text-brand-primary text-lg">
                      {convertToDisplay(estimatedTotal, projectCurrency)}
                    </div>
                  </div>
                </div>

                {anomalies.length > 0 && (
                  <div className="p-4 bg-yellow-900/20 border border-yellow-700/30 rounded-xl">
                    <div className="flex items-center gap-2 mb-3">
                      <Brain className="w-5 h-5 text-yellow-400" />
                      <h4 className="font-bold text-yellow-300">AI Anomaly Detection</h4>
                    </div>
                    <div className="space-y-2">
                      {anomalies.map((anomaly, i) => (
                        <div key={i} className={`p-3 rounded-lg ${anomaly.severity === 'critical' ? 'bg-red-900/30 border border-red-700/50' : anomaly.severity === 'warning' ? 'bg-yellow-900/30 border border-yellow-700/50' : 'bg-blue-900/30 border border-blue-700/50'}`}>
                          <div className="flex items-start gap-2">
                            <span className={`text-sm font-bold ${anomaly.severity === 'critical' ? 'text-red-400' : anomaly.severity === 'warning' ? 'text-yellow-400' : 'text-blue-400'}`}>
                              {anomaly.type.toUpperCase()}
                            </span>
                            <p className="text-sm text-gray-300 flex-1">{anomaly.message}</p>
                          </div>
                          <div className="mt-2 text-xs text-gray-500">
                            Field: {anomaly.field} | Current: {typeof anomaly.currentValue === 'number' ? anomaly.currentValue.toFixed(2) : anomaly.currentValue}
                            {anomaly.expectedValue !== undefined && <span> | Expected: {typeof anomaly.expectedValue === 'number' ? anomaly.expectedValue.toFixed(2) : anomaly.expectedValue}</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </Card>

            <Card title="Custom Metadata" accent="secondary">
              <div className="space-y-3">
                {formData.custom_metadata.map((row, idx) => (
                  <div key={idx} className="flex gap-2">
                    <Input
                      placeholder="Key"
                      value={row.key}
                      onChange={e => {
                        const newMeta = [...formData.custom_metadata];
                        newMeta[idx] = { ...newMeta[idx], key: e.target.value };
                        setFormData(prev => ({ ...prev, custom_metadata: newMeta }));
                      }}
                      className="w-1/3 font-mono text-xs"
                      disabled={item.status !== 'draft'}
                    />
                    <Input
                      placeholder="Value"
                      value={row.value}
                      onChange={e => {
                        const newMeta = [...formData.custom_metadata];
                        newMeta[idx] = { ...newMeta[idx], value: e.target.value };
                        setFormData(prev => ({ ...prev, custom_metadata: newMeta }));
                      }}
                      className="flex-1 text-xs"
                      disabled={item.status !== 'draft'}
                    />
                    <Button variant="ghost" size="sm" onClick={() => {
                      setFormData(prev => ({ ...prev, custom_metadata: prev.custom_metadata.filter((_, i) => i !== idx) }));
                    }} disabled={item.status !== 'draft'}>
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={() => setFormData(prev => ({ ...prev, custom_metadata: [...prev.custom_metadata, { key: '', value: '' }] }))} disabled={item.status !== 'draft'}>
                  <Plus className="w-4 h-4 mr-2" /> Add Attribute
                </Button>
              </div>
            </Card>
          </div>

          {/* Sidebar Context */}
          <div className="lg:col-span-1 space-y-6">
            <Card title="Item Context" accent="secondary">
              <div className="space-y-4">
                <div className="p-4 bg-gray-800/50 border border-gray-700 rounded-xl">
                  <p className="text-xs font-bold text-gray-500 r mb-2">Project</p>
                  <p className="font-bold text-white">{item.project_name}</p>
                  <p className="text-xs text-gray-500 mt-1">{item.project_id}</p>
                </div>

                <div className="p-4 bg-gray-800/50 border border-gray-700 rounded-xl">
                  <p className="text-xs font-bold text-gray-500 r mb-2">Current Financials</p>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between"><span className="text-gray-400">Budgeted</span><span className="font-mono text-white">{convertToDisplay(item.total_cost_budgeted, projectCurrency)}</span></div>
                    <div className="flex justify-between"><span className="text-gray-400">Actual Spent</span><span className="font-mono text-gray-300">{convertToDisplay(item.total_paid_rollup, projectCurrency)}</span></div>
                    <div className="flex justify-between"><span className="text-gray-400">Committed (LPO)</span><span className="font-mono text-gray-300">{convertToDisplay(item.total_committed_lpo, projectCurrency)}</span></div>
                    <div className="flex justify-between pt-2 border-t border-gray-700"><span className="font-bold text-gray-300">Remaining</span><span className="font-bold text-white">{convertToDisplay(item.total_cost_budgeted - item.total_paid_rollup - item.total_committed_lpo, projectCurrency)}</span></div>
                  </div>
                </div>

                {item.status === 'draft' && canManage && (
                  <Button variant="primary" className="w-full" onClick={handleSubmitForApproval} size="lg">
                    <Send className="w-4 h-4 mr-2" /> Submit for Approval
                  </Button>
                )}

                {item.status === 'pending' && canApprove && (
                  <Button variant="primary" className="w-full" onClick={() => setShowApproval(true)} size="lg">
                    <CheckCircle className="w-4 h-4 mr-2" /> Review & Approve
                  </Button>
                )}

                <Button variant="outline" className="w-full" onClick={() => setShowDocumentModal(true)}>
                  <Upload className="w-4 h-4 mr-2" /> Fill from Document
                </Button>

                <Button variant="ghost" className="w-full" onClick={() => router.push(`/project/${projectId}?mode=expense`)}>
                  <ChevronLeft className="w-4 h-4 mr-2" /> Back to Project
                </Button>
              </div>
            </Card>

            {/* AI Anomaly Summary */}
            {anomalies.length > 0 && (
              <Card title="AI Anomalies" accent="alert">
                <div className="space-y-2">
                  {anomalies.map((anomaly, i) => (
                    <div key={i} className={`p-3 rounded-lg ${anomaly.severity === 'critical' ? 'bg-red-900/20 border border-red-700/30' : anomaly.severity === 'warning' ? 'bg-yellow-900/20 border border-yellow-700/30' : 'bg-blue-900/20 border border-blue-700/30'}`}>
                      <div className="flex items-start gap-2">
                        <span className={`text-xs font-bold ${anomaly.severity === 'critical' ? 'text-red-400' : anomaly.severity === 'warning' ? 'text-yellow-400' : 'text-blue-400'}`}>
                          {anomaly.type.toUpperCase()}
                        </span>
                        <p className="text-xs text-gray-300 flex-1">{anomaly.message}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>
        </div>

        {/* Bottom Actions */}
        <div className="fixed bottom-0 left-0 right-0 md:relative p-4 bg-brand-dark/95 backdrop-blur-3xl border-t border-gray-700 md:border-0 md:bg-transparent md:shadow-none">
          <div className="max-w-7xl mx-auto flex justify-end gap-3">
            <Button variant="secondary" onClick={() => router.push(`/project/${projectId}?mode=expense`)}>Cancel</Button>
            <Button variant="primary" onClick={handleSave} isLoading={saving} disabled={item.status !== 'draft'}>
              <Save className="w-4 h-4 mr-2" /> Save Changes
            </Button>
          </div>
        </div>
      </PageContainer>
    </>
  );
};

export default BudgetEditPage;