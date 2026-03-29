import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Head from 'next/head';
import PageContainer from '../../../components/Layout/PageContainer';
import {
  TrendingUp, Plus, Trash2, Edit3, Save, X, AlertTriangle,
  ChevronRight, ChevronDown, Layers, MessageSquare,
  CheckCircle, Clock, XCircle, Send, DollarSign, Tag, Database, Upload,
  ArrowUp, ArrowDown, Download, BrainCircuit, Eye, FileText, Zap, FileSpreadsheet
} from 'lucide-react';
import PdfPreviewModal from '../../../components/modals/PdfPreviewModal';
import Button from '../../../components/common/Button';
import { useFinanceCore } from '../../../hooks/useFinanceCore';
import Card from '../../../components/common/Card';
import api from '../../../lib/api';
import { useAuth } from '../../../components/context/AuthContext';
import { Role } from '../../../../shared/types/role.enum';
import toast from 'react-hot-toast';
import { getWBSColor } from '../../../lib/utils';
import { useFormAutoSave } from '../../../lib/formAutoSave';
import { useCurrency } from '../../../components/context/CurrencyContext';
import { WBSApplyTemplateModal } from '../../../components/projects/WBSApplyTemplateModal';
import { WBSImportModal } from '../../../components/projects/WBSImportModal';
import { WbsCategoryModal } from '../../../components/projects/WbsCategoryModal';

interface WBSItem {
  wbs_id: string;
  parent_wbs_id: string | null;
  wbs_code: string;
  description: string;
  total_cost_budgeted: number;
  total_cost_budgeted_rollup?: number;
  has_children?: boolean;
  total_paid_rollup?: number;
  total_paid_self?: number;
  total_committed_lpo?: number;
  category_id?: string | null;
  status?: string;
  project_id?: string;
  has_annotations?: boolean;
  sort_order: number;
  uom?: string | null;
  custom_metadata?: Record<string, any> | null;
  unit_cost_budgeted?: number | null;
  quantity_budgeted?: number | null;
  days_budgeted?: number | null;
}

interface WBSCategory {
  id: string;
  code: string | null;
  name: string;
  description: string | null;
  color: string | null;
  sort_order: number;
  parent_id?: string | null;
  is_active?: boolean;
}

interface ContractValidation {
  totalBudgeted: number;
  contractValue: number;
  overBudget: boolean;
}

const STATUS_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string; bg: string }> = {
  draft: { label: 'Draft', icon: Edit3, color: 'text-gray-400', bg: 'bg-gray-700/50' },
  pending: { label: 'Pending', icon: Clock, color: 'text-yellow-400', bg: 'bg-yellow-900/30' },
  approved: { label: 'Approved', icon: CheckCircle, color: 'text-green-400', bg: 'bg-green-900/30' },
  rejected: { label: 'Rejected', icon: XCircle, color: 'text-red-400', bg: 'bg-red-900/30' },
};

const WBSManagerPage: React.FC = () => {
  const { hasAnyRole, isAuthenticated } = useAuth();
  const { userCurrency, convertToDisplay, convertAmount } = useCurrency();

  const [items, setItems] = useState<WBSItem[]>([]);
  const [categories, setCategories] = useState<WBSCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [projects, setProjects] = useState<{ project_id: string; project_name: string; currency?: string }[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('all');
  const [contractValidation, setContractValidation] = useState<ContractValidation | null>(null);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [forensics, setForensics] = useState<{
    burnRate: number;
    avgDailySpend: number;
    estimatedExhaustionDate: string | null;
    riskLevel: string;
  } | null>(null);
  const { fetchReportBlob, downloadBlob } = useFinanceCore();


  // PDF Preview State
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewData, setPreviewData] = useState<{ blob: Blob; title: string; filename: string } | null>(null);

  const handlePreviewReport = async (type: 'budget' | 'ai-insight' | 'expenses') => {
    if (selectedProjectId === 'all') {
      toast.error('Please select a specific project for reporting.');
      return;
    }
    
    setPreviewData(null);
    setIsPreviewOpen(true);
    
    let endpoint = '';
    let title = '';
    let filename = '';

    if (type === 'budget') {
      endpoint = `/wbs/projects/${selectedProjectId}/report-pdf`;
      title = 'Project Budget Performance';
      filename = `Budget-Report-${selectedProjectId}.pdf`;
    } else if (type === 'ai-insight') {
      endpoint = `/wbs/projects/${selectedProjectId}/ai-insight`;
      title = 'AI Financial Strategy & Risk Analysis';
      filename = `AI-Insight-${selectedProjectId}.pdf`;
    } else if (type === 'expenses') {
      endpoint = `/wbs/projects/${selectedProjectId}/expenses-pdf`;
      title = 'Technical Expenses Ledger';
      filename = `Expenses-Ledger-${selectedProjectId}.pdf`;
    }

    const blob = await fetchReportBlob(endpoint);
    if (blob) {
      setPreviewData({ blob, title, filename });
    } else {
      setIsPreviewOpen(false);
    }
  };

  // State for Add/Edit
  const [actionNode, setActionNode] = useState<{
    type: 'add' | 'edit';
    parentId: string | null;
    node?: WBSItem;
  } | null>(null);
  const [formData, setFormData] = useState({
    code: '',
    description: '',
    unit_cost: 0,
    quantity: 1,
    days: 1,
    uom: '',
    total: 0,
    projectId: '',
    categoryId: '',
    parent_wbs_id: '' as string | null,
    metadata: [] as { key: string; value: string }[],
  });

  // Auto-save setup
  const { autoSave, restoreData, clearData } = useFormAutoSave('wbs-item-form');

  // Restore draft when opening a fresh add form
  useEffect(() => {
    if (actionNode && actionNode.type === 'add') {
      const restored = restoreData<any>();
      if (restored && (restored.code !== formData.code || restored.description !== formData.description)) {
        if (confirm('Restore previous WBS item draft?')) {
          setFormData(prev => ({ ...prev, ...restored }));
        }
      }
    }
  }, [actionNode]);

  const canManage = hasAnyRole([Role.AdminDirector, Role.AdminManager, Role.CFO, Role.FinanceManager]);

  // Auto-compute total when inputs change
  useEffect(() => {
    if (actionNode) {
      const computed = formData.unit_cost * formData.quantity * formData.days;
      setFormData(prev => ({ ...prev, total: computed }));
    }
  }, [formData.unit_cost, formData.quantity, formData.days]);

  const handleMove = async (id: string, direction: 'up' | 'down') => {
    const item = items.find(i => i.wbs_id === id);
    if (!item) return;

    const siblings = items.filter(i => i.parent_wbs_id === item.parent_wbs_id);
    const index = siblings.findIndex(i => i.wbs_id === id);

    if (direction === 'up' && index > 0) {
      const prevItem = siblings[index - 1];
      const newOrder = [
        { id: item.wbs_id, sort_order: index - 1 },
        { id: prevItem.wbs_id, sort_order: index }
      ];
      try {
        await api.patch('/wbs/budget-draft/reorder', { items: newOrder });
        fetchData();
      } catch (err) {
        toast.error('Failed to reorder');
      }
    } else if (direction === 'down' && index < siblings.length - 1) {
      const nextItem = siblings[index + 1];
      const newOrder = [
        { id: item.wbs_id, sort_order: index + 1 },
        { id: nextItem.wbs_id, sort_order: index }
      ];
      try {
        await api.patch('/wbs/budget-draft/reorder', { items: newOrder });
        fetchData();
      } catch (err) {
        toast.error('Failed to reorder');
      }
    }
  };

  const fetchData = useCallback(async (controller?: AbortController) => {
    if (!isAuthenticated) return;
    setLoading(true);
    try {
      const url = selectedProjectId === 'all'
        ? '/wbs/budget/rollup'
        : `/wbs/budget/rollup?projectId=${selectedProjectId}`;

      const response = await api.get<WBSItem[]>(url, { signal: controller?.signal });
      setItems(response.data);

      // Auto-expand root nodes
      const roots = response.data.filter(i => !i.parent_wbs_id);
      setExpandedNodes(new Set(roots.map(r => r.wbs_id)));

      // Validate against contract value if project is selected
      if (selectedProjectId !== 'all') {
        try {
          const valRes = await api.get<ContractValidation>(
            `/wbs/budget/validate-against-contract/${selectedProjectId}`,
            { signal: controller?.signal },
          );
          setContractValidation(valRes.data);
        } catch { setContractValidation(null); }
      } else {
        setContractValidation(null);
      }

      // Fetch Forensics if a specific project is selected
      if (selectedProjectId !== 'all') {
        try {
          const forensicsRes = await api.get(`/wbs/projects/${selectedProjectId}/forensics`, { signal: controller?.signal });
          setForensics(forensicsRes.data);
        } catch { setForensics(null); }
      } else {
        setForensics(null);
      }

    } catch (e: any) {
      if (e.name !== 'CanceledError') {
        toast.error(`Failed to fetch WBS: ${e.message}`);
      }
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, selectedProjectId]);

  // Fetch categories
  useEffect(() => {
    if (!isAuthenticated) return;
    const controller = new AbortController();
    api.get<WBSCategory[]>('/wbs/categories', { signal: controller.signal })
      .then(res => setCategories(res.data))
      .catch(() => { });
    return () => controller.abort();
  }, [isAuthenticated]);

  // Fetch projects
  useEffect(() => {
    if (!isAuthenticated) return;
    const controller = new AbortController();
    api.get('/projects?limit=100', { signal: controller.signal })
      .then(res => setProjects(res.data.projects || []))
      .catch(() => { });
    return () => controller.abort();
  }, [isAuthenticated]);

  // Project Currency Map for fast lookups
  const projectCurrencyMap = useMemo(() => {
    return projects.reduce((acc, p) => {
      acc[p.project_id] = p.currency || 'NGN';
      return acc;
    }, {} as Record<string, string>);
  }, [projects]);

  const totalProjectBudgetFiltered = useMemo(() => {
    return items.filter(i => !i.parent_wbs_id).reduce((sum: number, item: WBSItem) => {
      const projectCurrency = projectCurrencyMap[item.project_id || ''] || 'NGN';
      return sum + convertAmount(Number(item.total_cost_budgeted_rollup || item.total_cost_budgeted || 0), projectCurrency, userCurrency.code);
    }, 0);
  }, [items, projectCurrencyMap, userCurrency.code]);

  const totalSpentFiltered = useMemo(() => {
    return items.filter(i => !i.parent_wbs_id).reduce((sum: number, item: WBSItem) => {
      const projectCurrency = projectCurrencyMap[item.project_id || ''] || 'NGN';
      return sum + convertAmount(Number(item.total_paid_rollup || 0), projectCurrency, userCurrency.code);
    }, 0);
  }, [items, projectCurrencyMap, userCurrency.code]);

  // Fetch WBS data
  useEffect(() => {
    const controller = new AbortController();
    fetchData(controller);
    return () => controller.abort();
  }, [fetchData]);

  const toggleExpand = (id: string) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(id)) newExpanded.delete(id);
    else newExpanded.add(id);
    setExpandedNodes(newExpanded);
  };

  const handleAction = (type: 'add' | 'edit', parentId: string | null = null, node?: WBSItem) => {
    setActionNode({ type, parentId, node });
    setFormData({
      code: node?.wbs_code || (parentId ? (items.find(i => i.wbs_id === parentId)?.wbs_code || '') + '.' : ''),
      description: node?.description || '',
      unit_cost: node?.unit_cost_budgeted || 0,
      quantity: node?.quantity_budgeted || 1,
      days: node?.days_budgeted || 1,
      uom: node?.uom || '',
      total: node?.total_cost_budgeted || 0,
      projectId: node?.project_id || (parentId ? (items.find(i => i.wbs_id === parentId))?.project_id : (selectedProjectId !== 'all' ? selectedProjectId : '')),
      categoryId: node?.category_id || '',
      parent_wbs_id: node?.parent_wbs_id || parentId || null,
      metadata: node?.custom_metadata ? Object.entries(node.custom_metadata).map(([key, value]) => ({ key, value: String(value) })) : [],
    });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    const isNum = ['unit_cost', 'quantity', 'days', 'total'].includes(name);
    setFormData(prev => ({
      ...prev,
      [name]: isNum ? parseFloat(value) || 0 : value
    }));
  };

  const addMetadataRow = () => {
    setFormData(prev => ({
      ...prev,
      metadata: [...prev.metadata, { key: '', value: '' }]
    }));
  };

  const updateMetadataRow = (index: number, field: 'key' | 'value', value: string) => {
    setFormData(prev => {
      const newMetadata = [...prev.metadata];
      newMetadata[index][field] = value;
      const updated = { ...prev, metadata: newMetadata };
      autoSave(updated);
      return updated;
    });
  };

  const removeMetadataRow = (index: number) => {
    setFormData(prev => {
      const updated = { ...prev, metadata: prev.metadata.filter((_, i) => i !== index) };
      autoSave(updated);
      return updated;
    });
  };

  const saveAction = async () => {
    if (!formData.code || !formData.description) {
      toast.error('WBS Code and Description are required');
      return;
    }

    setLoading(true);
    try {
      if (actionNode?.type === 'add') {
        await api.post('/wbs/budget-draft', {
          wbs_code: formData.code,
          description: formData.description,
          unit_cost_budgeted: formData.unit_cost,
          quantity_budgeted: formData.quantity,
          days_budgeted: formData.days,
          uom: formData.uom,
          total_cost_budgeted: formData.total,
          parent_wbs_id: formData.parent_wbs_id,
          project_id: formData.projectId || (selectedProjectId !== 'all' ? selectedProjectId : null),
          category_id: formData.categoryId || null,
          custom_metadata: formData.metadata.reduce((acc, curr) => {
            if (curr.key.trim()) acc[curr.key.trim()] = curr.value;
            return acc;
          }, {} as Record<string, any>),
        });
        toast.success('WBS item created');
      } else if (actionNode?.type === 'edit' && actionNode.node) {
        await api.patch(`/wbs/budget-draft/${actionNode.node.wbs_id}`, {
          wbs_code: formData.code,
          description: formData.description,
          unit_cost_budgeted: formData.unit_cost,
          quantity_budgeted: formData.quantity,
          days_budgeted: formData.days,
          uom: formData.uom,
          total_cost_budgeted: formData.total,
          parent_wbs_id: formData.parent_wbs_id,
          category_id: formData.categoryId || null,
          custom_metadata: formData.metadata.reduce((acc, curr) => {
            if (curr.key.trim()) acc[curr.key.trim()] = curr.value;
            return acc;
          }, {} as Record<string, any>),
        });
        toast.success('WBS item updated');
      }
      clearData();
      setActionNode(null);
      fetchData();
    } catch (e: any) {
      toast.error(`Action failed: ${e.response?.data?.message || e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (selectedProjectId === 'all') {
      toast.error('Please select a specific project to export its budget report.');
      return;
    }
    setLoading(true);
    try {
      const projectName = projects.find(p => p.project_id === selectedProjectId)?.project_name || 'Project';
      const response = await api.get(`/wbs/projects/${selectedProjectId}/report-pdf`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Budget_Report_${projectName}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Budget Report PDF generated');
    } catch (e: any) {
      toast.error(`Failed to export PDF: ${e.response?.data?.message || e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure? This will delete the item and all its children.')) return;

    setLoading(true);
    try {
      await api.delete(`/wbs/budget-draft/${id}?recursive=true`);
      toast.success('Deleted successfully');
      fetchData();
    } catch (e: any) {
      toast.error(`Delete failed: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      await api.patch(`/wbs/budget-draft/${id}/status`, { status: newStatus });
      toast.success(`Status changed to ${newStatus}`);
      fetchData();
    } catch (e: any) {
      toast.error(`Status change failed: ${e.response?.data?.message || e.message}`);
    }
  };

  const getCategoryColor = (categoryId: string | null | undefined): string => {
    if (!categoryId) return '';
    return categories.find(c => c.id === categoryId)?.color || '';
  };

  const getCategoryName = (categoryId: string | null | undefined): string => {
    if (!categoryId) return '';
    return categories.find(c => c.id === categoryId)?.name || '';
  };

  const renderCategoryOptions = (parentId: string | null = null, depth: number = 0): React.ReactNode[] => {
    return categories
      .filter(c => parentId === null ? (!c.parent_id) : c.parent_id === parentId)
      .flatMap(cat => [
        <option key={cat.id} value={cat.id}>
          {'\u00A0'.repeat(depth * 3)}{cat.code ? `[${cat.code}] ` : ''}{cat.name}
        </option>,
        ...renderCategoryOptions(cat.id, depth + 1)
      ]);
  };

  const renderTree = (parentId: string | null = null, level: number = 0) => {
    const children = items.filter(i => i.parent_wbs_id === parentId)
      .sort((a, b) => a.wbs_code.localeCompare(b.wbs_code, undefined, { numeric: true }));

    return children.map(item => {
      const isExpanded = expandedNodes.has(item.wbs_id);
      const hasChildren = items.some(i => i.parent_wbs_id === item.wbs_id);
      const wbsColor = getWBSColor(item.wbs_code.split('.')[0]);
      const isParent = item.has_children || items.some(i => i.parent_wbs_id === item.wbs_id);
      const budgeted = isParent ? Number(item.total_cost_budgeted_rollup || item.total_cost_budgeted || 0) : Number(item.total_cost_budgeted || 0);
      const spent = Number(item.total_paid_rollup || 0);
      const variance = budgeted > 0 ? ((budgeted - spent) / budgeted) * 100 : 0;
      const statusCfg = STATUS_CONFIG[item.status || 'draft'];
      const StatusIcon = statusCfg?.icon || Edit3;
      const catColor = getCategoryColor(item.category_id);

      return (
        <React.Fragment key={item.wbs_id}>
          <div
            className={`group flex items-center p-3 border-b border-gray-800/50 hover:bg-white/5 transition-all ${level > 0 ? 'ml-6 border-l' : ''}`}
            style={{ borderLeftColor: level > 0 ? wbsColor : 'transparent' }}
          >
            <div className="flex items-center flex-grow min-w-0">
              {hasChildren ? (
                <button onClick={() => toggleExpand(item.wbs_id)} className="mr-3 p-1 hover:bg-gray-700 rounded transition">
                  {isExpanded ? <ChevronDown className="w-3.5 h-3.5 text-gray-500" /> : <ChevronRight className="w-3.5 h-3.5 text-gray-500" />}
                </button>
              ) : <div className="w-8" />}

              <div className="flex flex-col truncate">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[10px] font-black px-1.5 py-0.5 rounded bg-gray-800" style={{ color: wbsColor }}>{item.wbs_code}</span>
                  {/* Status Badge */}
                  {statusCfg && (
                    <span className={`flex items-center gap-1 text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${statusCfg.bg} ${statusCfg.color}`}>
                      <StatusIcon className="w-2.5 h-2.5" /> {statusCfg.label}
                    </span>
                  )}
                  {/* Category Badge */}
                  {item.category_id && (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-gray-800 border border-gray-700" style={{ color: catColor || '#999' }}>
                      <Tag className="w-2.5 h-2.5 inline mr-0.5" />
                      {getCategoryName(item.category_id)}
                    </span>
                  )}
                  {item.has_annotations && (
                    <MessageSquare className="w-3 h-3 text-brand-primary animate-pulse" />
                  )}
                </div>
                <div className="flex flex-col mt-0.5">
                  <span className="text-gray-200 text-sm truncate pr-4">{item.description}</span>
                  {!isParent && Number(item.total_cost_budgeted_rollup || 0) === 0 && (
                    <span className="text-[10px] text-gray-500 font-mono mt-0.5">
                      {item.uom ? `${item.uom}: ` : 'QTY: '}{item.quantity_budgeted || 1} @ {convertToDisplay(item.unit_cost_budgeted || 0, projectCurrencyMap[item.project_id || ''] || 'NGN')}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Financial Columns */}
            <div className="flex items-center gap-4 text-right mr-4">
              <div className="min-w-[90px]">
                <p className="font-black text-sm text-gray-100">{convertToDisplay(budgeted, projectCurrencyMap[item.project_id || ''] || 'NGN')}</p>
                <p className="text-[10px] text-gray-500 uppercase font-bold tracking-tighter">Budget</p>
              </div>
              {spent > 0 && (
                <div className="min-w-[90px]">
                  <p className="font-bold text-sm text-gray-300">{convertToDisplay(spent, projectCurrencyMap[item.project_id || ''] || 'NGN')}</p>
                  <p className="text-[10px] text-gray-500 uppercase font-bold tracking-tighter">Actual</p>
                </div>
              )}
              {budgeted > 0 && spent > 0 && (
                <div className="min-w-[60px]">
                  <p className={`font-bold text-sm ${variance < 0 ? 'text-red-400' : variance < 10 ? 'text-yellow-400' : 'text-green-400'}`}>
                    {variance.toFixed(1)}%
                  </p>
                  <p className="text-[10px] text-gray-500 uppercase font-bold tracking-tighter">Variance</p>
                </div>
              )}
            </div>

            {/* Action buttons */}
            {canManage && (
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {/* Status workflow buttons */}
                {item.status === 'draft' && (
                  <button onClick={() => handleStatusChange(item.wbs_id, 'pending')} className="p-1.5 text-yellow-400 hover:bg-yellow-900/30 rounded-lg transition" title="Submit for Approval">
                    <Send className="w-3.5 h-3.5" />
                  </button>
                )}
                {item.status === 'pending' && (
                  <>
                    <button onClick={() => handleStatusChange(item.wbs_id, 'approved')} className="p-1.5 text-green-400 hover:bg-green-900/30 rounded-lg transition" title="Approve">
                      <CheckCircle className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => handleStatusChange(item.wbs_id, 'rejected')} className="p-1.5 text-red-400 hover:bg-red-900/30 rounded-lg transition" title="Reject">
                      <XCircle className="w-3.5 h-3.5" />
                    </button>
                  </>
                )}
                {item.status === 'rejected' && (
                  <button onClick={() => handleStatusChange(item.wbs_id, 'draft')} className="p-1.5 text-gray-400 hover:bg-gray-700 rounded-lg transition" title="Revert to Draft">
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                )}
                <button onClick={() => handleAction('add', item.wbs_id)} className="p-1.5 text-brand-primary hover:bg-brand-primary/20 rounded-lg transition" title="Add Child">
                  <Plus className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => handleAction('edit', item.parent_wbs_id, item)} className="p-1.5 text-gray-400 hover:bg-gray-700 rounded-lg transition" title="Edit">
                  <Edit3 className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => handleDelete(item.wbs_id)} className="p-1.5 text-red-500 hover:bg-red-900/40 rounded-lg transition" title="Delete">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
                <div className="w-px h-4 bg-gray-700 mx-1" />
                <button onClick={() => handleMove(item.wbs_id, 'up')} className="p-1.5 text-gray-500 hover:text-brand-primary transition" title="Move Up">
                  <ArrowUp className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => handleMove(item.wbs_id, 'down')} className="p-1.5 text-gray-500 hover:text-brand-primary transition" title="Move Down">
                  <ArrowDown className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
          {isExpanded && renderTree(item.wbs_id, level + 1)}
        </React.Fragment >
      );
    });
  };

  return (
    <>
      <Head><title>WBS Master Builder | SentinelFi</title></Head>
      <PageContainer
        title="WBS Master Builder"
        subtitle="Construct and manage your project's hierarchical cost structure with precision."
        headerContent={
          <div className="flex items-center gap-4">
            <div className="flex flex-col items-end">
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Active Project Filter</label>
              <select
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                className="bg-brand-dark border border-gray-700 rounded-lg p-2 text-xs text-white focus:ring-brand-primary outline-none min-w-[200px]"
              >
                <option value="all">Consolidated (All Projects)</option>
                {projects.map(p => (
                  <option key={p.project_id} value={p.project_id}>{p.project_name}</option>
                ))}
              </select>
            </div>
            
            <div className="h-10 w-px bg-gray-700 mx-1" />
            
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                className="border-gray-700 text-gray-400 hover:text-white"
                disabled={selectedProjectId === 'all'}
                onClick={() => handlePreviewReport('expenses')}
              >
                <FileSpreadsheet className="w-4 h-4 mr-2" />
                Ledger
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                className="border-gray-700 text-gray-400 hover:text-white"
                disabled={selectedProjectId === 'all'}
                onClick={() => handlePreviewReport('budget')}
              >
                <FileText className="w-4 h-4 mr-2" />
                Budget
              </Button>
              <Button 
                variant="primary" 
                size="sm" 
                className="bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-500/20"
                disabled={selectedProjectId === 'all'}
                onClick={() => handlePreviewReport('ai-insight')}
              >
                <BrainCircuit className="w-4 h-4 mr-2" />
                AI Insight
              </Button>
            </div>
            
            <div className="h-10 w-px bg-gray-700 mx-1" />
            <Layers className="w-8 h-8 text-brand-primary" />
          </div>
        }
      >
        {/* Project Budget Total Summary */}
        {items.length > 0 && (
          <div className="mb-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-gradient-to-r from-brand-primary/10 to-transparent border border-brand-primary/20 rounded-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <DollarSign className="w-5 h-5 text-brand-primary" />
                  <div>
                    <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Total Project Budget</p>
                    <p className="text-xl font-black text-white">
                      {convertToDisplay(totalProjectBudgetFiltered, userCurrency.code)}
                    </p>
                  </div>
                </div>
                <div className="flex gap-6">
                  <div className="text-right">
                    <p className="text-[10px] text-gray-500 uppercase font-bold">Total Spent</p>
                    <p className="text-sm font-bold text-gray-300">
                      {convertToDisplay(totalSpentFiltered, userCurrency.code)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-gray-500 uppercase font-bold">Root Items</p>
                    <p className="text-sm font-bold text-brand-primary">{items.filter(i => !i.parent_wbs_id).length}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* NEW: Forensics Card */}
            {forensics && (
              <div className={`p-4 border rounded-xl flex items-center justify-between ${
                forensics.riskLevel === 'CRITICAL' ? 'bg-red-900/10 border-red-700/30' : 
                forensics.riskLevel === 'WARNING' ? 'bg-yellow-900/10 border-yellow-700/30' : 
                'bg-green-900/10 border-green-700/30'
              }`}>
                <div className="flex items-center gap-3">
                  <Zap className={`w-5 h-5 ${
                    forensics.riskLevel === 'CRITICAL' ? 'text-red-500' : 
                    forensics.riskLevel === 'WARNING' ? 'text-yellow-500' : 
                    'text-green-500'
                  }`} />
                  <div>
                    <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Predictive Run-Rate</p>
                    <div className="flex items-center gap-2">
                       <p className="text-lg font-black text-white">{convertToDisplay(forensics.avgDailySpend, projectCurrencyMap[selectedProjectId] || 'NGN')}</p>
                       <span className="text-[10px] text-gray-500 font-bold">/ DAY</span>
                    </div>
                  </div>
                </div>
                
                <div className="text-right">
                  <p className="text-[10px] text-gray-500 uppercase font-bold">Projected Exhaustion</p>
                  <p className={`text-sm font-black ${
                    forensics.riskLevel === 'CRITICAL' ? 'text-red-400' : 
                    forensics.riskLevel === 'WARNING' ? 'text-yellow-400' : 
                    'text-green-400'
                  }`}>
                    {forensics.estimatedExhaustionDate ? new Date(forensics.estimatedExhaustionDate).toLocaleDateString('en-GB') : 'SUSTAINABLE'}
                  </p>
                  <p className="text-[10px] font-bold text-gray-500">{forensics.riskLevel} STATUS</p>
                </div>
              </div>
            )}
          </div>
        )}


        {/* Contract Value Warning Banner */}
        {contractValidation?.overBudget && (
          <div className="mb-6 p-4 bg-red-900/20 border border-red-700/50 rounded-xl flex items-center gap-3">
            <AlertTriangle className="w-6 h-6 text-red-400 flex-shrink-0" />
            <div>
              <p className="text-sm font-bold text-red-300">Budget Exceeds Contract Value</p>
              <p className="text-xs text-red-400 mt-0.5">
                Total WBS budgets ({convertToDisplay(contractValidation.totalBudgeted, projectCurrencyMap[selectedProjectId] || 'NGN')}) exceed the contract value ({convertToDisplay(contractValidation.contractValue, projectCurrencyMap[selectedProjectId] || 'NGN')}) by{' '}
                <span className="font-bold">{convertToDisplay(contractValidation.totalBudgeted - contractValidation.contractValue, projectCurrencyMap[selectedProjectId] || 'NGN')}</span>.
              </p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

          <div className="xl:col-span-2">
            <Card title="WBS Architecture" subtitle="Hierarchical view of all projects and costs. Hover over items to manage." borderTopColor="primary">
              {loading && items.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-12">
                  <TrendingUp className="w-12 h-12 text-gray-700 animate-pulse mb-4" />
                  <p className="text-gray-500">Loading WBS structure...</p>
                </div>
              ) : (
                <div className="bg-brand-dark/40 rounded-lg overflow-hidden min-h-[400px]">
                  <div className="bg-gray-800/50 p-3 border-b border-gray-700 flex text-xs font-bold text-gray-400 uppercase">
                    <div className="flex-grow">Structure & Description</div>
                    <div className="w-64 text-right mr-20">Financials</div>
                    {canManage && <div className="w-32">Actions</div>}
                  </div>
                  {items.length === 0 ? (
                    <div className="p-12 text-center text-gray-500">
                      No items found. Start by creating a Top-Level element.
                      <br />
                      <button onClick={() => handleAction('add')} className="mt-4 px-4 py-2 bg-brand-primary text-white rounded-lg">Create First WBS</button>
                    </div>
                  ) : renderTree(null)}
                </div>
              )}
            </Card>
          </div>

          <div className="xl:col-span-1">
            {actionNode ? (
              <Card
                title={actionNode.type === 'add' ? 'Add WBS Element' : 'Edit WBS Element'}
                borderTopColor={actionNode.type === 'add' ? 'positive' : 'secondary'}
              >
                <div className="space-y-3">
                  {/* WBS Code */}
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">WBS Code</label>
                    <input
                      type="text"
                      value={formData.code ?? ''}
                      onChange={e => {
                        const updated = { ...formData, code: e.target.value };
                        setFormData(updated);
                        autoSave(updated);
                      }}
                      className="w-full bg-gray-800 border border-gray-700 p-2 rounded text-white font-mono text-sm"
                      placeholder="e.g. 1.1.2"
                    />
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Description</label>
                    <textarea
                      value={formData.description ?? ''}
                      onChange={e => {
                        const updated = { ...formData, description: e.target.value };
                        setFormData(updated);
                        autoSave(updated);
                      }}
                      className="w-full bg-gray-800 border border-gray-700 p-2 rounded text-white h-20 text-sm"
                      placeholder="Enter detailed description..."
                    />
                  </div>

                  {/* Parent WBS Element Selector */}
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Parent Element</label>
                    <select
                      value={formData.parent_wbs_id ?? ''}
                      name="parent_wbs_id"
                      onChange={handleInputChange}
                      className="w-full bg-gray-800 border border-gray-700 p-2 rounded text-white text-sm"
                    >
                      <option value="">— Top-Level Element (No Parent) —</option>
                      {items.map(item => (
                        <option key={item.wbs_id} value={item.wbs_id}>
                          [{item.wbs_code}] {item.description.substring(0, 40)}{item.description.length > 40 ? '...' : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Category Selector with Inline Creation */}
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Reporting Category</label>
                    <select
                      value={formData.categoryId ?? ''}
                      name="categoryId"
                      onChange={(e) => {
                        if (e.target.value === '__create_new__') {
                          setIsCreatingCategory(true);
                          setFormData(prev => ({ ...prev, categoryId: '' }));
                        } else {
                          handleInputChange(e);
                        }
                      }}
                      className="w-full bg-gray-800 border border-gray-700 p-2 rounded text-white text-sm"
                    >
                      <option value="">— Select Category —</option>
                      {renderCategoryOptions(null)}
                      <option value="__create_new__">➕ Create New Category...</option>
                    </select>
                    {isCreatingCategory && (
                      <div className="mt-2 flex items-center space-x-2">
                        <input
                          type="text"
                          placeholder="New category name"
                          value={newCategoryName}
                          onChange={e => setNewCategoryName(e.target.value)}
                          className="flex-grow bg-gray-900 border border-brand-primary/50 p-2 rounded text-white text-sm"
                          autoFocus
                        />
                        <button
                          onClick={async () => {
                            if (!newCategoryName.trim()) return;
                            try {
                              const res = await api.post<WBSCategory>('/wbs/categories', {
                                name: newCategoryName.trim(),
                                parent_id: null
                              });
                              toast.success(`Category "${newCategoryName}" created`);
                              setFormData(prev => ({ ...prev, categoryId: res.data.id }));
                              setNewCategoryName('');
                              setIsCreatingCategory(false);
                              // Refresh categories
                              const catRes = await api.get<WBSCategory[]>('/wbs/categories');
                              setCategories(catRes.data);
                            } catch (err: any) {
                              toast.error(err.response?.data?.message || 'Failed to create category');
                            }
                          }}
                          className="px-3 py-2 bg-brand-primary text-white rounded text-sm font-bold hover:bg-brand-primary/80"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => { setIsCreatingCategory(false); setNewCategoryName(''); }}
                          className="px-2 py-2 bg-gray-700 text-gray-300 rounded"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Financial Fields - available in BOTH add and edit mode */}

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">UoM</label>
                      <input
                        type="text"
                        value={formData.uom ?? ''}
                        onChange={e => {
                          const updated = { ...formData, uom: e.target.value.toUpperCase() };
                          setFormData(updated);
                          autoSave(updated);
                        }}
                        className="w-full bg-gray-800 border border-gray-700 p-2 rounded text-white text-sm font-mono"
                        placeholder="EA"
                        maxLength={10}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Unit Cost</label>
                      <input
                        type="number"
                        value={formData.unit_cost ?? 0}
                        onChange={e => {
                          const updated = { ...formData, unit_cost: parseFloat(e.target.value) || 0 };
                          setFormData(updated);
                          autoSave(updated);
                        }}
                        className="w-full bg-gray-800 border border-gray-700 p-2 rounded text-white text-sm font-mono"
                        min="0"
                        step="0.01"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Quantity</label>
                      <input
                        type="number"
                        value={formData.quantity ?? 1}
                        onChange={e => {
                          const updated = { ...formData, quantity: parseFloat(e.target.value) || 1 };
                          setFormData(updated);
                          autoSave(updated);
                        }}
                        className="w-full bg-gray-800 border border-gray-700 p-2 rounded text-white text-sm font-mono"
                        min="1"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Days</label>
                      <input
                        type="number"
                        value={formData.days ?? 1}
                        onChange={e => {
                          const updated = { ...formData, days: parseFloat(e.target.value) || 1 };
                          setFormData(updated);
                          autoSave(updated);
                        }}
                        className="w-full bg-gray-800 border border-gray-700 p-2 rounded text-white text-sm font-mono"
                        min="1"
                      />
                    </div>
                  </div>

                  {/* Custom Metadata Editor */}
                  <div className="pt-2 border-t border-gray-800">
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-[10px] font-bold text-gray-500 uppercase">Custom Technical Attributes</label>
                      <button
                        onClick={addMetadataRow}
                        className="text-[9px] bg-brand-primary/20 text-brand-primary px-2 py-0.5 rounded hover:bg-brand-primary/30 transition flex items-center"
                      >
                        <Plus className="w-3 h-3 mr-1" /> Add Attribute
                      </button>
                    </div>

                    {formData.metadata.length === 0 && (
                      <p className="text-[9px] text-gray-600 italic mb-2">No custom attributes defined.</p>
                    )}

                    <div className="space-y-2 mb-3 max-h-[120px] overflow-y-auto pr-1 custom-scrollbar">
                      {formData.metadata.map((row, idx) => (
                        <div key={idx} className="flex gap-1 items-start">
                          <input
                            placeholder="Key"
                            className="w-1/3 bg-gray-900 border border-gray-700 p-1.5 rounded text-[10px] text-white font-mono"
                            value={row.key}
                            onChange={e => updateMetadataRow(idx, 'key', e.target.value)}
                          />
                          <input
                            placeholder="Value"
                            className="flex-grow bg-gray-900 border border-gray-700 p-1.5 rounded text-[10px] text-white"
                            value={row.value}
                            onChange={e => updateMetadataRow(idx, 'value', e.target.value)}
                          />
                          <button
                            onClick={() => removeMetadataRow(idx)}
                            className="p-1.5 text-red-500 hover:bg-red-900/20 rounded transition"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="p-2 bg-brand-primary/10 border border-brand-primary/30 rounded text-center">
                    <p className="text-[10px] text-gray-400 uppercase font-bold">Auto-Computed Total ({userCurrency.code})</p>
                    <p className="text-xl font-black text-brand-primary">{convertToDisplay(formData.total, projectCurrencyMap[formData.projectId || selectedProjectId] || 'NGN')}</p>
                    <p className="text-[9px] text-gray-500 mt-0.5">unit cost × quantity × days</p>
                  </div>

                  <div className="flex space-x-2 pt-2">
                    <button
                      onClick={saveAction}
                      disabled={loading}
                      className="flex-grow flex items-center justify-center py-2 bg-brand-primary text-white rounded font-bold hover:bg-brand-primary/80 transition"
                    >
                      <Save className="w-4 h-4 mr-2" /> Save
                    </button>
                    <button
                      onClick={() => setActionNode(null)}
                      className="px-4 py-2 bg-gray-700 text-gray-300 rounded font-bold hover:bg-gray-600 transition"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </Card>
            ) : (
              <Card title="WBS Controls" borderTopColor="alert">
                <div className="space-y-4">
                  <p className="text-sm text-gray-400">Select an item in the tree to edit or add children.</p>
                  {canManage && (
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => handleAction('add')}
                        className="w-full flex items-center justify-center p-3 border-2 border-dashed border-gray-700 rounded-lg text-brand-primary hover:border-brand-primary hover:bg-brand-primary/5 transition"
                      >
                        <Plus className="w-5 h-5 mr-2" /> Add Top-Level Node
                      </button>
                      <button
                        onClick={() => setIsCategoryModalOpen(true)}
                        className="w-full flex items-center justify-center p-3 border-2 border-dashed border-gray-700 rounded-lg text-gray-400 hover:border-brand-primary hover:bg-brand-primary/5 transition"
                      >
                        <Tag className="w-5 h-5 mr-2" /> Manage Categories
                      </button>
                    </div>
                  )}
                  {canManage && selectedProjectId !== 'all' && (
                    <button
                      onClick={() => setIsTemplateModalOpen(true)}
                      className="w-full flex items-center justify-center p-3 border-2 border-dashed border-gray-700 rounded-lg text-brand-secondary hover:border-brand-secondary hover:bg-brand-secondary/5 transition"
                    >
                      <Database className="w-5 h-5 mr-2" /> Apply Template
                    </button>
                  )}
                  {canManage && selectedProjectId !== 'all' && (
                    <button
                      onClick={() => setIsImportModalOpen(true)}
                      className="w-full flex items-center justify-center p-3 border-2 border-dashed border-gray-700 rounded-lg text-gray-400 hover:border-brand-primary hover:bg-brand-primary/5 transition"
                    >
                      <Upload className="w-5 h-5 mr-2" /> Bulk Import CSV
                    </button>
                  )}
                  <div className="p-4 bg-yellow-900/20 border border-yellow-700/50 rounded-lg">
                    <p className="text-xs text-yellow-300 flex items-start">
                      <AlertTriangle className="w-4 h-4 mr-2 flex-shrink-0" />
                      Deleting a node recursively deletes ALL sub-items. This action is irreversible.
                    </p>
                  </div>

                  {/* Status Legend */}
                  <div className="space-y-2 pt-2">
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Status Legend</p>
                    {Object.entries(STATUS_CONFIG).map(([key, cfg]) => {
                      const Icon = cfg.icon;
                      return (
                        <div key={key} className={`flex items-center gap-2 text-xs ${cfg.color}`}>
                          <Icon className="w-3.5 h-3.5" /> {cfg.label}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </Card>
            )}
          </div>
        </div>
      </PageContainer>

      <WBSApplyTemplateModal
        isOpen={isTemplateModalOpen}
        onClose={() => setIsTemplateModalOpen(false)}
        projectId={selectedProjectId}
        onSuccess={() => {
          toast.success('Template applied successfully');
          fetchData();
        }}
      />

      <WBSImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        projectId={selectedProjectId === 'all' ? (projects[0]?.project_id || '') : selectedProjectId}
        onSuccess={fetchData}
      />

      <WbsCategoryModal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        onSuccess={() => {
          // Re-fetch categories
          api.get<WBSCategory[]>('/wbs/categories').then(res => setCategories(res.data));
        }}
      />

      {/* PDF Preview Modal Integration */}
      {isPreviewOpen && (
        <PdfPreviewModal
          isOpen={true}
          onClose={() => {
            setIsPreviewOpen(false);
            setPreviewData(null);
          }}
          pdfBlob={previewData?.blob || null}
          title={previewData?.title || 'Report Preview'}
          onDownload={() => {
            if (previewData) {
              downloadBlob(previewData.blob, previewData.filename);
            }
          }}
        />
      )}
    </>
  );
};

export default WBSManagerPage;
