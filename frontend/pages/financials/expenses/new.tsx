import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import {
  PlusCircle, Trash2, Send, AlertTriangle, ChevronRight, ChevronDown,
  Search, Briefcase, DollarSign, Calendar, RefreshCw, AlertCircle, Info,
  CheckCircle2, Building2, ArrowRight, X, FileText, ReceiptText
} from 'lucide-react';
import { apiClient } from '../../../lib/api';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../../components/context/AuthContext';
import { useCurrency } from '../../../components/context/CurrencyContext';
import { Spinner } from '../../../components/common/Spinner';
import PageContainer from '../../../components/Layout/PageContainer';

// ========================  TYPES  ========================

type ExpenseMode = 'CAPEX' | 'OPEX';

interface Project {
  project_id: string; project_name: string; status: string; currency?: string;
}

interface OperationalBudget {
  id: string; name: string; budgeted_amount: number; actual_spent: number; category?: { name: string };
}

interface WbsNode {
  wbs_id: string; wbs_code: string; description: string; status: string;
  total_cost_budgeted: number; total_cost_actual: number;
  unit_cost_budgeted: number;
  quantity_budgeted: number; quantity_actual: number;
  days_budgeted: number | null; days_actual: number | null;
  uom: string | null;
  children: WbsNode[];
}

type VarianceLevel = 'NONE' | 'MINOR' | 'MAJOR' | 'CRITICAL';

interface ExpenseLine {
  id: string;
  // Common
  description: string; unit_cost: number; quantity: number; days?: number; amount: number;
  expense_date: string; document_reference: string; notes_justification: string; override_reason: string;
  // CAPEX only
  wbs_id?: string; wbs_code?: string; wbs_description?: string;
  uom?: string | null;
  project_id?: string;
  // OPEX only
  opex_budget_id?: string; opex_budget_name?: string;
  // Computed
  budget_remaining: number; variance_level: VarianceLevel;
}

// ========================  CONSTANTS  ========================

const VARIANCE_CONFIG: Record<VarianceLevel, { color: string; bg: string; border: string; label: string; Icon: any }> = {
  NONE: {
    color: 'text-emerald-400', bg: 'bg-emerald-500/8', border: 'border-emerald-500/20',
    label: 'Within Budget', Icon: CheckCircle2
  },
  MINOR: {
    color: 'text-amber-400', bg: 'bg-amber-500/8', border: 'border-amber-500/20',
    label: 'Minor Variance < 5%', Icon: Info
  },
  MAJOR: {
    color: 'text-orange-400', bg: 'bg-orange-500/8', border: 'border-orange-500/20',
    label: 'Major Variance — Finance Manager Override Required', Icon: AlertTriangle
  },
  CRITICAL: {
    color: 'text-red-400', bg: 'bg-red-500/8', border: 'border-red-500/20',
    label: 'Critical Overrun — CFO / CEO Override Required', Icon: AlertCircle
  },
};

// ========================  HELPERS  ========================

const buildWbsTree = (nodes: any[]): WbsNode[] => {
  const map: Record<string, WbsNode> = {};
  nodes.forEach(n => (map[n.wbs_id] = { ...n, children: [] }));
  const roots: WbsNode[] = [];
  const sorted = [...nodes].sort((a, b) => {
    const pa = (a.wbs_code || '').split('.').map(Number);
    const pb = (b.wbs_code || '').split('.').map(Number);
    for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
      if ((pa[i] ?? 0) !== (pb[i] ?? 0)) return (pa[i] ?? 0) - (pb[i] ?? 0);
    }
    return 0;
  });
  sorted.forEach(n => {
    const parts = (n.wbs_code || '').split('.');
    if (parts.length > 1) {
      const parentCode = parts.slice(0, -1).join('.');
      const parent = sorted.find(m => m.wbs_code === parentCode && map[m.wbs_id]);
      if (parent) { map[parent.wbs_id].children.push(map[n.wbs_id]); return; }
    }
    roots.push(map[n.wbs_id]);
  });
  return roots;
};

const calcVariance = (amount: number, remaining: number, budgeted: number): VarianceLevel => {
  if (amount <= remaining || budgeted <= 0) return 'NONE';
  const overrun = amount - remaining;
  const pct = (overrun / budgeted) * 100;
  if (pct >= 10) return 'CRITICAL';
  if (pct >= 5) return 'MAJOR';
  return 'MINOR';
};

const newLine = (): ExpenseLine => ({
  id: `line-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  description: '', unit_cost: 0, quantity: 1, days: 0, amount: 0,
  expense_date: new Date().toISOString().split('T')[0],
  document_reference: '', notes_justification: '', override_reason: '',
  budget_remaining: 0, variance_level: 'NONE',
});

// ========================  WBS TREE PICKER WIDGET  ========================

const WbsNodeRow = ({ node, onSelect, selectedId, depth = 0 }: {
  node: WbsNode; onSelect: (n: WbsNode) => void; selectedId?: string; depth?: number;
}) => {
  const [open, setOpen] = useState(depth < 2);
  const isApproved = node.status?.toUpperCase() === 'APPROVED';
  const isSelected = selectedId === node.wbs_id;
  const used = node.total_cost_budgeted > 0
    ? Math.min(100, ((node.total_cost_actual || 0) / node.total_cost_budgeted) * 100) : 0;

  return (
    <div>
      <div
        style={{ paddingLeft: `${8 + depth * 18}px` }}
        onClick={() => {
          if (!isApproved) {
            toast.error(`"${node.description}" cannot be selected because it is in ${node.status.toUpperCase()} status. It must be APPROVED first.`);
            return;
          }
          onSelect(node);
        }}
        className={`flex items-center gap-2 py-2 pr-3 rounded-xl cursor-pointer transition-all group
          ${isSelected ? 'bg-brand-primary/15 border border-brand-primary/30' : 'hover:bg-slate-800/50'}
          ${!isApproved ? 'opacity-40 grayscale-[0.5]' : ''}
        `}
      >
        {node.children.length > 0 ? (
          <button
            onClick={e => { e.stopPropagation(); setOpen(o => !o); }}
            className="text-slate-600 hover:text-slate-400 transition shrink-0"
          >
            {open ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
          </button>
        ) : <span className="w-3 h-3 inline-block shrink-0" />}

        <span className="font-mono text-[10px] font-black text-brand-primary bg-brand-primary/10 px-1.5 py-0.5 rounded shrink-0">
          {node.wbs_code}
        </span>
        <span className={`text-xs flex-1 truncate ${isSelected ? 'text-white font-semibold' : 'text-slate-300'}`}>
          {node.description}
        </span>

        <div className="flex items-center gap-1.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
          {node.uom && <span className="text-[10px] text-slate-500 font-mono italic">{node.uom}</span>}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <div className="w-12 h-1 bg-slate-800 rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all ${used >= 95 ? 'bg-red-500' : used >= 80 ? 'bg-amber-500' : 'bg-emerald-500'}`}
              style={{ width: `${used}%` }} />
          </div>
          {!isApproved ? (
            <span className="text-[9px] font-black uppercase text-red-100 bg-red-600/40 px-1 py-0.5 rounded flex items-center gap-1">
              <AlertTriangle className="w-2 h-2" /> {node.status}
            </span>
          ) : (
            <span className="text-[9px] font-black uppercase text-emerald-400 bg-emerald-500/10 px-1 py-0.5 rounded">
              {node.total_cost_budgeted > 0 ? `${used.toFixed(0)}%` : 'OPEN'}
            </span>
          )}
        </div>
      </div>
      {open && node.children.map(c => (
        <WbsNodeRow key={c.wbs_id} node={c} onSelect={onSelect} selectedId={selectedId} depth={depth + 1} />
      ))}
    </div>
  );
};

// ========================  MAIN PAGE  ========================

export default function ProjectExpenseLogger() {
  const router = useRouter();
  const { user } = useAuth();
  const { convertToDisplay } = useCurrency();
  const currency = useMemo(() => 'NGN', []);

  // STEP MACHINE
  const [step, setStep] = useState<'SELECT_TYPE' | 'SELECT_PROJECT' | 'SELECT_OPEX' | 'ENTRY'>('SELECT_TYPE');
  const [mode, setMode] = useState<ExpenseMode>('CAPEX');

  // Project / OPEX budget selection
  const [projects, setProjects] = useState<Project[]>([]);
  const [opexBudgets, setOpexBudgets] = useState<OperationalBudget[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [selectedOpexBudget, setSelectedOpexBudget] = useState<OperationalBudget | null>(null);
  const [searchQ, setSearchQ] = useState('');
  const [loadingOptions, setLoadingOptions] = useState(false);

  // WBS data
  const [wbsNodes, setWbsNodes] = useState<WbsNode[]>([]);
  const [wbsTree, setWbsTree] = useState<WbsNode[]>([]);
  const [wbsSearch, setWbsSearch] = useState('');
  const [activePicker, setActivePicker] = useState<string | null>(null);

  // Lines
  const [lines, setLines] = useState<ExpenseLine[]>([newLine()]);
  const [submitting, setSubmitting] = useState(false);

  // ── Loaders ─────────────────────────────────────────────────────────────────

  const loadProjects = useCallback(async () => {
    setLoadingOptions(true);
    try {
      const res: any = await apiClient.get('/projects?status=active&limit=200');
      const unwrapped = res?.data?.data || res?.data || res;
      const list: Project[] = Array.isArray(unwrapped) ? unwrapped : (unwrapped?.projects || unwrapped?.items || []);
      setProjects(list.filter(p => p.status === 'active' || p.status === 'ACTIVE'));
    } catch (e: any) {
      console.error('Failed to load active projects:', e);
      toast.error('Failed to load active projects.');
    }
    finally { setLoadingOptions(false); }
  }, []);

  const loadOpexBudgets = useCallback(async () => {
    setLoadingOptions(true);
    try {
      const res: any = await apiClient.get('/operational-budgets?limit=200');
      const unwrapped = res?.data?.data || res?.data || res;
      const list: OperationalBudget[] = Array.isArray(unwrapped) ? unwrapped : (unwrapped?.items || []);
      setOpexBudgets(list);
    } catch (e: any) {
      console.error('Failed to load operational budgets:', e);
      toast.error('Failed to load operational budgets.');
    }
    finally { setLoadingOptions(false); }
  }, []);

  const loadWbs = useCallback(async (projectId: string) => {
    try {
      const res: any = await apiClient.get(`/wbs/budgets?projectId=${projectId}&limit=500&sortBy=wbs_code`);
      const flat: any[] = Array.isArray(res) ? res : (res?.data || []);
      setWbsNodes(flat);
      setWbsTree(buildWbsTree(flat));
    } catch { toast.error('Failed to load budget lines.'); }
  }, []);

  // ── Line helpers ──────────────────────────────────────────────────────────

  const recalcLine = (line: ExpenseLine): ExpenseLine => {
    const isDuration = line.uom?.toLowerCase().includes('day') || line.uom?.toLowerCase().includes('hour');
    // If it's human duration, amount might be unit_cost * days * quantity (if quantity > 1) 
    // or just unit_cost * quantity (where quantity is days).
    // For simplicity, we use the standard: unit_cost * quantity. 
    // If 'days' is provided, we can use it to determine the quantity if it's a day-rate.
    const qty = line.days && isDuration ? line.days : line.quantity;
    const amount = parseFloat((line.unit_cost * qty).toFixed(4));

    const wbs = line.wbs_id ? wbsNodes.find(n => n.wbs_id === line.wbs_id) : undefined;
    const opex = line.opex_budget_id ? opexBudgets.find(b => b.id === line.opex_budget_id) : undefined;

    let budgeted = 0;
    let remaining = 0;
    if (wbs) {
      budgeted = wbs.total_cost_budgeted;
      remaining = Math.max(0, budgeted - (wbs.total_cost_actual || 0));
    } else if (opex) {
      budgeted = opex.budgeted_amount;
      remaining = Math.max(0, budgeted - (opex.actual_spent || 0));
    }

    return {
      ...line, amount,
      quantity: qty,
      budget_remaining: remaining,
      variance_level: calcVariance(amount, remaining, budgeted),
    };
  };

  const updateLine = (id: string, changes: Partial<ExpenseLine>) =>
    setLines(prev => prev.map(l => l.id === id ? recalcLine({ ...l, ...changes }) : l));

  const selectWbsForLine = (lineId: string, wbs: WbsNode) => {
    const remainingDays = Math.max(0, (wbs.days_budgeted || 0) - (wbs.days_actual || 0));
    const remainingQty = Math.max(0, (wbs.quantity_budgeted || 0) - (wbs.quantity_actual || 0));
    const isDuration = wbs.uom?.toLowerCase().includes('day') || wbs.uom?.toLowerCase().includes('hour');

    setLines(prev => prev.map(l => l.id !== lineId ? l : recalcLine({
      ...l,
      wbs_id: wbs.wbs_id,
      wbs_code: wbs.wbs_code,
      wbs_description: wbs.description,
      uom: wbs.uom,
      unit_cost: Number(wbs.unit_cost_budgeted),
      quantity: isDuration ? 1 : remainingQty > 0 ? remainingQty : 1,
      days: isDuration ? (remainingDays > 0 ? remainingDays : 1) : 0,
      project_id: selectedProject?.project_id,
    })));
    setActivePicker(null);
  };

  const addLine = () => setLines(prev => [...prev, newLine()]);
  const removeLine = (id: string) => setLines(prev => prev.length > 1 ? prev.filter(l => l.id !== id) : prev);

  // ── Mode selection ─────────────────────────────────────────────────────────

  const handleSelectMode = (m: ExpenseMode) => {
    setMode(m);
    setLines([newLine()]);
    setSelectedProject(null); setSelectedOpexBudget(null);
    if (m === 'CAPEX') { loadProjects(); setStep('SELECT_PROJECT'); }
    else { loadOpexBudgets(); setStep('SELECT_OPEX'); }
  };

  const handleSelectProject = (p: Project) => {
    setSelectedProject(p); loadWbs(p.project_id); setStep('ENTRY');
  };

  const handleSelectOpex = (b: OperationalBudget) => {
    setSelectedOpexBudget(b); setStep('ENTRY');
    // Pre-fill first line with this OPEX budget
    setLines([recalcLine({ ...newLine(), opex_budget_id: b.id, opex_budget_name: b.name })]);
  };

  // ── Submission ─────────────────────────────────────────────────────────────

  const { totalAmount, hasBlockingVariance, hasMajorNoOverride } = useMemo(() => ({
    totalAmount: lines.reduce((s, l) => s + l.amount, 0),
    hasBlockingVariance: lines.some(l => l.variance_level === 'CRITICAL' && !l.override_reason),
    hasMajorNoOverride: lines.some(l => l.variance_level === 'MAJOR' && !l.override_reason),
  }), [lines]);

  const handleSubmit = async () => {
    const invalid = lines.filter((l) => !l.description || l.amount <= 0 || (mode === 'CAPEX' && !l.wbs_id) || (mode === 'OPEX' && !l.opex_budget_id));
    if (invalid.length > 0) {
      toast.error('Complete all required fields on every line.');
      return;
    }
    if (hasBlockingVariance) {
      toast.error('CRITICAL overrun detected. CFO / CEO override justification is required.');
      return;
    }
    if (hasMajorNoOverride) {
      toast.error('MAJOR overrun detected. Finance Manager override reason is required.');
      return;
    }

    setSubmitting(true);
    try {
      if (mode === 'CAPEX') {
        const payload = {
          entries: lines.map((l) => ({
            wbs_id: l.wbs_id!,
            project_id: selectedProject!.project_id,
            description: l.description,
            unit_cost: l.unit_cost,
            quantity: l.quantity,
            days: l.days || undefined,
            amount: l.amount,
            expense_date: l.expense_date,
            document_reference: l.document_reference || undefined,
            notes_justification: l.notes_justification || undefined,
            override_reason: l.override_reason || undefined,
          })),
        };
        const res: {
          saved: any[];
          errors: { index: number; message: string }[];
          totalCount: number;
          successCount: number;
        } = await apiClient.post('/wbs/expense/live-entry/batch', payload);

        if (res.errors && res.errors.length > 0) {
          toast(`Partial success: ${res.successCount} saved, ${res.errors.length} failed.`, {
            icon: '⚠️',
            duration: 5000
          });
          res.errors.forEach((e) => {
            const lineNum = e.index + 1;
            toast.error(`Line ${lineNum}: ${e.message}`, { duration: 6000 });
          });
          // Note: We don't redirect if there are errors so the user can see which lines failed and fix them.
        } else {
          toast.success(`${res.successCount} CAPEX expense entries submitted successfully.`);
          router.push('/financials/projects/expenses');
        }
      } else {
        // OPEX Flow
        for (const l of lines) {
          await apiClient.post(`/operational-budgets/${l.opex_budget_id}/expenses`, {
            description: l.description,
            amount: l.amount,
            expense_date: l.expense_date,
            document_reference: l.document_reference || undefined,
            notes_justification: l.notes_justification || undefined,
          });
        }
        toast.success(`${lines.length} OPEX expense entries submitted successfully.`);
        router.push('/financials/projects/expenses');
      }
    } catch (err: any) {
      const data = err?.response?.data;
      const msg = data?.message || err?.message || 'Submission failed.';
      if (data?.errorCode) {
        toast.error(`${data.errorCode}: ${msg}`);
      } else {
        toast.error(msg);
      }
    } finally {
      setSubmitting(false);
    }
  };

  // ── Filtering ─────────────────────────────────────────────────────────────

  const filteredProjects = projects.filter(p => p.project_name.toLowerCase().includes(searchQ.toLowerCase()));
  const filteredOpex = opexBudgets.filter(b => b.name.toLowerCase().includes(searchQ.toLowerCase()));
  const filteredWbs = wbsSearch
    ? wbsNodes.filter(n => n.wbs_code.includes(wbsSearch) || n.description.toLowerCase().includes(wbsSearch.toLowerCase()))
    : null;

  // ── RENDER ────────────────────────────────────────────────────────────────

  const contextLabel = mode === 'CAPEX'
    ? selectedProject?.project_name ?? 'Select a Project'
    : selectedOpexBudget?.name ?? 'Select a Budget';

  return (
    <>
      <Head><title>Log Expenditure | SentinelFi</title></Head>
      <PageContainer
        title="Log Expenditure"
        subtitle={step === 'SELECT_TYPE' ? 'Choose the expenditure category' : contextLabel}
        headerContent={
          <div className="flex items-center gap-3">
            {step !== 'SELECT_TYPE' && (
              <button
                onClick={() => { setStep('SELECT_TYPE'); setLines([newLine()]); }}
                className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-white transition"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Start Over
              </button>
            )}
          </div>
        }
      >
        {/* ── PROGRESS INDICATOR ── */}
        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-600 mb-8">
          {(['SELECT_TYPE', mode === 'CAPEX' ? 'SELECT_PROJECT' : 'SELECT_OPEX', 'ENTRY'] as const).map((s, i) => {
            const labels: Record<string, string> = {
              SELECT_TYPE: 'Type', SELECT_PROJECT: 'Project', SELECT_OPEX: 'Op. Budget', ENTRY: 'Entry'
            };
            const isActive = step === s;
            const isPast = ['SELECT_TYPE', 'SELECT_PROJECT', 'SELECT_OPEX', 'ENTRY'].indexOf(step) >
              ['SELECT_TYPE', 'SELECT_PROJECT', 'SELECT_OPEX', 'ENTRY'].indexOf(s);
            return (
              <React.Fragment key={s}>
                {i > 0 && <ChevronRight className="w-3 h-3 text-slate-800" />}
                <span className={`px-3 py-1 rounded-full transition ${isActive ? 'bg-brand-primary text-white' : isPast ? 'text-brand-primary' : ''}`}>
                  {labels[s] ?? s}
                </span>
              </React.Fragment>
            );
          })}
        </div>

        {/* ── STEP 1: TYPE SELECTION ── */}
        {step === 'SELECT_TYPE' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
            <button onClick={() => handleSelectMode('CAPEX')}
              className="group text-left p-8 rounded-3xl bg-slate-900/40 border border-slate-800 hover:border-brand-primary/50 hover:bg-slate-900 transition-all duration-300"
            >
              <div className="w-14 h-14 rounded-2xl bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center mb-5 group-hover:bg-brand-primary/20 transition">
                <Briefcase className="w-7 h-7 text-brand-primary" />
              </div>
              <h3 className="text-xl font-black text-white uppercase italic tracking-tight mb-2">CAPEX</h3>
              <p className="text-sm text-slate-500 leading-relaxed">
                Capital expenditure against a specific WBS budget line within an active project.
              </p>
              <div className="flex items-center gap-1 mt-5 text-brand-primary text-xs font-bold">
                Continue <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </button>

            <button onClick={() => handleSelectMode('OPEX')}
              className="group text-left p-8 rounded-3xl bg-slate-900/40 border border-slate-800 hover:border-blue-500/50 hover:bg-slate-900 transition-all duration-300"
            >
              <div className="w-14 h-14 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mb-5 group-hover:bg-blue-500/20 transition">
                <Building2 className="w-7 h-7 text-blue-400" />
              </div>
              <h3 className="text-xl font-black text-white uppercase italic tracking-tight mb-2">OPEX</h3>
              <p className="text-sm text-slate-500 leading-relaxed">
                Operational expenditure charged against a recurring operational budget category.
              </p>
              <div className="flex items-center gap-1 mt-5 text-blue-400 text-xs font-bold">
                Continue <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </button>
          </div>
        )}

        {/* ── STEP 2A: SELECT ACTIVE PROJECT (CAPEX) ── */}
        {step === 'SELECT_PROJECT' && (
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input autoFocus value={searchQ} onChange={e => setSearchQ(e.target.value)}
                placeholder="Search active projects..."
                className="w-full bg-slate-900 border border-slate-800 rounded-2xl pl-10 pr-4 py-3.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/40"
              />
            </div>
            {loadingOptions ? (
              <div className="flex justify-center py-20"><Spinner className="w-8 h-8 text-brand-primary" /></div>
            ) : filteredProjects.length === 0 ? (
              <div className="text-center py-20 text-slate-600">
                <Briefcase className="w-14 h-14 mx-auto mb-4 opacity-30" />
                <p className="font-bold text-slate-500">No active projects found.</p>
                <p className="text-xs mt-1">Only ACTIVE projects are eligible for expense logging.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredProjects.map(p => (
                  <button key={p.project_id} onClick={() => handleSelectProject(p)}
                    className="group text-left p-5 rounded-2xl bg-slate-900/50 border border-slate-800 hover:border-brand-primary/40 hover:bg-slate-900 transition-all duration-200"
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-9 h-9 rounded-xl bg-brand-primary/10 flex items-center justify-center shrink-0">
                        <Briefcase className="w-4 h-4 text-brand-primary" />
                      </div>
                      <span className="text-[10px] font-black uppercase bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full">{p.status}</span>
                    </div>
                    <h3 className="font-black text-white text-sm uppercase tracking-tight leading-snug group-hover:text-brand-primary transition line-clamp-2">{p.project_name}</h3>
                    <p className="text-[10px] text-slate-600 mt-2 font-mono">{p.project_id.slice(0, 12)}…</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── STEP 2B: SELECT OPERATIONAL BUDGET (OPEX) ── */}
        {step === 'SELECT_OPEX' && (
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input autoFocus value={searchQ} onChange={e => setSearchQ(e.target.value)}
                placeholder="Search operational budgets..."
                className="w-full bg-slate-900 border border-slate-800 rounded-2xl pl-10 pr-4 py-3.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40"
              />
            </div>
            {loadingOptions ? (
              <div className="flex justify-center py-20"><Spinner className="w-8 h-8 text-blue-400" /></div>
            ) : filteredOpex.length === 0 ? (
              <div className="text-center py-20 text-slate-600">
                <Building2 className="w-14 h-14 mx-auto mb-4 opacity-30" />
                <p className="font-bold text-slate-500">No operational budgets found.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredOpex.map(b => {
                  const used = b.budgeted_amount > 0
                    ? Math.min(100, (b.actual_spent / b.budgeted_amount) * 100) : 0;
                  return (
                    <button key={b.id} onClick={() => handleSelectOpex(b)}
                      className="group text-left p-5 rounded-2xl bg-slate-900/50 border border-slate-800 hover:border-blue-500/40 hover:bg-slate-900 transition-all duration-200"
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-9 h-9 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0">
                          <Building2 className="w-4 h-4 text-blue-400" />
                        </div>
                        {b.category && (
                          <span className="text-[10px] font-bold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full">{b.category.name}</span>
                        )}
                      </div>
                      <h3 className="font-black text-white text-sm uppercase tracking-tight leading-snug group-hover:text-blue-400 transition line-clamp-2">{b.name}</h3>
                      <div className="mt-3 space-y-1">
                        <div className="flex justify-between text-[10px] text-slate-500">
                          <span>Remaining</span>
                          <span className={used >= 95 ? 'text-red-400' : used >= 80 ? 'text-amber-400' : 'text-emerald-400'}>
                            {convertToDisplay(Math.max(0, b.budgeted_amount - b.actual_spent), 'NGN')}
                          </span>
                        </div>
                        <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${used >= 95 ? 'bg-red-500' : used >= 80 ? 'bg-amber-500' : 'bg-blue-500'}`}
                            style={{ width: `${used}%` }} />
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── STEP 3: EXPENSE ENTRY TABLE ── */}
        {step === 'ENTRY' && (
          <div className="space-y-6">
            {/* Context Banner */}
            <div className={`flex items-center gap-4 p-4 rounded-2xl border ${mode === 'CAPEX' ? 'bg-brand-primary/5 border-brand-primary/20' : 'bg-blue-500/5 border-blue-500/20'}`}>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${mode === 'CAPEX' ? 'bg-brand-primary/15' : 'bg-blue-500/15'}`}>
                {mode === 'CAPEX' ? <Briefcase className="w-5 h-5 text-brand-primary" /> : <Building2 className="w-5 h-5 text-blue-400" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">{mode} Expense Log</p>
                <p className="text-sm font-black text-white truncate">{contextLabel}</p>
              </div>
              <span className={`text-[10px] font-black px-2.5 py-1 rounded-full uppercase ${mode === 'CAPEX' ? 'bg-brand-primary/15 text-brand-primary' : 'bg-blue-500/15 text-blue-400'}`}>
                {mode}
              </span>
            </div>

            {/* Line Entry Panel */}
            <div className="rounded-3xl border border-slate-800 bg-slate-900/20 overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/30">
                <h2 className="font-black text-white text-base uppercase tracking-tight">Expense Line Items</h2>
                <button onClick={addLine}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-primary/10 text-brand-primary text-xs font-bold hover:bg-brand-primary/20 transition"
                >
                  <PlusCircle className="w-4 h-4" /> Add Line
                </button>
              </div>

              <div className="divide-y divide-slate-800/60">
                {lines.map((line, idx) => {
                  const vc = VARIANCE_CONFIG[line.variance_level];
                  const VIcon = vc.Icon;
                  return (
                    <div key={line.id} className={`px-6 py-5 space-y-4 transition-colors ${line.variance_level !== 'NONE' ? vc.bg : ''}`}>
                      {/* Row Header */}
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Line {idx + 1}</span>
                        {lines.length > 1 && (
                          <button onClick={() => removeLine(line.id)} className="text-slate-700 hover:text-red-400 transition">
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
                        {/* WBS Selector (CAPEX) */}
                        {mode === 'CAPEX' && (
                          <div className="lg:col-span-5 relative">
                            <label className="field-label">WBS Budget Line *</label>
                            <button onClick={() => setActivePicker(activePicker === line.id ? null : line.id)}
                              className={`w-full text-left px-3 py-2.5 rounded-xl border text-sm transition
                                ${line.wbs_id ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-900 border-slate-700 text-slate-500'}
                              `}
                            >
                              {line.wbs_code
                                ? <span><span className="font-mono font-black text-brand-primary mr-2">{line.wbs_code}</span>{line.wbs_description}</span>
                                : 'Select WBS Line…'}
                            </button>
                            {activePicker === line.id && (
                              <div className="absolute top-full mt-1.5 left-0 right-0 z-50 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl max-h-72 overflow-y-auto">
                                <div className="p-2 sticky top-0 bg-slate-900 border-b border-slate-800">
                                  <div className="relative">
                                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                                    <input value={wbsSearch} onChange={e => setWbsSearch(e.target.value)}
                                      placeholder="Filter…" autoFocus
                                      className="w-full bg-slate-800 pl-8 pr-3 py-2 rounded-xl text-xs text-white focus:outline-none"
                                    />
                                  </div>
                                </div>
                                <div className="p-1.5">
                                  {(filteredWbs ?? []).length > 0 ? (
                                    (filteredWbs || []).map(n => (
                                      <button key={n.wbs_id} onClick={() => selectWbsForLine(line.id, n)}
                                        disabled={n.status?.toUpperCase() !== 'APPROVED'}
                                        className="w-full text-left flex items-center gap-2 px-3 py-2 hover:bg-slate-800 rounded-xl transition disabled:opacity-40"
                                      >
                                        <span className="font-mono font-black text-[10px] text-brand-primary">{n.wbs_code}</span>
                                        <span className="text-xs text-slate-300 truncate">{n.description}</span>
                                      </button>
                                    ))
                                  ) : (
                                    wbsTree.map(root => (
                                      <WbsNodeRow key={root.wbs_id} node={root} onSelect={n => selectWbsForLine(line.id, n)} selectedId={line.wbs_id} />
                                    ))
                                  )}
                                  {wbsNodes.length === 0 && !wbsSearch && (
                                    <p className="text-center text-slate-600 text-xs py-6">No approved budget lines found for this project.</p>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {/* OPEX Budget Label */}
                        {mode === 'OPEX' && (
                          <div className="lg:col-span-5">
                            <label className="field-label">Operational Budget</label>
                            <div className="px-3 py-2.5 rounded-xl border border-blue-500/20 bg-blue-500/5 text-sm font-bold text-blue-400">
                              {line.opex_budget_name || selectedOpexBudget?.name || '—'}
                            </div>
                          </div>
                        )}

                        {/* Description */}
                        <div className="lg:col-span-4">
                          <label className="field-label">Description *</label>
                          <input value={line.description} onChange={e => updateLine(line.id, { description: e.target.value })}
                            placeholder="e.g., Labour — Week 23 mobilisation"
                            className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:ring-1 focus:ring-brand-primary/40"
                          />
                        </div>

                        {/* Date */}
                        <div className="lg:col-span-3">
                          <label className="field-label">Expense Date *</label>
                          <input type="date" value={line.expense_date} onChange={e => updateLine(line.id, { expense_date: e.target.value })}
                            className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:ring-1 focus:ring-brand-primary/40"
                          />
                        </div>

                        {/* Unit Cost */}
                        <div className="lg:col-span-2">
                          <label className="field-label">Unit Cost (₦) *</label>
                          <input type="number" min="0" step="0.01" value={line.unit_cost || ''}
                            onChange={e => updateLine(line.id, { unit_cost: parseFloat(e.target.value) || 0 })}
                            placeholder="0.00"
                            className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none font-mono"
                          />
                        </div>

                        {/* Quantity / Days Multi-column */}
                        <div className={line.uom?.toLowerCase().includes('day') || line.uom?.toLowerCase().includes('hour') ? 'lg:col-span-3 grid grid-cols-2 gap-2' : 'lg:col-span-3'}>
                          <div className="flex flex-col">
                            <label className="field-label truncate">{line.uom || 'Qty'}</label>
                            <input type="number" min="0.01" step="0.01" value={line.quantity || ''}
                              onChange={e => updateLine(line.id, { quantity: parseFloat(e.target.value) || 1 })}
                              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none font-mono"
                            />
                          </div>
                          {(line.uom?.toLowerCase().includes('day') || line.uom?.toLowerCase().includes('hour')) && (
                            <div className="flex flex-col">
                              <label className="field-label">Days</label>
                              <input type="number" min="0.01" step="0.01" value={line.days || ''}
                                onChange={e => updateLine(line.id, { days: parseFloat(e.target.value) || 1 })}
                                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none font-mono"
                              />
                            </div>
                          )}
                        </div>

                        {/* Total */}
                        <div className="lg:col-span-4">
                          <label className="field-label">Total Amount</label>
                          <div className={`px-3 py-2.5 rounded-xl border text-sm font-black font-mono
                            ${line.variance_level !== 'NONE' ? `${vc.color} ${vc.border} bg-transparent` : 'text-brand-primary bg-brand-primary/8 border-brand-primary/20'}
                          `}>
                            {convertToDisplay(line.amount, currency)}
                          </div>
                        </div>

                        {/* Document Ref */}
                        <div className="lg:col-span-4">
                          <label className="field-label">Document Reference</label>
                          <input value={line.document_reference} onChange={e => updateLine(line.id, { document_reference: e.target.value })}
                            placeholder="Invoice / GRN / LPO number"
                            className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none"
                          />
                        </div>

                        {/* Notes */}
                        <div className="lg:col-span-4">
                          <label className="field-label">Notes</label>
                          <input value={line.notes_justification} onChange={e => updateLine(line.id, { notes_justification: e.target.value })}
                            placeholder="Additional context"
                            className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none"
                          />
                        </div>

                        {/* Variance Banner */}
                        {(line.wbs_id || line.opex_budget_id) && (
                          <div className="lg:col-span-12">
                            <div className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl ${vc.bg} border ${vc.border} text-xs`}>
                              <VIcon className={`w-4 h-4 shrink-0 ${vc.color}`} />
                              <span className={`font-bold ${vc.color}`}>{vc.label}</span>
                              <span className="text-slate-500 ml-auto text-right">
                                Budget Remaining: <strong className={vc.color}>{convertToDisplay(line.budget_remaining, currency)}</strong>
                              </span>
                            </div>
                          </div>
                        )}

                        {/* Override Reason */}
                        {(line.variance_level === 'MAJOR' || line.variance_level === 'CRITICAL') && (
                          <div className="lg:col-span-12">
                            <label className={`text-[10px] font-black uppercase tracking-wider mb-1.5 block ${vc.color}`}>
                              {line.variance_level === 'CRITICAL'
                                ? '⚠ CFO / CEO Override Justification (Required)'
                                : '⚠ Finance Manager Override Reason (Required)'}
                            </label>
                            <textarea rows={2} value={line.override_reason}
                              onChange={e => updateLine(line.id, { override_reason: e.target.value })}
                              placeholder="Provide a detailed justification for this budget overrun..."
                              className={`w-full bg-slate-900 border rounded-xl px-3 py-2.5 text-white text-sm resize-none focus:outline-none ${vc.border} focus:ring-1 focus:ring-current`}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Footer Summary */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl bg-slate-900/30 border border-slate-800">
              <div>
                <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest mb-1">Total Expenditure</p>
                <p className="text-4xl font-black italic text-white leading-none">
                  {convertToDisplay(totalAmount, currency)}
                </p>
                <p className="text-[10px] text-slate-600 mt-1.5">{lines.length} line item{lines.length !== 1 ? 's' : ''} · {mode}</p>
              </div>

              <div className="flex items-center gap-3">
                <button onClick={() => setLines([newLine()])}
                  className="px-4 py-2.5 rounded-xl border border-slate-700 text-slate-400 text-xs font-bold hover:text-white hover:border-slate-600 transition"
                >
                  Reset
                </button>
                <button onClick={handleSubmit}
                  disabled={submitting || hasBlockingVariance || hasMajorNoOverride}
                  className="flex items-center gap-2 px-8 py-3 rounded-2xl bg-brand-primary hover:bg-brand-primary/90 text-white text-sm font-black uppercase tracking-widest transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? <Spinner className="w-4 h-4" /> : <Send className="w-4 h-4" />}
                  Submit Expenses
                </button>
              </div>
            </div>
          </div>
        )}
      </PageContainer>

      {/* Tailwind utility shorthand */}
      <style jsx global>{`
        .field-label { display: block; font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em; color: #64748b; margin-bottom: 4px; }
      `}</style>
    </>
  );
}
