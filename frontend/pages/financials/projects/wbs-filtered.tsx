import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import PageContainer from '../../../components/Layout/PageContainer';
import Card from '../../../components/common/Card';
import Button from '../../../components/common/Button';
import { useAuth, Role } from '../../../components/context/AuthContext';
import { useFinanceCore } from '../../../hooks/useFinanceCore';
import { useCurrency } from '../../../components/context/CurrencyContext';
import api from '../../../lib/api';
import { WBSItem, STATUS_CONFIG } from './wbs';
import { EmptyState } from '../../../components/common/EmptyState';
import { TableSkeleton } from '../../../components/common/LoadingSkeleton';
import { CheckCircle, Clock, XCircle, AlertTriangle, Send, Trash2, Edit3, Plus, ArrowUp, ArrowDown, Eye, ChevronDown, ChevronRight, Zap } from 'lucide-react';
import Link from 'next/link';

const WBSFilteredPage: React.FC = () => {
  const router = useRouter();
  const { hasAnyRole } = useAuth();
  const { userCurrency, convertToDisplay, convertAmount } = useCurrency();
  const { fetchWBSForExpense } = useFinanceCore();

  const [items, setItems] = useState<WBSItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [projects, setProjects] = useState<{ project_id: string; project_name: string; currency?: string }[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('all');
  const [forensics, setForensics] = useState<{
    burnRate: number;
    avgDailySpend: number;
    estimatedExhaustionDate: string | null;
    riskLevel: string;
  } | null>(null);

  // Get filter from URL
  const { filter, assigned } = router.query;
  const isPendingFilter = filter === 'pending';
  const isAssignedFilter = assigned === 'true';

  const canManage = hasAnyRole([Role.AdminDirector, Role.AdminManager, Role.CFO, Role.FinanceManager]);
  const canApprove = hasAnyRole([Role.AdminDirector, Role.FinanceManager, Role.OperationalDirector, Role.CFO]);

  // Project Currency Map
  const projectCurrencyMap = useMemo(() => {
    return projects.reduce((acc, p) => {
      acc[p.project_id] = p.currency || 'NGN';
      return acc;
    }, {} as Record<string, string>);
  }, [projects]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      let url = '/wbs/budget/rollup';
      const params = new URLSearchParams();
      
      if (selectedProjectId !== 'all') params.set('projectId', selectedProjectId);
      if (isPendingFilter) params.set('status', 'pending');
      
      if (params.toString()) url += `?${params.toString()}`;

      const response = await api.get<WBSItem[]>(url);
      let data = response.data;

      // Filter for assigned items if needed
      if (isAssignedFilter) {
        // In real implementation, filter by user's assigned projects
        // For now, we'll filter by project
        data = data.filter(item => item.project_id === selectedProjectId);
      }

      setItems(data);

      const roots = data.filter(i => !i.parent_wbs_id);
      setExpandedNodes(new Set(roots.map(r => r.wbs_id)));

      // Fetch forensics
      if (selectedProjectId !== 'all') {
        try {
          const forensicsRes = await api.get(`/wbs/projects/${selectedProjectId}/forensics`);
          setForensics(forensicsRes.data);
        } catch { setForensics(null); }
      } else {
        setForensics(null);
      }
    } catch (e: any) {
      console.error('Failed to fetch WBS:', e);
    } finally {
      setLoading(false);
    }
  }, [selectedProjectId, isPendingFilter, isAssignedFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    api.get('/projects?limit=100')
      .then(res => setProjects(res.data.projects || []))
      .catch(() => {});
  }, []);

  const toggleExpand = (id: string) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(id)) newExpanded.delete(id);
    else newExpanded.add(id);
    setExpandedNodes(newExpanded);
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      await api.patch(`/wbs/budget-draft/${id}/status`, { status: newStatus });
      fetchData();
    } catch (e: any) {
      console.error('Status change failed:', e);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this item and all children?')) return;
    try {
      await api.delete(`/wbs/budget-draft/${id}?recursive=true`);
      fetchData();
    } catch (e: any) {
      console.error('Delete failed:', e);
    }
  };

  const renderTree = (parentId: string | null = null, level: number = 0) => {
    const children = items.filter(i => i.parent_wbs_id === parentId)
      .sort((a, b) => a.wbs_code.localeCompare(b.wbs_code, undefined, { numeric: true }));

    return children.map(item => {
      const isExpanded = expandedNodes.has(item.wbs_id);
      const hasChildren = items.some(i => i.parent_wbs_id === item.wbs_id);
      const statusCfg = STATUS_CONFIG[item.status || 'draft'];
      const StatusIcon = statusCfg?.icon || AlertTriangle;
      const budgeted = hasChildren ? Number(item.total_cost_budgeted_rollup || item.total_cost_budgeted || 0) : Number(item.total_cost_budgeted || 0);
      const spent = Number(item.total_paid_rollup || 0);
      const variance = budgeted > 0 ? ((budgeted - spent) / budgeted) * 100 : 0;
      const currency = projectCurrencyMap[item.project_id || ''] || 'NGN';

      return (
        <React.Fragment key={item.wbs_id}>
          <div className={`group flex items-center p-3 border-b border-gray-800/50 hover:bg-white/5 transition ${level > 0 ? 'ml-6 border-l' : ''}`} style={{ borderLeftColor: level > 0 ? '#0D9488' : 'transparent' }}>
            <div className="flex items-center flex-grow min-w-0">
              {hasChildren ? (
                <button onClick={() => toggleExpand(item.wbs_id)} className="mr-3 p-1 hover:bg-gray-700 rounded transition">
                  {isExpanded ? <ChevronDown className="w-3.5 h-3.5 text-gray-500" /> : <ChevronRight className="w-3.5 h-3.5 text-gray-500" />}
                </button>
              ) : (
                <div className="w-8" />
              )}

              <div className="flex flex-col truncate">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-black px-1.5 py-0.5 rounded bg-gray-800 text-brand-primary">{item.wbs_code}</span>
                  {statusCfg && (
                    <span className={`flex items-center gap-1 text-xs font-bold uppercase px-1.5 py-0.5 rounded ${statusCfg.bg} ${statusCfg.color}`}>
                      <StatusIcon className="w-2.5 h-2.5" /> {statusCfg.label}
                    </span>
                  )}
                </div>
                <span className="text-gray-200 text-sm truncate pr-4">{item.description}</span>
              </div>
            </div>

            <div className="flex items-center gap-4 text-right mr-4">
              <div className="min-w-[90px]">
                <p className="font-black text-sm text-gray-100">{convertToDisplay(budgeted, currency)}</p>
                <p className="text-xs text-gray-500 uppercase font-bold tracking-tighter">Budget</p>
              </div>
              {spent > 0 && (
                <div className="min-w-[90px]">
                  <p className="font-bold text-sm text-gray-300">{convertToDisplay(spent, currency)}</p>
                  <p className="text-xs text-gray-500 uppercase font-bold tracking-tighter">Actual</p>
                </div>
              )}
              {budgeted > 0 && spent > 0 && (
                <div className="min-w-[60px]">
                  <p className={`font-bold text-sm ${variance < 0 ? 'text-red-400' : variance < 10 ? 'text-yellow-400' : 'text-green-400'}`}>
                    {variance.toFixed(1)}%
                  </p>
                  <p className="text-xs text-gray-500 uppercase font-bold tracking-tighter">Variance</p>
                </div>
              )}
            </div>

            {canManage && (
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {item.status === 'draft' && (
                  <button onClick={() => handleStatusChange(item.wbs_id, 'pending')} className="p-1.5 text-yellow-400 hover:bg-yellow-900/30 rounded-lg transition" title="Submit for Approval">
                    <Send className="w-3.5 h-3.5" />
                  </button>
                )}
                {item.status === 'pending' && canApprove && (
                  <>
                    <button onClick={() => handleStatusChange(item.wbs_id, 'approved')} className="p-1.5 text-green-400 hover:bg-green-900/30 rounded-lg transition" title="Approve">
                      <CheckCircle className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => handleStatusChange(item.wbs_id, 'rejected')} className="p-1.5 text-red-400 hover:bg-red-900/30 rounded-lg transition" title="Reject">
                      <XCircle className="w-3.5 h-3.5" />
                    </button>
                  </>
                )}
                <button onClick={() => router.push(`/project/${item.project_id}?mode=expense&wbs=${item.wbs_id}`)} className="p-1.5 text-brand-primary hover:bg-brand-primary/20 rounded-lg transition" title="Log Expense">
                  <Zap className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
          {isExpanded && renderTree(item.wbs_id, level + 1)}
        </React.Fragment>
      );
    });
  };

  const filterDescription = useMemo(() => {
    const parts = [];
    if (isPendingFilter) parts.push('Pending Approval');
    if (isAssignedFilter) parts.push('My Projects');
    return parts.length > 0 ? parts.join(' Â· ') : 'All Items';
  }, [isPendingFilter, isAssignedFilter]);

  return (
    <>
      <Head><title>WBS Filtered View | SentinelFi</title></Head>
      <PageContainer
        title="WBS Filtered View"
        subtitle={filterDescription}
        headerContent={
          <div className="flex items-center gap-4">
            <div className="flex flex-col items-end">
              <label className="text-xs font-black text-gray-500 ">Project Filter</label>
              <select
                value={selectedProjectId}
                onChange={e => setSelectedProjectId(e.target.value)}
                className="bg-brand-dark border border-gray-700 rounded-lg p-2 text-xs text-white focus:ring-brand-primary outline-none min-w-[200px]"
              >
                <option value="all">All Projects</option>
                {projects.map(p => <option key={p.project_id} value={p.project_id}>{p.project_name}</option>)}
              </select>
            </div>
            <div className="h-10 w-px bg-gray-700 mx-1" />
            <div className="flex items-center gap-2">
              <Link href="/financials/projects/wbs" className="px-3 py-1.5 bg-gray-700 text-gray-300 rounded-lg text-xs font-bold hover:bg-gray-600 transition">
                Full WBS Manager
              </Link>
            </div>
          </div>
        }
      >
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isPendingFilter && <span className="px-2 py-1 bg-yellow-900/30 text-yellow-400 text-xs font-bold rounded-full">Pending</span>}
            {isAssignedFilter && <span className="px-2 py-1 bg-brand-primary/30 text-brand-primary text-xs font-bold rounded-full">Assigned</span>}
          </div>
          {canManage && (
            <Link href="/financials/projects/wbs">
              <Button variant="outline" size="sm"><Plus className="w-4 h-4 mr-2" /> Add WBS Item</Button>
            </Link>
          )}
        </div>

        <Card title="WBS Structure" subtitle={filterDescription} accent="primary">
          {loading ? (
            <TableSkeleton columns={6} rows={5} />
          ) : items.length === 0 ? (
            <EmptyState
              icon={<AlertTriangle className="w-12 h-12 text-gray-600" />}
              title="No Matching Items"
              subtitle={`No WBS items found matching the current filters: ${filterDescription}`}
              primaryAction={{ label: 'Clear Filters', href: '/financials/projects/wbs', variant: 'outline' }}
            />
          ) : (
            <div className="bg-brand-dark/40 rounded-lg overflow-hidden min-h-[400px]">
              <div className="bg-gray-800/50 p-3 border-b border-gray-700 flex text-xs font-bold text-gray-400 uppercase">
                <div className="flex-grow">WBS Code / Description</div>
                <div className="w-48 text-right mr-4">Budget / Actual</div>
                <div className="w-32 text-center">Variance</div>
                <div className="w-32 text-center">Status</div>
                {canManage && <div className="w-32">Actions</div>}
              </div>
              {renderTree(null)}
            </div>
          )}
        </Card>
      </PageContainer>
    </>
  );
};

export default WBSFilteredPage;