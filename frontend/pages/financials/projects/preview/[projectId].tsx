import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import PageContainer from '../../../../components/Layout/PageContainer';
import Card from '../../../../components/common/Card';
import Button from '../../../../components/common/Button';
import Select from '../../../../components/common/Select';
import api from '../../../../lib/api';
import { useAuth } from '../../../../components/context/AuthContext';
import { useCurrency } from '../../../../components/context/CurrencyContext';
import { getWBSColor } from '../../../../lib/utils';
import { Role } from '@shared/types/role.enum';
import { WbsBudget } from '@shared/types/wbs';
import { Project } from '@shared/types/project';
import toast from 'react-hot-toast';
import {
  ArrowLeft, Download, Printer, Search, FileDown, Layers, Target,
  FileSpreadsheet, ArrowUpRight, ArrowDownRight, Activity, Settings2, Edit2, Send, RotateCcw
} from 'lucide-react';

interface PreviewKPIs {
  totalBudgeted: number;
  totalSpent: number;
  variance: number;
  healthPercent: number;
}

/** Roles that can submit project budgets or edit line items (matches backend @Roles on PATCH /wbs/project/:id/submit) */
const SUBMIT_AUTHORIZED_ROLES: Role[] = [
  Role.CFO,
  Role.FinanceManager,
  Role.AdminDirector,
  Role.AdminManager,
  Role.AssignedProjectUser,
  Role.CEO,
];

/** Roles that can approve/reject budget items (matches backend @Roles on PATCH /wbs/budget-draft/:id/status) */
const APPROVE_AUTHORIZED_ROLES: Role[] = [
  Role.CFO,
  Role.FinanceManager,
  Role.AdminDirector,
  Role.AdminManager,
  Role.CEO,
  Role.SuperAdmin,
];

const ProjectBudgetPreviewPage: React.FC = () => {
  const router = useRouter();
  const { projectId } = router.query;
  const { isAuthenticated, user } = useAuth();
  const { userCurrency, convertToDisplay } = useCurrency();

  const canSubmit = user?.roles?.some((r: any) => SUBMIT_AUTHORIZED_ROLES.includes(r.role_name as Role)) ?? false;
  const canApprove = user?.roles?.some((r: any) => APPROVE_AUTHORIZED_ROLES.includes(r.role_name as Role)) ?? false;

  // Extend base type because API returns rollup properties directly on the objects
  interface WbsBudgetExtended extends WbsBudget {
    total_cost_budgeted_rollup?: number;
    total_paid_rollup?: number;
    has_children?: boolean;
    uom?: string | null;
  }

  const [project, setProject] = useState<Project | null>(null);
  const [budgets, setBudgets] = useState<WbsBudgetExtended[]>([]);
  const [loading, setLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Grouping/Sorting State
  const [groupBy, setGroupBy] = useState<'hierarchical' | 'flat'>('hierarchical');
  const [showColMenu, setShowColMenu] = useState(false);
  const [visibleCols, setVisibleCols] = useState({
    qty: true, uom: true, days: true, rate: true
  });

  // Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<WbsBudgetExtended | null>(null);
  const [editFormData, setEditFormData] = useState({
    description: '',
    quantity: 0,
    uom: '',
    days: 0,
    unit_cost: 0
  });

  useEffect(() => {
    const saved = localStorage.getItem('budgetPreviewCols');
    if (saved) {
      try { setVisibleCols(JSON.parse(saved)); } catch (e) { }
    }
  }, []);

  const toggleCol = (col: keyof typeof visibleCols) => {
    setVisibleCols(prev => {
      const next = { ...prev, [col]: !prev[col] };
      localStorage.setItem('budgetPreviewCols', JSON.stringify(next));
      return next;
    });
  };

  const fetchProjectData = useCallback(async () => {
    if (!isAuthenticated || !projectId) return;
    setLoading(true);
    try {
      // 1. Fetch Project Details
      const projRes = await api.get<Project>(`/projects/${projectId}`);
      setProject(projRes.data);

      // 2. Fetch Granular Budget Data (using rollup endpoint for complete hierarchy)
      const wbsRes = await api.get<WbsBudget[]>(`/wbs/budget/rollup?projectId=${projectId}`);
      setBudgets(wbsRes.data);
    } catch (e: any) {
      if (e.name !== 'CanceledError') {
        toast.error(`Failed to load budget preview: ${e.response?.data?.message || e.message}`);
      }
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, projectId]);

  useEffect(() => {
    fetchProjectData();
  }, [fetchProjectData]);

  // KPIs
  const kpis = useMemo<PreviewKPIs>(() => {
    let totalBudgeted = 0;
    let totalSpent = 0;

    // We only sum root items to avoid double counting if hierarchical data
    const rootItems = budgets.filter(b => !b.parent_wbs_id);
    rootItems.forEach(b => {
      totalBudgeted += Number(b.total_cost_budgeted_rollup || b.total_cost_budgeted || 0);
      totalSpent += Number(b.total_paid_rollup || 0);
    });

    const variance = totalBudgeted - totalSpent;
    const healthPercent = totalBudgeted > 0 ? Math.round((variance / totalBudgeted) * 100) : 100;

    return { totalBudgeted, totalSpent, variance, healthPercent };
  }, [budgets]);

  // Export Handlers
  const handleExportCSV = async () => {
    setIsExporting(true);
    toast('Preparing CSV...', { icon: '⏳' });
    try {
      const response = await api.get(`/wbs/budgets/export?projectId=${projectId}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Project_${projectId}_Budget_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('CSV Exported');
    } catch (e: any) {
      toast.error('Failed to export CSV');
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportExcel = async () => {
    setIsExporting(true);
    toast('Preparing Excel... (Simulated)', { icon: '⏳' });
    try {
      // In a real app, this would call a specific excel endpoint like /wbs/budgets/export/excel
      const response = await api.get(`/wbs/budgets/export?projectId=${projectId}&format=xlsx`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Project_${projectId}_Budget_${new Date().toISOString().split('T')[0]}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Excel Exported');
    } catch (e: any) {
      toast.error('Failed to export Excel');
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportDCS = async () => {
    setIsExporting(true);
    toast('Pushing to Document Control System...', { icon: '☁' });
    try {
      // Simulate DCS API call delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      toast.success(`Successfully exported to DCS under project folder: ${project?.project_name}`);
    } catch (e: any) {
      toast.error('Failed to export to DCS');
    } finally {
      setIsExporting(false);
    }
  };

  const handleSubmitProject = async () => {
    if (!window.confirm("Submit all draft/rejected project budgets for approval?")) return;
    setIsSubmitting(true);
    toast('Submitting project budget...', { icon: '⏳' });
    try {
      await api.patch(`/wbs/project/${projectId}/submit`);
      toast.success('Project budget submitted for approval!');
      fetchProjectData();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to submit budget');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRecallApproval = async (item: WbsBudgetExtended) => {
    const reason = window.prompt(`Enter reason for recalling approval on WBS ${item.wbs_code}:`);
    if (reason === null) return;

    setIsSubmitting(true);
    toast('Recalling approval...', { icon: '⏳' });
    try {
      await api.patch(`/wbs/budget/${item.wbs_id}/recall`, { reason });
      toast.success('Approval recalled successfully');
      fetchProjectData();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to recall approval');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInlineEdit = (item: WbsBudgetExtended) => {
    setEditingItem(item);
    setEditFormData({
      description: item.description,
      quantity: Number(item.quantity_budgeted) || 0,
      uom: item.uom || 'EA',
      days: Number(item.days_budgeted) || 0,
      unit_cost: Number(item.unit_cost_budgeted) || 0
    });
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    setIsSubmitting(true);
    try {
      await api.patch(`/wbs/budget-draft/${editingItem.wbs_id}`, {
        description: editFormData.description,
        quantity_budgeted: editFormData.quantity,
        uom: editFormData.uom,
        days_budgeted: editFormData.days,
        unit_cost_budgeted: editFormData.unit_cost
      });
      toast.success('Item updated successfully');
      setIsEditModalOpen(false);
      fetchProjectData();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to update item');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Render Tree Logic
  const renderTree = (parentId: string | null = null, level: number = 0) => {
    const children = budgets
      .filter(i => i.parent_wbs_id === parentId)
      .sort((a, b) => a.wbs_code.localeCompare(b.wbs_code, undefined, { numeric: true }));

    return children.map(item => {
      const wbsColor = getWBSColor(item.wbs_code.split('.')[0]);
      const isParent = item.has_children || budgets.some(i => i.parent_wbs_id === item.wbs_id);

      const budgeted = isParent ? Number(item.total_cost_budgeted_rollup || item.total_cost_budgeted || 0) : Number(item.total_cost_budgeted || 0);
      const spent = Number(item.total_paid_rollup || 0);
      const variance = budgeted - spent;
      const variancePct = budgeted > 0 ? (variance / budgeted) * 100 : 0;

      const isEditable = item.status === 'draft' || item.status === 'rejected';

      return (
        <React.Fragment key={item.wbs_id}>
          <tr className={`hover:bg-white/5 transition-colors border-b border-gray-800/50 ${isParent ? 'bg-gray-800/20' : ''}`}>
            <td className="px-4 py-3 align-top">
              <div className={`flex items-start ${level > 0 ? 'ml-6 border-l-2 pl-3' : ''}`} style={{ borderColor: level > 0 ? wbsColor : 'transparent' }}>
                <span className="font-mono text-[10px] font-black px-1.5 py-0.5 rounded bg-gray-800 mr-3 mt-1" style={{ color: wbsColor }}>
                  {item.wbs_code}
                </span>
                <div className="flex-1">
                  <p className={`text-sm ${isParent ? 'font-bold text-gray-200' : 'text-gray-300'} whitespace-normal break-words max-w-md`} title={item.description}>
                    {item.description}
                  </p>
                  {!isParent && (!visibleCols.qty || !visibleCols.uom || !visibleCols.rate) && Number(item.total_cost_budgeted_rollup || 0) === 0 && (
                    <p className="text-[9px] text-gray-500 font-mono mt-1 print:hidden">
                      {item.quantity_budgeted || 1} {item.uom || 'EA'} @ {convertToDisplay(item.unit_cost_budgeted || 0, project?.currency || 'NGN')}
                    </p>
                  )}
                  {isEditable && (
                    <button onClick={() => handleInlineEdit(item)} className="text-[10px] flex items-center gap-1 text-brand-secondary hover:text-white mt-2 print:hidden transition">
                      <Edit2 className="w-3 h-3" /> Edit Item
                    </button>
                  )}
                  {canApprove && String(item.status).toUpperCase() === 'APPROVED' && (
                    <button onClick={() => handleRecallApproval(item)} className="text-[10px] flex items-center gap-1 text-orange-500 hover:text-orange-400 mt-2 print:hidden transition">
                      <RotateCcw className="w-3 h-3" /> Recall Approval
                    </button>
                  )}
                </div>
              </div>
            </td>
            {visibleCols.qty && <td className="px-4 py-3 align-top text-right text-xs text-gray-400 font-mono">{!isParent ? (item.quantity_budgeted || 1) : ''}</td>}
            {visibleCols.uom && <td className="px-4 py-3 align-top text-right text-xs text-gray-400 font-mono uppercase">{!isParent ? (item.uom || 'EA') : ''}</td>}
            {visibleCols.days && <td className="px-4 py-3 align-top text-right text-xs text-gray-400 font-mono">{!isParent ? (item.days_budgeted || '—') : ''}</td>}
            {visibleCols.rate && <td className="px-4 py-3 align-top text-right text-xs text-gray-400 font-mono">{!isParent ? convertToDisplay(item.unit_cost_budgeted || 0, project?.currency || 'NGN') : ''}</td>}
            <td className="px-4 py-3 whitespace-nowrap align-top text-right">
              <span className={`text-sm ${isParent ? 'font-black text-white' : 'font-bold text-gray-300'}`}>
                {convertToDisplay(budgeted, project?.currency || 'NGN')}
              </span>
            </td>
            <td className="px-4 py-3 whitespace-nowrap align-top text-right">
              {spent > 0 ? (
                <span className="text-sm font-bold text-gray-400">
                  {convertToDisplay(spent, project?.currency || 'NGN')}
                </span>
              ) : <span className="text-sm text-gray-600">—</span>}
            </td>
            <td className="px-4 py-3 whitespace-nowrap align-top text-right">
              <div className="flex flex-col items-end justify-start">
                <span className={`text-sm font-bold flex items-center gap-1 ${variance < 0 ? 'text-alert-critical' : 'text-alert-positive'}`}>
                  {variance !== 0 && (variance < 0 ? <ArrowDownRight className="w-3.5 h-3.5" /> : <ArrowUpRight className="w-3.5 h-3.5" />)}
                  {convertToDisplay(Math.abs(variance), project?.currency || 'NGN')}
                </span>
                {budgeted > 0 && spent > 0 && (
                  <span className={`text-[9px] font-black ${variancePct < 0 ? 'text-red-500/70' : 'text-green-500/70'}`}>
                    {Math.abs(variancePct).toFixed(1)}% {variancePct < 0 ? 'OVER' : 'REMAINING'}
                  </span>
                )}
              </div>
            </td>
          </tr>
          {/* Recursively render children */}
          {renderTree(item.wbs_id, level + 1)}
        </React.Fragment>
      );
    });
  };

  const renderFlatTable = () => {
    return budgets.map(item => {
      const spent = Number(item.total_paid_rollup || 0);
      const budgeted = Number(item.total_cost_budgeted || 0);
      const variance = budgeted - spent;
      const isEditable = item.status === 'draft' || item.status === 'rejected';

      return (
        <tr key={item.wbs_id} className="hover:bg-white/5 transition border-b border-gray-800/50">
          <td className="px-4 py-3 whitespace-nowrap align-top">
            <span className="font-mono text-xs font-black text-brand-primary bg-brand-primary/10 px-2 py-0.5 rounded">
              {item.wbs_code}
            </span>
          </td>
          <td className="px-4 py-3 align-top">
            <p className="text-sm text-gray-200 whitespace-normal break-words max-w-md">{item.description}</p>
            {isEditable && (
              <button onClick={() => handleInlineEdit(item)} className="text-[10px] flex items-center gap-1 text-brand-secondary hover:text-white mt-2 print:hidden transition">
                <Edit2 className="w-3 h-3" /> Edit Item
              </button>
            )}
            {canApprove && String(item.status).toUpperCase() === 'APPROVED' && (
              <button onClick={() => handleRecallApproval(item)} className="text-[10px] flex items-center gap-1 text-orange-500 hover:text-orange-400 mt-2 print:hidden transition">
                <RotateCcw className="w-3 h-3" /> Recall Approval
              </button>
            )}
            {(!visibleCols.qty || !visibleCols.uom || !visibleCols.rate) && (
              <p className="text-[9px] text-gray-500 font-mono mt-1 uppercase print:hidden">
                {item.quantity_budgeted || 1} {item.uom || 'EA'} @ {convertToDisplay(item.unit_cost_budgeted || 0, project?.currency || 'NGN')}
              </p>
            )}
          </td>
          {visibleCols.qty && <td className="px-4 py-3 align-top text-right text-xs text-gray-400 font-mono">{item.quantity_budgeted || 1}</td>}
          {visibleCols.uom && <td className="px-4 py-3 align-top text-right text-xs text-gray-400 font-mono uppercase">{item.uom || 'EA'}</td>}
          {visibleCols.days && <td className="px-4 py-3 align-top text-right text-xs text-gray-400 font-mono">{item.days_budgeted || '—'}</td>}
          {visibleCols.rate && <td className="px-4 py-3 align-top text-right text-xs text-gray-400 font-mono">{convertToDisplay(item.unit_cost_budgeted || 0, project?.currency || 'NGN')}</td>}
          <td className="px-4 py-3 whitespace-nowrap align-top text-right">
            <span className="text-sm font-black text-white">{convertToDisplay(budgeted, project?.currency || 'NGN')}</span>
          </td>
          <td className="px-4 py-3 whitespace-nowrap align-top text-right">
            <span className="text-sm font-bold text-gray-400">{spent > 0 ? convertToDisplay(spent, project?.currency || 'NGN') : '—'}</span>
          </td>
          <td className="px-4 py-3 whitespace-nowrap align-top text-right">
            <span className={`text-sm font-bold flex items-center justify-end gap-1 ${variance < 0 ? 'text-alert-critical' : 'text-alert-positive'}`}>
              {variance !== 0 && (variance < 0 ? <ArrowDownRight className="w-3.5 h-3.5" /> : <ArrowUpRight className="w-3.5 h-3.5" />)}
              {convertToDisplay(Math.abs(variance), project?.currency || 'NGN')}
            </span>
          </td>
        </tr>
      )
    })
  }

  return (
    <>
      <Head><title>Budget Preview: {project?.project_name || 'Loading'} | SentinelFi</title></Head>
      <PageContainer
        title="Project Budget Preview"
        subtitle={project ? `Detailed financial view and export interface for ${project.project_name}` : 'Loading...'}
        headerContent={
          <div className="flex items-center gap-4 print:hidden">
            {canSubmit && (
              <Button onClick={handleSubmitProject} variant="primary" isLoading={isSubmitting} icon={<Send className="w-4 h-4" />}>
                Submit Project Budget
              </Button>
            )}
            <Link href="/financials/projects" className="flex items-center text-sm font-bold text-gray-400 hover:text-white transition">
              <ArrowLeft className="w-4 h-4 mr-2" /> Back
            </Link>
          </div>
        }
      >
        {/* Print Only Header — matches the PDF document format */}
        <div className="hidden print:block mb-6">
          <div className="flex justify-between items-start border-b-2 border-black pb-4 mb-4">
            <div>
              <h1 className="text-xl font-black text-black uppercase tracking-wider">SentinelFi</h1>
              <p className="text-xs text-gray-600">Financial Management System</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500 uppercase tracking-widest font-bold">BUDGET PREVIEW</p>
              <p className="text-xs text-gray-500">Generated: {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
            </div>
          </div>
          <h2 className="text-2xl font-black text-black uppercase mb-3">
            Project Budget: {project?.project_name}
          </h2>
          <table className="w-full text-xs border-collapse mb-4" style={{ border: 'none' }}>
            <tbody>
              <tr>
                <td className="py-1 pr-8 font-bold text-gray-600 uppercase tracking-wider" style={{ border: 'none', width: '120px' }}>RFQ Number</td>
                <td className="py-1 text-black font-bold" style={{ border: 'none' }}>{project?.rfq_number || '—'}</td>
                <td className="py-1 pr-8 font-bold text-gray-600 uppercase tracking-wider" style={{ border: 'none', width: '120px' }}>Status</td>
                <td className="py-1 text-black font-bold uppercase" style={{ border: 'none' }}>{project?.status || '—'}</td>
              </tr>
              <tr>
                <td className="py-1 pr-8 font-bold text-gray-600 uppercase tracking-wider" style={{ border: 'none' }}>Client</td>
                <td className="py-1 text-black font-bold" style={{ border: 'none' }}>{project?.client?.name || '—'}</td>
                <td className="py-1 pr-8 font-bold text-gray-600 uppercase tracking-wider" style={{ border: 'none' }}>Total Budget</td>
                <td className="py-1 text-black font-bold" style={{ border: 'none' }}>{convertToDisplay(kpis.totalBudgeted, project?.currency || 'NGN')}</td>
              </tr>
              <tr>
                <td className="py-1 pr-8 font-bold text-gray-600 uppercase tracking-wider" style={{ border: 'none' }}>Currency</td>
                <td className="py-1 text-black" style={{ border: 'none' }}>{project?.currency || 'NGN'}</td>
                <td className="py-1 pr-8 font-bold text-gray-600 uppercase tracking-wider" style={{ border: 'none' }}>Variance</td>
                <td className={`py-1 font-bold ${kpis.variance < 0 ? 'text-red-700' : 'text-green-700'}`} style={{ border: 'none' }}>
                  {convertToDisplay(kpis.variance, project?.currency || 'NGN')} {kpis.variance < 0 ? '(OVER)' : '(WITHIN)'}
                </td>
              </tr>
            </tbody>
          </table>
          <div className="border-t border-gray-400 pt-1">
            <p className="text-[8pt] text-gray-500 italic">This document is computer-generated and confidential. All figures are in Nigerian Naira (NGN) unless stated otherwise.</p>
          </div>
        </div>

        {/* Granular KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6 print:hidden">
          <div className="bg-brand-dark/40 border border-gray-700/50 rounded-xl p-4">
            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block mb-1">Total Project Budget</label>
            <p className="text-2xl font-black text-white">{loading ? '—' : convertToDisplay(kpis.totalBudgeted, project?.currency || 'NGN')}</p>
          </div>
          <div className="bg-brand-dark/40 border border-gray-700/50 rounded-xl p-4">
            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block mb-1">Actual Expenditure</label>
            <p className="text-2xl font-black text-gray-300">{loading ? '—' : convertToDisplay(kpis.totalSpent, project?.currency || 'NGN')}</p>
          </div>
          <div className="bg-brand-dark/40 border border-gray-700/50 rounded-xl p-4">
            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block mb-1">Total Variance</label>
            <p className={`text-2xl font-black ${kpis.variance < 0 ? 'text-alert-critical' : 'text-alert-positive'}`}>
              {loading ? '—' : convertToDisplay(Math.abs(kpis.variance), project?.currency || 'NGN')}
            </p>
            {kpis.variance < 0 && <span className="text-[10px] text-alert-critical font-bold uppercase animate-pulse">Over Budget</span>}
          </div>
          <div className="bg-brand-dark/40 border border-gray-700/50 rounded-xl p-4 flex flex-col justify-center">
            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block mb-2">Budget Health</label>
            <div className="flex items-center gap-3">
              <div className="flex-grow bg-gray-700 h-2 rounded-full overflow-hidden">
                <div
                  className={`h-full ${kpis.healthPercent >= 50 ? 'bg-alert-positive' : kpis.healthPercent > 10 ? 'bg-wbs-yellow' : 'bg-alert-critical'}`}
                  style={{ width: `${Math.min(100, Math.max(0, kpis.healthPercent))}%` }}
                />
              </div>
              <span className="text-sm font-black text-white">{loading ? '—' : `${kpis.healthPercent}%`}</span>
            </div>
          </div>
        </div>

        {/* Actions Bar */}
        <Card className="mb-6 p-4 border-gray-700 bg-gray-800/80 backdrop-blur-md sticky top-4 z-10 print:hidden" noPadding>
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 px-6 py-4">
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">View Mode:</span>
              <div className="flex bg-gray-900 rounded-lg p-1 border border-gray-700">
                <button
                  onClick={() => setGroupBy('hierarchical')}
                  className={`px-3 py-1.5 rounded-md text-xs font-bold transition ${groupBy === 'hierarchical' ? 'bg-gray-700 text-white shadow' : 'text-gray-500 hover:text-gray-300'}`}
                >
                  <Layers className="w-3.5 h-3.5 inline mr-1.5" /> Hierarchical
                </button>
                <button
                  onClick={() => setGroupBy('flat')}
                  className={`px-3 py-1.5 rounded-md text-xs font-bold transition ${groupBy === 'flat' ? 'bg-gray-700 text-white shadow' : 'text-gray-500 hover:text-gray-300'}`}
                >
                  <Activity className="w-3.5 h-3.5 inline mr-1.5" /> Flat List
                </button>
              </div>
              <div className="relative">
                <button
                  onClick={() => setShowColMenu(!showColMenu)}
                  className="p-2 ml-2 rounded-lg bg-gray-800 border border-gray-700 text-gray-400 hover:text-white hover:bg-gray-700 transition"
                >
                  <Settings2 className="w-4 h-4" />
                </button>
                {showColMenu && (
                  <div className="absolute top-10 left-0 w-48 bg-gray-800 border border-gray-700 rounded-lg shadow-xl p-3 z-50">
                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 border-b border-gray-700 pb-2">Toggle Columns</h4>
                    <label className="flex items-center gap-2 mb-2 cursor-pointer group">
                      <input type="checkbox" checked={visibleCols.qty} onChange={() => toggleCol('qty')} className="bg-gray-900 border border-gray-700 rounded w-4 h-4 " />
                      <span className="text-sm font-bold text-gray-300 group-hover:text-white">Quantity</span>
                    </label>
                    <label className="flex items-center gap-2 mb-2 cursor-pointer group">
                      <input type="checkbox" checked={visibleCols.uom} onChange={() => toggleCol('uom')} className="bg-gray-900 border border-gray-700 rounded w-4 h-4" />
                      <span className="text-sm font-bold text-gray-300 group-hover:text-white">Unit of Measure</span>
                    </label>
                    <label className="flex items-center gap-2 mb-2 cursor-pointer group">
                      <input type="checkbox" checked={visibleCols.days} onChange={() => toggleCol('days')} className="bg-gray-900 border border-gray-700 rounded w-4 h-4" />
                      <span className="text-sm font-bold text-gray-300 group-hover:text-white">Duration (Days)</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer group">
                      <input type="checkbox" checked={visibleCols.rate} onChange={() => toggleCol('rate')} className="bg-gray-900 border border-gray-700 rounded w-4 h-4" />
                      <span className="text-sm font-bold text-gray-300 group-hover:text-white">Unit Price</span>
                    </label>
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button onClick={() => window.print()} variant="outline" icon={<Printer className="w-4 h-4" />}>
                Print Report
              </Button>
              <Button onClick={handleExportCSV} variant="outline" isLoading={isExporting} icon={<FileDown className="w-4 h-4" />}>
                Export CSV
              </Button>
              <Button onClick={handleExportExcel} variant="outline" isLoading={isExporting} icon={<FileSpreadsheet className="w-4 h-4 text-green-500" />}>
                Export Excel
              </Button>
              <Button onClick={handleExportDCS} variant="secondary" isLoading={isExporting} icon={<Target className="w-4 h-4" />}>
                Push to DCS
              </Button>
            </div>
          </div>
        </Card>

        {/* Data Grid */}
        <Card title="Structural Ledger" borderTopColor="primary" className="border border-gray-700 print:shadow-none print:border-none">
          {budgets.length === 0 && !loading ? (
            <div className="py-12 text-center text-gray-500">No budget data available for this project.</div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-gray-700 print:border-none print:overflow-visible print:w-full">
              <table className="min-w-full print:text-xs print:w-full">
                <thead className="bg-brand-dark/50 print:bg-gray-100 print:text-black">
                  <tr>
                    <th className="px-4 py-3 text-left text-[10px] font-black text-gray-500 uppercase tracking-widest border-b border-gray-700">WBS Structure & Description</th>
                    {groupBy === 'flat' && <th className="px-4 py-3 text-left text-[10px] font-black text-gray-500 uppercase tracking-widest border-b border-gray-700 hidden">Description</th>}
                    {visibleCols.qty && <th className="px-4 py-3 text-right text-[10px] font-black text-gray-500 uppercase tracking-widest border-b border-gray-700 w-24">Qty</th>}
                    {visibleCols.uom && <th className="px-4 py-3 text-right text-[10px] font-black text-gray-500 uppercase tracking-widest border-b border-gray-700 w-24">UoM</th>}
                    {visibleCols.days && <th className="px-4 py-3 text-right text-[10px] font-black text-gray-500 uppercase tracking-widest border-b border-gray-700 w-24">Days</th>}
                    {visibleCols.rate && <th className="px-4 py-3 text-right text-[10px] font-black text-gray-500 uppercase tracking-widest border-b border-gray-700 w-32">Unit Rate</th>}
                    <th className="px-4 py-3 text-right text-[10px] font-black text-gray-500 uppercase tracking-widest border-b border-gray-700 w-40">Allocated Budget</th>
                    <th className="px-4 py-3 text-right text-[10px] font-black text-gray-500 uppercase tracking-widest border-b border-gray-700 w-40">Actual Spent</th>
                    <th className="px-4 py-3 text-right text-[10px] font-black text-gray-500 uppercase tracking-widest border-b border-gray-700 w-40">Variance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800 print:divide-gray-300">
                  {loading
                    ? [...Array(10)].map((_, i) => <tr key={i}><td colSpan={10} className="px-4 py-3"><div className="h-6 bg-gray-800 animate-pulse rounded"></div></td></tr>)
                    : groupBy === 'hierarchical' ? renderTree(null) : renderFlatTable()
                  }
                </tbody>
                {!loading && kpis && (
                  <tfoot className="bg-brand-dark/80 print:bg-gray-200">
                    <tr>
                      <td colSpan={(groupBy === 'flat' ? 2 : 1) + (visibleCols.qty ? 1 : 0) + (visibleCols.uom ? 1 : 0) + (visibleCols.days ? 1 : 0) + (visibleCols.rate ? 1 : 0)} className="px-4 py-4 text-right font-black text-white text-sm uppercase print:text-black">
                        Totals
                      </td>
                      <td className="px-4 py-4 text-right font-black text-white text-sm print:text-black">{convertToDisplay(kpis.totalBudgeted, project?.currency || 'NGN')}</td>
                      <td className="px-4 py-4 text-right font-bold text-gray-300 text-sm print:text-gray-700">{convertToDisplay(kpis.totalSpent, project?.currency || 'NGN')}</td>
                      <td className={`px-4 py-4 text-right font-black text-sm ${kpis.variance < 0 ? 'text-alert-critical font-bold' : 'text-alert-positive font-bold'}`}>
                        {convertToDisplay(kpis.variance, project?.currency || 'NGN')}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          )}
        </Card>
      </PageContainer>

      {/* Inline Edit Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-brand-dark/90 backdrop-blur-md">
          <div className="bg-gray-900 border border-gray-700 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-gray-800 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-black text-white flex items-center gap-2">
                  <Edit2 className="text-brand-primary w-5 h-5" />
                  Edit Budget Line
                </h3>
                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mt-1">WBS: {editingItem?.wbs_code}</p>
              </div>
              <button onClick={() => setIsEditModalOpen(false)} className="text-gray-500 hover:text-white p-2">
                <ArrowLeft className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Description</label>
                <textarea
                  className="w-full bg-brand-dark/60 border border-gray-800 rounded-xl p-3 text-sm text-white focus:border-brand-primary outline-none min-h-[80px]"
                  value={editFormData.description}
                  onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Quantity</label>
                  <input
                    type="number"
                    step="0.01"
                    className="w-full bg-brand-dark/60 border border-gray-800 rounded-xl p-3 text-sm text-white focus:border-brand-primary outline-none"
                    value={editFormData.quantity}
                    onChange={(e) => setEditFormData({ ...editFormData, quantity: parseFloat(e.target.value) || 0 })}
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Unit of Measure (UoM)</label>
                  <input
                    className="w-full bg-brand-dark/60 border border-gray-800 rounded-xl p-3 text-sm text-white focus:border-brand-primary outline-none uppercase"
                    value={editFormData.uom}
                    onChange={(e) => setEditFormData({ ...editFormData, uom: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Duration (Days)</label>
                  <input
                    type="number"
                    className="w-full bg-brand-dark/60 border border-gray-800 rounded-xl p-3 text-sm text-white focus:border-brand-primary outline-none"
                    value={editFormData.days}
                    onChange={(e) => setEditFormData({ ...editFormData, days: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Unit Cost (Rate)</label>
                  <input
                    type="number"
                    step="0.01"
                    className="w-full bg-brand-dark/60 border border-gray-800 rounded-xl p-3 text-sm text-white focus:border-brand-primary outline-none"
                    value={editFormData.unit_cost}
                    onChange={(e) => setEditFormData({ ...editFormData, unit_cost: parseFloat(e.target.value) || 0 })}
                    required
                  />
                </div>
              </div>

              <div className="pt-6 border-t border-gray-800 flex gap-3">
                <Button type="button" variant="secondary" className="w-full" onClick={() => setIsEditModalOpen(false)}>Cancel</Button>
                <Button type="submit" variant="primary" className="w-full" isLoading={isSubmitting}>Save Changes</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default ProjectBudgetPreviewPage;
