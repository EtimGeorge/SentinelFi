import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import PageContainer from '../../../components/Layout/PageContainer';
import Card from '../../../components/common/Card';
import DataTable from "../../../components/common/DataTable";
import Input from '../../../components/common/Input';
import Button from '../../../components/common/Button';
import Select from '../../../components/common/Select';
import api from '../../../lib/api';
import { useAuth } from '../../../components/context/AuthContext';
import { useCurrency } from '../../../components/context/CurrencyContext';
import { useFinanceCore } from '../../../hooks/useFinanceCore';
import toast from 'react-hot-toast';
import {
  DollarSign, Zap, ArrowLeft, ChevronRight, Plus, Minus, Save, X, AlertTriangle,
  CheckCircle, Clock, Trash2, FileText, Upload, Download, Eye, Zap as ZapIcon
} from 'lucide-react';
import Link from 'next/link';

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
  project_currency: string;
  status: string;
  category_name: string;
}

interface ProjectExpensePageProps {
  projectId: string;
  mode?: 'expense' | 'overview';
}

const ProjectExpensePage: React.FC = () => {
  const router = useRouter();
  const { projectId } = router.query;
  const mode = (router.query.mode as string) || 'expense';
  const { userCurrency, convertToDisplay, convertAmount } = useCurrency();
  const { createLiveExpense, fetchWBSForExpense } = useFinanceCore();

  const [wbsItems, setWbsItems] = useState<WBSItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedWbsId, setSelectedWbsId] = useState<string>('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [days, setDays] = useState('1');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [project, setProject] = useState<{ project_name: string; currency: string } | null>(null);

  const fetchProjectData = useCallback(async () => {
    if (!projectId) return;
    try {
      const [projRes, wbsRes] = await Promise.all([
        api.get(`/projects/${projectId}`),
        fetchWBSForExpense(projectId as string),
      ]);
      setProject(projRes.data);
      setWbsItems(wbsRes.data || []);
    } catch (e: any) {
      toast.error(`Failed to load project: ${e.message}`);
    } finally {
      setLoading(false);
    }
  }, [projectId, fetchWBSForExpense]);

  useEffect(() => {
    fetchProjectData();
  }, [fetchProjectData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWbsId || !amount || !description) {
      toast.error('Please select a WBS item, enter amount and description');
      return;
    }

    setIsSubmitting(true);
    try {
      await createLiveExpense({
        wbs_id: selectedWbsId,
        amount: parseFloat(amount),
        description,
        quantity: parseFloat(quantity) || 1,
        days: parseFloat(days) || 1,
        expense_date: new Date().toISOString().split('T')[0],
      });
      toast.success('Expense logged successfully');
      setAmount('');
      setDescription('');
      setQuantity('1');
      setDays('1');
      setSelectedWbsId('');
      fetchProjectData(); // Refresh to show updated variance
    } catch (err: any) {
      toast.error(`Failed to log expense: ${err.response?.data?.message || err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getVarianceInfo = (item: WBSItem) => {
    const remaining = item.total_cost_budgeted - item.total_paid_rollup - item.total_committed_lpo;
    const pct = item.total_cost_budgeted > 0 ? (remaining / item.total_cost_budgeted) * 100 : 100;
    if (pct < 0) return { label: 'Over Budget', color: 'text-alert-critical', bg: 'bg-alert-critical/20 border-alert-critical/30' };
    if (pct < 20) return { label: 'Low Budget', color: 'text-alert-warning', bg: 'bg-alert-warning/20 border-alert-warning/30' };
    return { label: 'Healthy', color: 'text-alert-positive', bg: 'bg-alert-positive/20 border-alert-positive/30' };
  };

  if (loading) {
    return (
      <PageContainer title="Loading..." subtitle="Fetching project data">
        <div className="flex items-center justify-center h-64">
          <ZapIcon className="w-12 h-12 text-brand-primary animate-pulse" />
        </div>
      </PageContainer>
    );
  }

  if (!project) {
    return (
      <PageContainer title="Project Not Found" subtitle="The requested project could not be loaded">
        <Link href="/financials/projects" className="text-brand-primary hover:underline">â† Back to Projects</Link>
      </PageContainer>
    );
  }

  const projectCurrency = project.currency || 'NGN';

  return (
    <>
      <Head><title>Log Expense | {project.project_name}</title></Head>
      <PageContainer
        title={mode === 'expense' ? 'Log Project Expense' : 'Project Expense Overview'}
        subtitle={project.project_name}
        headerContent={
          <div className="flex items-center gap-4">
            <Link href={`/projects/${projectId}/overview`} className="text-gray-400 hover:text-white transition">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="w-px h-6 bg-gray-700" />
            <span className="text-sm font-medium text-gray-400">{projectCurrency}</span>
          </div>
        }
      >
        {mode === 'expense' && (
          <>
            {/* Quick Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              <Card className="bg-gray-800 border-gray-700 p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-brand-primary/20 rounded-lg"><DollarSign className="w-5 h-5 text-brand-primary" /></div>
                  <div>
                    <p className="text-xs font-bold text-gray-500 r">Total Budget</p>
                    <p className="text-xl font-bold text-white">{wbsItems.reduce((sum, i) => sum + i.total_cost_budgeted, 0).toLocaleString()} {projectCurrency}</p>
                  </div>
                </div>
              </Card>
              <Card className="bg-gray-800 border-gray-700 p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-alert-critical/20 rounded-lg"><Zap className="w-5 h-5 text-alert-critical" /></div>
                  <div>
                    <p className="text-xs font-bold text-gray-500 r">Total Spent</p>
                    <p className="text-xl font-bold text-white">{wbsItems.reduce((sum, i) => sum + i.total_paid_rollup, 0).toLocaleString()} {projectCurrency}</p>
                  </div>
                </div>
              </Card>
              <Card className="bg-gray-800 border-gray-700 p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-brand-secondary/20 rounded-lg"><FileText className="w-5 h-5 text-brand-secondary" /></div>
                  <div>
                    <p className="text-xs font-bold text-gray-500 r">WBS Items</p>
                    <p className="text-xl font-bold text-white">{wbsItems.length}</p>
                  </div>
                </div>
              </Card>
            </div>

            {/* Expense Form */}
            <Card title="Log New Expense" subtitle="Record actual spend against approved WBS budget items" accent="alert">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-white mb-2">WBS Item <span className="text-alert-critical">*</span></label>
                    <Select
                      value={selectedWbsId}
                      onChange={e => setSelectedWbsId(e.target.value)}
                      options={[
                        { value: '', label: 'Select WBS item...' },
                        ...wbsItems.map(item => ({
                          value: item.wbs_id,
                          label: `[${item.wbs_code}] ${item.description} (${item.category_name})`,
                        })),
                      ]}
                      className="w-full"
                    />
                    {selectedWbsId && (
                      <div className="mt-2 p-3 bg-gray-800 border border-gray-700 rounded-lg">
                        <p className="text-xs text-gray-500">Budget: {convertToDisplay(wbsItems.find(i => i.wbs_id === selectedWbsId)?.total_cost_budgeted || 0, projectCurrency)}</p>
                        <p className="text-xs text-gray-500">Spent: {convertToDisplay(wbsItems.find(i => i.wbs_id === selectedWbsId)?.total_paid_rollup || 0, projectCurrency)}</p>
                        <p className="text-xs text-gray-500">Committed: {convertToDisplay(wbsItems.find(i => i.wbs_id === selectedWbsId)?.total_committed_lpo || 0, projectCurrency)}</p>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-white mb-2">Expense Date <span className="text-alert-critical">*</span></label>
                    <Input
                      type="date"
                      value={new Date().toISOString().split('T')[0]}
                      className="w-full"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-white mb-2">Description <span className="text-alert-critical">*</span></label>
                  <Input
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    placeholder="e.g., Concrete pour for foundation, AWS hosting fees..."
                    className="w-full"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-white mb-2">Amount ({projectCurrency}) <span className="text-alert-critical">*</span></label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={amount}
                      onChange={e => setAmount(e.target.value)}
                      placeholder="0.00"
                      className="w-full font-mono"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-white mb-2">Quantity</label>
                    <div className="flex items-center gap-2">
                      <Button type="button" variant="outline" size="sm" onClick={() => setQuantity(Math.max(0.01, parseFloat(quantity) - 1).toString())}><Minus className="w-4 h-4" /></Button>
                      <Input
                        type="number"
                        step="0.01"
                        min="0.01"
                        value={quantity}
                        onChange={e => setQuantity(e.target.value)}
                        className="w-full text-center"
                      />
                      <Button type="button" variant="outline" size="sm" onClick={() => setQuantity((parseFloat(quantity) + 1).toString())}><Plus className="w-4 h-4" /></Button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-white mb-2">Duration (Days)</label>
                    <Input
                      type="number"
                      min="1"
                      value={days}
                      onChange={e => setDays(e.target.value)}
                      className="w-full"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-white mb-2">UoM</label>
                    <Input
                      value={wbsItems.find(i => i.wbs_id === selectedWbsId)?.uom || 'EA'}
                      disabled
                      className="w-full bg-gray-800"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-gray-700">
                  <Link href={`/financials/projects/expenses?projectId=${projectId}`}>
                    <Button type="button" variant="secondary">View Expense Ledger</Button>
                  </Link>
                  <Button type="submit" variant="primary" isLoading={isSubmitting} className="w-full md:w-auto">
                    <ZapIcon className="w-4 h-4 mr-2" /> Log Expense
                  </Button>
                </div>
              </form>
            </Card>
          </>
        )}

        {mode !== 'expense' && (
          <>
            {/* WBS Expense Table */}
            <Card title="WBS Budget vs Actual" accent="primary">
              <DataTable
                columns={[
                  {
                    key: 'wbs_code',
                    label: 'WBS Code',
                    get: (item: WBSItem) => (
                      <span className="font-mono text-xs font-bold text-brand-primary">{item.wbs_code}</span>
                    ),
                    tier: 'P0' as const,
                  },
                  {
                    key: 'description',
                    label: 'Description',
                    get: (item: WBSItem) => (
                      <span className="text-sm text-white truncate max-w-xs">{item.description}</span>
                    ),
                    tier: 'P0' as const,
                  },
                  {
                    key: 'category',
                    label: 'Category',
                    get: (item: WBSItem) => (
                      <span className="text-xs text-gray-400">{item.category_name}</span>
                    ),
                    tier: 'P1' as const,
                  },
                  {
                    key: 'budgeted',
                    label: 'Budgeted',
                    get: (item: WBSItem) => (
                      <span className="font-mono text-white">{convertToDisplay(item.total_cost_budgeted, projectCurrency)}</span>
                    ),
                    tier: 'P1' as const,
                    cellClassName: 'text-right',
                  },
                  {
                    key: 'spent',
                    label: 'Spent',
                    get: (item: WBSItem) => (
                      <span className="font-mono text-gray-300">{convertToDisplay(item.total_paid_rollup, projectCurrency)}</span>
                    ),
                    tier: 'P1' as const,
                    cellClassName: 'text-right',
                  },
                  {
                    key: 'committed',
                    label: 'Committed',
                    get: (item: WBSItem) => (
                      <span className="font-mono text-gray-400">{convertToDisplay(item.total_committed_lpo, projectCurrency)}</span>
                    ),
                    tier: 'P2' as const,
                    cellClassName: 'text-right',
                  },
                  {
                    key: 'remaining',
                    label: 'Remaining',
                    get: (item: WBSItem) => {
                      const remaining = item.total_cost_budgeted - item.total_paid_rollup - item.total_committed_lpo;
                      return <span className="font-bold text-white">{convertToDisplay(remaining, projectCurrency)}</span>;
                    },
                    tier: 'P2' as const,
                    cellClassName: 'text-center',
                  },
                  {
                    key: 'status',
                    label: 'Status',
                    get: (item: WBSItem) => {
                      const variance = getVarianceInfo(item);
                      return (
                        <span className={`px-2 py-1 rounded-full text-xs font-bold uppercase ${variance.bg} ${variance.color} border`}>
                          {variance.label}
                        </span>
                      );
                    },
                    tier: 'P2' as const,
                    cellClassName: 'text-center',
                  },
                ]}
                rows={wbsItems}
                rowKey={(item) => item.wbs_id}
                className="overflow-hidden"
              />
            </Card>
          </>
        )}

        {/* WBS Selector for Quick Navigation */}
        <Card title="Quick WBS Navigation" accent="secondary">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {wbsItems.slice(0, 12).map(item => {
              const variance = getVarianceInfo(item);
              return (
                <Link
                  key={item.wbs_id}
                  href={`/project/${projectId}?mode=expense&wbs=${item.wbs_id}`}
                  className={`p-4 bg-gray-800 border border-gray-700 rounded-xl hover:border-brand-primary/50 transition group ${variance.bg} ${variance.color} border`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-mono text-xs font-bold text-brand-primary mb-1">{item.wbs_code}</p>
                      <p className="text-sm font-medium text-white truncate">{item.description}</p>
                      <p className="text-xs text-gray-500 mt-1">{item.category_name}</p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-500 group-hover:text-brand-primary transition-colors" />
                  </div>
                  <div className="mt-3 pt-3 border-t border-gray-700 flex justify-between text-xs">
                    <span className="text-gray-400">Budget: {convertToDisplay(item.total_cost_budgeted, projectCurrency)}</span>
                    <span className="font-bold {variance.color}">{variance.label}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        </Card>
      </PageContainer>
    </>
  );
};

export default ProjectExpensePage;