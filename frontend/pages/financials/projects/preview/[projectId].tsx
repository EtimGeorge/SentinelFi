import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import PageContainer from '../../../../components/Layout/PageContainer';
import Card from '../../../../components/common/Card';
import DataTable from "../../../../components/common/DataTable";
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
  ArrowLeft, Download, Printer, Search, FileDown, Layers, Target, FileSpreadsheet, ArrowUpRight, ArrowDownRight, Activity, Settings2, Edit2, Send, RotateCcw
} from 'lucide-react';

interface PreviewKPIs {
  totalBudgeted: number;
  totalSpent: number;
  variance: number;
  healthPercent: number;
}

/** Roles that can submit project budgets or edit line items (matches backend @Roles on PATCH /wbs/project/:id/submit) */
const SUBMIT_AUTHORIZED_ROLES: Role[] = [
  Role.CFO, Role.FinanceManager, Role.AdminDirector, Role.AdminManager, Role.AssignedProjectUser, Role.CEO,
];

/** Roles that can approve/reject budget items (matches backend @Roles on PATCH /wbs/budget-draft/:id/status) */
const APPROVE_AUTHORIZED_ROLES: Role[] = [
  Role.CFO, Role.FinanceManager, Role.AdminDirector, Role.AdminManager, Role.CEO, Role.SuperAdmin,
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
    description: '', quantity: 0, uom: '', days: 0, unit_cost: 0
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

  const sortedFlatRows = useMemo(
    () => [...budgets].sort((a, b) => a.wbs_code.localeCompare(b.wbs_code, undefined, { numeric: true })),
    [budgets],
  );

  const previewRows = useMemo(() => {
    const levels = new Map<string, number>();
    const hasChildren = new Map<string, boolean>();
    const itemById = new Map<string, WbsBudgetExtended>();
    budgets.forEach(b => itemById.set(b.wbs_id, b));
    budgets.forEach(b => { if (b.parent_wbs_id) hasChildren.set(b.parent_wbs_id, true); });
    const ordered: WbsBudgetExtended[] = [];
    const walk = (parentId: string | null, level: number) => {
      const children = budgets
        .filter(i => i.parent_wbs_id === parentId)
        .sort((a, b) => a.wbs_code.localeCompare(b.wbs_code, undefined, { numeric: true }));
      children.forEach(item => {
        levels.set(item.wbs_id, level);
        ordered.push(item);
        walk(item.wbs_id, level + 1);
      });
    };
    walk(null, 0);
    return { ordered, levels, hasChildren, itemById };
  }, [budgets]);

  // Export Handlers
  const handleExportCSV = async () => {
    setIsExporting(true);
    toast('Preparing CSV...', { icon: 'â³' });
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
    toast('Preparing Excel... (Simulated)', { icon: 'â³' });
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
    toast('Pushing to Document Control System...', { icon: 'â˜' });
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
    toast('Submitting project budget...', { icon: 'â³' });
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
    toast('Recalling approval...', { icon: 'â³' });
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
      description: item.description, quantity: Number(item.quantity_budgeted) || 0, uom: item.uom || 'EA', days: Number(item.days_budgeted) || 0, unit_cost: Number(item.unit_cost_budgeted) || 0
    });
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    setIsSubmitting(true);
    try {
      await api.patch(`/wbs/budget-draft/${editingItem.wbs_id}`, {
        description: editFormData.description, quantity_budgeted: editFormData.quantity, uom: editFormData.uom, days_budgeted: editFormData.days, unit_cost_budgeted: editFormData.unit_cost
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
  const previewColumns = useMemo(() => {
    const currency = project?.currency || 'NGN';
    return [
      {
        key: 'wbs', label: groupBy === 'flat' ? 'WBS Structure & Description' : 'WBS Structure & Description', get: (item: WbsBudgetExtended) => {
          const wbsColor = getWBSColor(item.wbs_code.split('.')[0]);
          const isParent = previewRows.hasChildren.has(item.wbs_id);
          const level = previewRows.levels.get(item.wbs_id) || 0;
          const isEditable = item.status === 'draft' || item.status === 'rejected';
          const inHier = groupBy !== 'flat';
          return (
            <div className="min-w-0">
              {inHier ? (
                <div className={`flex items-start ${level > 0 ? 'ml-6 border-l-2 pl-3' : ''}`} style={{ borderColor: level > 0 ? wbsColor : 'transparent' }}>
                  <span className="font-mono text-xs font-black px-1.5 py-0.5 rounded bg-gray-800 mr-3 mt-1" style={{ color: wbsColor }}>
                    {item.wbs_code}
                  </span>
                  <div className="flex-1">
                    <p className={`text-sm ${isParent ? 'font-bold text-gray-200' : 'text-gray-300'} whitespace-normal break-words max-w-md`} title={item.description}>
                      {item.description}
                    </p>
                    {!isParent && (!visibleCols.qty || !visibleCols.uom || !visibleCols.rate) && Number(item.total_cost_budgeted_rollup || 0) === 0 && (
                      <p className="text-xs text-gray-500 font-mono mt-1 print:hidden">
                        {item.quantity_budgeted || 1} {item.uom || 'EA'} @ {convertToDisplay(item.unit_cost_budgeted || 0, currency)}
                      </p>
                    )}
                    {isEditable && (
                      <button onClick={() => handleInlineEdit(item)} className="text-xs flex items-center gap-1 text-brand-secondary hover:text-white mt-2 print:hidden transition">
                        <Edit2 className="w-3 h-3" /> Edit Item
                      </button>
                    )}
                    {canApprove && String(item.status).toUpperCase() === 'APPROVED' && (
                      <button onClick={() => handleRecallApproval(item)} className="text-xs flex items-center gap-1 text-orange-500 hover:text-orange-400 mt-2 print:hidden transition">
                        <RotateCcw className="w-3 h-3" /> Recall Approval
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="min-w-0">
                  <span className="font-mono text-xs font-black text-brand-primary bg-brand-primary/10 px-2 py-0.5 rounded">{item.wbs_code}</span>
                  <p className="text-sm text-gray-200 whitespace-normal break-words max-w-md mt-1">{item.description}</p>
                  {isEditable && (
                    <button onClick={() => handleInlineEdit(item)} className="text-xs flex items-center gap-1 text-brand-secondary hover:text-white mt-2 print:hidden transition">
                      <Edit2 className="w-3 h-3" /> Edit Item
                    </button>
                  )}
                  {canApprove && String(item.status).toUpperCase() === 'APPROVED' && (
                    <button onClick={() => handleRecallApproval(item)} className="text-xs flex items-center gap-1 text-orange-500 hover:text-orange-400 mt-2 print:hidden transition">
                      <RotateCcw className="w-3 h-3" /> Recall Approval
                    </button>
                  )}
                  {(!visibleCols.qty || !visibleCols.uom || !visibleCols.rate) && (
                    <p className="text-xs text-gray-500 font-mono mt-1 uppercase print:hidden">
                      {item.quantity_budgeted || 1} {item.uom || 'EA'} @ {convertToDisplay(item.unit_cost_budgeted || 0, currency)}
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        }, tier: 'P0' as const, minWidth: 220,
      },
      ...(visibleCols.qty ? [{
        key: 'qty', label: 'Qty', get: (item: WbsBudgetExtended) => {
          const isParent = groupBy !== 'flat' && previewRows.hasChildren.has(item.wbs_id);
          return <span className="text-xs text-gray-400 font-mono">{!isParent ? (item.quantity_budgeted || 1) : ''}</span>;
        }, tier: 'P2' as const, cellClassName: 'text-right', minWidth: 70,
      }] : []),
      ...(visibleCols.uom ? [{
        key: 'uom', label: 'UoM', get: (item: WbsBudgetExtended) => {
          const isParent = groupBy !== 'flat' && previewRows.hasChildren.has(item.wbs_id);
          return <span className="text-xs text-gray-400 font-mono uppercase">{!isParent ? (item.uom || 'EA') : ''}</span>;
        }, tier: 'P2' as const, cellClassName: 'text-right', minWidth: 60,
      }] : []),
      ...(visibleCols.days ? [{
        key: 'days', label: 'Days', get: (item: WbsBudgetExtended) => {
          const isParent = groupBy !== 'flat' && previewRows.hasChildren.has(item.wbs_id);
          return <span className="text-xs text-gray-400 font-mono">{!isParent ? (item.days_budgeted || 'â€”') : ''}</span>;
        }, tier: 'P2' as const, cellClassName: 'text-right', minWidth: 56,
      }] : []),
      ...(visibleCols.rate ? [{
        key: 'rate', label: 'Unit Rate', get: (item: WbsBudgetExtended) => {
          const isParent = groupBy !== 'flat' && previewRows.hasChildren.has(item.wbs_id);
          return <span className="text-xs text-gray-400 font-mono">{!isParent ? convertToDisplay(item.unit_cost_budgeted || 0, currency) : ''}</span>;
        }, tier: 'P1' as const, cellClassName: 'text-right', minWidth: 100,
      }] : []),
      {
        key: 'budgeted', label: 'Allocated Budget', get: (item: WbsBudgetExtended) => {
          const isParent = previewRows.hasChildren.has(item.wbs_id);
          const val = groupBy !== 'flat' && isParent
            ? Number(item.total_cost_budgeted_rollup || item.total_cost_budgeted || 0)
            : Number(item.total_cost_budgeted || 0);
          return <span className={`text-sm ${isParent ? 'font-black text-white' : 'font-bold text-gray-300'}`}>{convertToDisplay(val, currency)}</span>;
        }, tier: 'P0' as const, cellClassName: 'text-right whitespace-nowrap', minWidth: 130,
      },
      {
        key: 'spent', label: 'Actual Spent', get: (item: WbsBudgetExtended) => {
          const spent = Number(item.total_paid_rollup || 0);
          return spent > 0
            ? <span className="text-sm font-bold text-gray-400">{convertToDisplay(spent, currency)}</span>
            : <span className="text-sm text-gray-600">â€”</span>;
        }, tier: 'P1' as const, cellClassName: 'text-right whitespace-nowrap', minWidth: 120,
      },
      {
        key: 'variance', label: 'Variance', get: (item: WbsBudgetExtended) => {
          const spent = Number(item.total_paid_rollup || 0);
          const isParent = previewRows.hasChildren.has(item.wbs_id);
          const budgeted = groupBy !== 'flat' && isParent
            ? Number(item.total_cost_budgeted_rollup || item.total_cost_budgeted || 0)
            : Number(item.total_cost_budgeted || 0);
          const variance = budgeted - spent;
          const variancePct = budgeted > 0 ? (variance / budgeted) * 100 : 0;
          return (
            <div className="flex flex-col items-end justify-start">
              <span className={`text-sm font-bold flex items-center gap-1 ${variance < 0 ? 'text-alert-critical' : 'text-alert-positive'}`}>
                {variance !== 0 && (variance < 0 ? <ArrowDownRight className="w-3.5 h-3.5" /> : <ArrowUpRight className="w-3.5 h-3.5" />)}
                {convertToDisplay(Math.abs(variance), currency)}
              </span>
              {budgeted > 0 && spent > 0 && (
                <span className={`text-xs font-black ${variancePct < 0 ? 'text-red-500/70' : 'text-green-500/70'}`}>
                  {Math.abs(variancePct).toFixed(1)}% {variancePct < 0 ? 'OVER' : 'REMAINING'}
                </span>
              )}
            </div>
          );
        }, tier: 'P1' as const, cellClassName: 'text-right', minWidth: 140,
      },
    ];
  }, [groupBy, visibleCols, project?.currency, convertToDisplay, canApprove, previewRows, handleInlineEdit, handleRecallApproval]);

  const previewRowsData = groupBy === 'hierarchical' ? previewRows.ordered : sortedFlatRows;
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
        {/* Print Only Header â€” matches the PDF document format */}
        <div className="hidden print:block mb-6">
          <div className="flex justify-between items-start border-b-2 border-black pb-4 mb-4">
            <div>
              <h1 className="text-xl font-black text-black r">SentinelFi</h1>
              <p className="text-xs text-gray-600">Financial Management System</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500  font-bold">BUDGET PREVIEW</p>
              <p className="text-xs text-gray-500">Generated: {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
            </div>
          </div>
          <h2 className="text-2xl font-black text-black uppercase mb-3">
            Project Budget: {project?.project_name}
          </h2>
          <table className="w-full text-xs border-collapse mb-4" style={{ border: 'none' }}>
            <tbody>
              <tr>
                <td className="py-1 pr-8 font-bold text-gray-600 r" style={{ border: 'none', width: '120px' }}>RFQ Number</td>
                <td className="py-1 text-black font-bold" style={{ border: 'none' }}>{project?.rfq_number || 'â€”'}</td>
                <td className="py-1 pr-8 font-bold text-gray-600 r" style={{ border: 'none', width: '120px' }}>Status</td>
                <td className="py-1 text-black font-bold uppercase" style={{ border: 'none' }}>{project?.status || 'â€”'}</td>
              </tr>
              <tr>
                <td className="py-1 pr-8 font-bold text-gray-600 r" style={{ border: 'none' }}>Client</td>
                <td className="py-1 text-black font-bold" style={{ border: 'none' }}>{project?.client?.name || 'â€”'}</td>
                <td className="py-1 pr-8 font-bold text-gray-600 r" style={{ border: 'none' }}>Total Budget</td>
                <td className="py-1 text-black font-bold" style={{ border: 'none' }}>{convertToDisplay(kpis.totalBudgeted, project?.currency || 'NGN')}</td>
              </tr>
              <tr>
                <td className="py-1 pr-8 font-bold text-gray-600 r" style={{ border: 'none' }}>Currency</td>
                <td className="py-1 text-black" style={{ border: 'none' }}>{project?.currency || 'NGN'}</td>
                <td className="py-1 pr-8 font-bold text-gray-600 r" style={{ border: 'none' }}>Variance</td>
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
            <label className="text-xs font-black text-gray-500  block mb-1">Total Project Budget</label>
            <p className="text-2xl font-black text-white">{loading ? 'â€”' : convertToDisplay(kpis.totalBudgeted, project?.currency || 'NGN')}</p>
          </div>
          <div className="bg-brand-dark/40 border border-gray-700/50 rounded-xl p-4">
            <label className="text-xs font-black text-gray-500  block mb-1">Actual Expenditure</label>
            <p className="text-2xl font-black text-gray-300">{loading ? 'â€”' : convertToDisplay(kpis.totalSpent, project?.currency || 'NGN')}</p>
          </div>
          <div className="bg-brand-dark/40 border border-gray-700/50 rounded-xl p-4">
            <label className="text-xs font-black text-gray-500  block mb-1">Total Variance</label>
            <p className={`text-2xl font-black ${kpis.variance < 0 ? 'text-alert-critical' : 'text-alert-positive'}`}>
              {loading ? 'â€”' : convertToDisplay(Math.abs(kpis.variance), project?.currency || 'NGN')}
            </p>
            {kpis.variance < 0 && <span className="text-xs text-alert-critical font-bold uppercase animate-pulse">Over Budget</span>}
          </div>
          <div className="bg-brand-dark/40 border border-gray-700/50 rounded-xl p-4 flex flex-col justify-center">
            <label className="text-xs font-black text-gray-500  block mb-2">Budget Health</label>
            <div className="flex items-center gap-3">
              <div className="flex-grow bg-gray-700 h-2 rounded-full overflow-hidden">
                <div
                  className={`h-full ${kpis.healthPercent >= 50 ? 'bg-alert-positive' : kpis.healthPercent > 10 ? 'bg-wbs-yellow' : 'bg-alert-critical'}`}
                  style={{ width: `${Math.min(100, Math.max(0, kpis.healthPercent))}%` }}
                />
              </div>
              <span className="text-sm font-black text-white">{loading ? 'â€”' : `${kpis.healthPercent}%`}</span>
            </div>
          </div>
        </div>

        {/* Actions Bar */}
        <Card className="mb-6 p-4 border-gray-700 bg-gray-800/80 backdrop-blur-md sticky top-4 z-10 print:hidden" noPadding>
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 px-6 py-4">
            <div className="flex items-center gap-3">
              <span className="text-xs font-black text-gray-500 ">View Mode:</span>
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
                  <div className="absolute top-10 left-0 w-48 bg-gray-800 border border-gray-700 rounded-lg elev-lg p-3 z-50">
                    <h4 className="text-xs font-black text-gray-400  mb-2 border-b border-gray-700 pb-2">Toggle Columns</h4>
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
        <Card title="Structural Ledger" accent="primary" className="border border-gray-700 print:shadow-none print:border-none">
          {budgets.length === 0 && !loading ? (
            <div className="py-12 text-center text-gray-500">No budget data available for this project.</div>
          ) : loading ? (
            <div className="space-y-3 p-4">
              {[...Array(10)].map((_, i) => <div key={i} className="h-6 bg-gray-800 animate-pulse rounded"></div>)}
            </div>
          ) : (
            <>
              <DataTable
                columns={previewColumns}
                rows={previewRowsData}
                rowKey={(item) => item.wbs_id}
                className="rounded-lg border border-gray-700 print:shadow-none print:border-none"
                emptyMessage="No budget data available for this project."
              />
              {kpis && (
                <div className="flex items-center justify-end gap-4 px-4 py-4 bg-brand-dark/80 text-sm font-black text-white uppercase border-t border-gray-800">
                  <span className="mr-auto">Totals</span>
                  <span>{convertToDisplay(kpis.totalBudgeted, project?.currency || 'NGN')}</span>
                  <span className="font-bold text-gray-300 font-normal">{convertToDisplay(kpis.totalSpent, project?.currency || 'NGN')}</span>
                  <span className={`font-black ${kpis.variance < 0 ? 'text-alert-critical' : 'text-alert-positive'}`}>
                    {convertToDisplay(kpis.variance, project?.currency || 'NGN')}
                  </span>
                </div>
              )}
            </>
          )}
        </Card>
      </PageContainer>

      {/* Inline Edit Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-brand-dark/90 backdrop-blur-md">
          <div className="bg-gray-900 border border-gray-700 rounded-3xl w-full max-w-lg overflow-hidden elev-lg animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-gray-800 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-black text-white flex items-center gap-2">
                  <Edit2 className="text-brand-primary w-5 h-5" />
                  Edit Budget Line
                </h3>
                <p className="text-xs font-black text-gray-500  mt-1">WBS: {editingItem?.wbs_code}</p>
              </div>
              <button onClick={() => setIsEditModalOpen(false)} className="text-gray-500 hover:text-white p-2">
                <ArrowLeft className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-black text-gray-500  pl-1">Description</label>
                <textarea
                  className="w-full bg-brand-dark/60 border border-gray-800 rounded-xl p-3 text-sm text-white focus:border-brand-primary outline-none min-h-[80px]"
                  value={editFormData.description}
                  onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-black text-gray-500  pl-1">Quantity</label>
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
                  <label className="text-xs font-black text-gray-500  pl-1">Unit of Measure (UoM)</label>
                  <input
                    className="w-full bg-brand-dark/60 border border-gray-800 rounded-xl p-3 text-sm text-white focus:border-brand-primary outline-none uppercase"
                    value={editFormData.uom}
                    onChange={(e) => setEditFormData({ ...editFormData, uom: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-black text-gray-500  pl-1">Duration (Days)</label>
                  <input
                    type="number"
                    className="w-full bg-brand-dark/60 border border-gray-800 rounded-xl p-3 text-sm text-white focus:border-brand-primary outline-none"
                    value={editFormData.days}
                    onChange={(e) => setEditFormData({ ...editFormData, days: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-black text-gray-500  pl-1">Unit Cost (Rate)</label>
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
