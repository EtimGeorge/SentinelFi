import React, { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import PageContainer from '../../../components/Layout/PageContainer';
import Card from '../../../components/common/Card';
import api from '../../../lib/api';
import { useAuth, Role } from '../../../components/context/AuthContext';
import { useCurrency } from '../../../components/context/CurrencyContext';
import toast from 'react-hot-toast';
import {
  BarChart2, DollarSign, TrendingUp, TrendingDown, AlertTriangle,
  Layers, FileText, Bot, PenLine, Briefcase, Activity,
  ChevronRight, ArrowUpRight, ArrowDownRight, Wallet,
  CheckCircle, Clock, XCircle, Eye, PlusCircle
} from 'lucide-react';

interface ProjectSummary {
  project_id: string;
  project_name: string;
  total_budgeted: number;
  total_spent: number;
  budget_count: number;
  expense_count: number;
}

interface BudgetKPIs {
  totalBudgeted: number;
  totalSpent: number;
  totalRemaining: number;
  healthPercent: number;
  approvedCount: number;
  pendingCount: number;
  rejectedCount: number;
  totalBudgets: number;
  totalExpenses: number;
  overBudgetCount: number;
  projectSummaries: ProjectSummary[];
}

const QUICK_LINKS = [
  {
    name: 'WBS Designer',
    description: 'Build and manage hierarchical cost structures',
    icon: Layers,
    path: '/financials/projects/wbs',
    color: 'from-brand-primary/20 to-brand-primary/5',
    iconColor: 'text-brand-primary',
    borderColor: 'border-brand-primary/30',
  },
  {
    name: 'Project Budgets',
    description: 'View, filter, and analyze all budget items',
    icon: DollarSign,
    path: '/financials/projects/budgets',
    color: 'from-brand-secondary/20 to-brand-secondary/5',
    iconColor: 'text-brand-secondary',
    borderColor: 'border-brand-secondary/30',
  },
  {
    name: 'Project Expenses',
    description: 'Track live expenses with variance flags',
    icon: Activity,
    path: '/financials/projects/expenses',
    color: 'from-alert-critical/20 to-alert-critical/5',
    iconColor: 'text-alert-critical',
    borderColor: 'border-alert-critical/30',
  },
  {
    name: 'OPEX Planning',
    description: 'Configure and manage operational budgets',
    icon: Briefcase,
    path: '/financials/operations/planning',
    color: 'from-wbs-violet/20 to-wbs-violet/5',
    iconColor: 'text-wbs-violet',
    borderColor: 'border-wbs-violet/30',
  },
  {
    name: 'Log Expense',
    description: 'Submit single or bulk expense entries against approved budgets',
    icon: PlusCircle,
    path: '/financials/expenses/new',
    color: 'from-green-500/20 to-green-500/5',
    iconColor: 'text-green-400',
    borderColor: 'border-green-500/30',
  },
];

const BudgetHubPage: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const { convertToDisplay } = useCurrency();
  const router = useRouter();
  const [kpis, setKpis] = useState<BudgetKPIs | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchKPIs = useCallback(async () => {
    if (!isAuthenticated) return;
    setLoading(true);
    try {
      // Fetch budgets, expenses, and projects in parallel
      const [budgetRes, expenseRes, projectsRes] = await Promise.allSettled([
        api.get<{ data: any[]; total: number }>('/wbs/budgets?limit=100'),
        api.get<{ data: any[]; total: number }>('/wbs/expenses?limit=100'),
        api.get<{ projects: any[] }>('/projects?limit=100'),
      ]);

      const budgets = budgetRes.status === 'fulfilled' ? budgetRes.value.data.data || [] : [];
      const budgetTotal = budgetRes.status === 'fulfilled' ? budgetRes.value.data.total || 0 : 0;
      const expenses = expenseRes.status === 'fulfilled' ? expenseRes.value.data.data || [] : [];
      const expenseTotal = expenseRes.status === 'fulfilled' ? expenseRes.value.data.total || 0 : 0;
      const projects = projectsRes.status === 'fulfilled' ? projectsRes.value.data.projects || [] : [];

      // Compute KPIs
      const totalBudgeted = budgets.reduce((sum: number, b: any) => sum + Number(b.total_cost_budgeted || 0), 0);
      const totalSpent = expenses.reduce((sum: number, e: any) => sum + Number(e.actual_paid_amount || 0), 0);
      const totalRemaining = totalBudgeted - totalSpent;
      const healthPercent = totalBudgeted > 0 ? Math.round(((totalBudgeted - totalSpent) / totalBudgeted) * 100) : 100;

      const approvedCount = budgets.filter((b: any) => b.status === 'approved').length;
      const pendingCount = budgets.filter((b: any) => b.status === 'pending').length;
      const rejectedCount = budgets.filter((b: any) => b.status === 'rejected').length;
      const overBudgetCount = expenses.filter((e: any) =>
        e.variance_flag === 'MAJOR_VARIANCE_OVERRUN' || e.variance_flag === 'OVER_BUDGET'
      ).length;

      // Per-project summaries
      const projectMap = new Map<string, ProjectSummary>();
      for (const p of projects) {
        projectMap.set(p.project_id, {
          project_id: p.project_id,
          project_name: p.project_name,
          total_budgeted: 0,
          total_spent: 0,
          budget_count: 0,
          expense_count: 0,
        });
      }
      for (const b of budgets) {
        const pid = b.project_id || b.project?.project_id;
        if (pid && projectMap.has(pid)) {
          const ps = projectMap.get(pid)!;
          ps.total_budgeted += Number(b.total_cost_budgeted || 0);
          ps.budget_count++;
        }
      }
      for (const e of expenses) {
        const pid = e.wbsBudget?.project_id || e.wbsBudget?.project?.project_id;
        if (pid && projectMap.has(pid)) {
          const ps = projectMap.get(pid)!;
          ps.total_spent += Number(e.actual_paid_amount || 0);
          ps.expense_count++;
        }
      }

      setKpis({
        totalBudgeted,
        totalSpent,
        totalRemaining,
        healthPercent,
        approvedCount,
        pendingCount,
        rejectedCount,
        totalBudgets: budgetTotal,
        totalExpenses: expenseTotal,
        overBudgetCount,
        projectSummaries: Array.from(projectMap.values())
          .filter(ps => ps.budget_count > 0 || ps.expense_count > 0)
          .sort((a, b) => b.total_budgeted - a.total_budgeted),
      });
    } catch (e: any) {
      if (e.name !== 'CanceledError') {
        toast.error(`Failed to load financial overview: ${e.message}`);
      }
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchKPIs();
  }, [fetchKPIs]);

  const getHealthColor = (percent: number) => {
    if (percent >= 50) return 'text-alert-positive';
    if (percent >= 20) return 'text-wbs-yellow';
    return 'text-alert-critical';
  };

  const getHealthBg = (percent: number) => {
    if (percent >= 50) return 'bg-alert-positive';
    if (percent >= 20) return 'bg-wbs-yellow';
    return 'bg-alert-critical';
  };

  return (
    <>
      <Head><title>Financial Command Center | SentinelFi</title></Head>
      <PageContainer
        title="Financial Command Center"
        subtitle="Unified view of budgets, expenses, and financial health across all projects."
        headerContent={
          <div className="flex items-center gap-3">
            <BarChart2 className="w-8 h-8 text-brand-primary" />
          </div>
        }
      >
        {/* KPI Cards Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {/* Total Budgeted */}
          <div className="bg-gradient-to-br from-brand-primary/15 to-transparent border border-brand-primary/20 rounded-xl p-5 relative overflow-hidden">
            <div className="absolute top-3 right-3 opacity-10">
              <Wallet className="w-16 h-16 text-brand-primary" />
            </div>
            <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Total Budgeted</p>
            <p className="text-2xl font-black text-white mt-1">
              {loading ? '—' : convertToDisplay(kpis?.totalBudgeted || 0, 'NGN')}
            </p>
            <div className="flex items-center gap-1 mt-2">
              <span className="text-xs text-gray-400">{loading ? '—' : kpis?.totalBudgets} budget items</span>
            </div>
          </div>

          {/* Total Spent */}
          <div className="bg-gradient-to-br from-brand-secondary/15 to-transparent border border-brand-secondary/20 rounded-xl p-5 relative overflow-hidden">
            <div className="absolute top-3 right-3 opacity-10">
              <TrendingUp className="w-16 h-16 text-brand-secondary" />
            </div>
            <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Total Spent</p>
            <p className="text-2xl font-black text-white mt-1">
              {loading ? '—' : convertToDisplay(kpis?.totalSpent || 0, 'NGN')}
            </p>
            <div className="flex items-center gap-1 mt-2">
              <span className="text-xs text-gray-400">{loading ? '—' : kpis?.totalExpenses} expense entries</span>
            </div>
          </div>

          {/* Remaining */}
          <div className={`bg-gradient-to-br ${(kpis?.totalRemaining ?? 0) >= 0 ? 'from-alert-positive/15 border-alert-positive/20' : 'from-alert-critical/15 border-alert-critical/20'} to-transparent border rounded-xl p-5 relative overflow-hidden`}>
            <div className="absolute top-3 right-3 opacity-10">
              {(kpis?.totalRemaining ?? 0) >= 0
                ? <TrendingDown className="w-16 h-16 text-alert-positive" />
                : <AlertTriangle className="w-16 h-16 text-alert-critical" />
              }
            </div>
            <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Remaining Budget</p>
            <p className={`text-2xl font-black mt-1 ${(kpis?.totalRemaining ?? 0) >= 0 ? 'text-alert-positive' : 'text-alert-critical'}`}>
              {loading ? '—' : convertToDisplay(Math.abs(kpis?.totalRemaining || 0), 'NGN')}
            </p>
            {(kpis?.totalRemaining ?? 0) < 0 && (
              <p className="text-[10px] text-alert-critical font-bold mt-1 animate-pulse">⚠ OVER BUDGET</p>
            )}
          </div>

          {/* Budget Health */}
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-5 relative overflow-hidden">
            <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Budget Health</p>
            <p className={`text-2xl font-black mt-1 ${getHealthColor(kpis?.healthPercent ?? 100)}`}>
              {loading ? '—' : `${kpis?.healthPercent}%`}
            </p>
            {/* Health Bar */}
            <div className="w-full bg-gray-700 rounded-full h-2 mt-3">
              <div
                className={`h-2 rounded-full transition-all duration-700 ${getHealthBg(kpis?.healthPercent ?? 100)}`}
                style={{ width: `${Math.min(100, Math.max(0, kpis?.healthPercent ?? 100))}%` }}
              />
            </div>
            {/* Status breakdown */}
            <div className="flex items-center gap-3 mt-3 text-[10px] font-bold">
              <span className="flex items-center gap-1 text-green-400">
                <CheckCircle className="w-3 h-3" /> {kpis?.approvedCount ?? 0}
              </span>
              <span className="flex items-center gap-1 text-yellow-400">
                <Clock className="w-3 h-3" /> {kpis?.pendingCount ?? 0}
              </span>
              <span className="flex items-center gap-1 text-red-400">
                <XCircle className="w-3 h-3" /> {kpis?.rejectedCount ?? 0}
              </span>
              {(kpis?.overBudgetCount ?? 0) > 0 && (
                <span className="flex items-center gap-1 text-alert-critical animate-pulse">
                  <AlertTriangle className="w-3 h-3" /> {kpis?.overBudgetCount} over
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Quick Access Navigation Grid */}
        <div className="mb-6">
          <h2 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-3">Quick Access</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {QUICK_LINKS.map((link) => (
              <Link
                key={link.path}
                href={link.path}
                className={`group bg-gradient-to-br ${link.color} border ${link.borderColor} rounded-xl p-5 hover:scale-[1.02] transition-all duration-200 hover:shadow-lg`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg bg-gray-900/50 ${link.iconColor}`}>
                      <link.icon className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white group-hover:text-brand-primary transition-colors">{link.name}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{link.description}</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-brand-primary group-hover:translate-x-1 transition-all" />
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Project Budget Summary Table */}
        {!loading && kpis && kpis.projectSummaries.length > 0 && (
          <Card title="Budget by Project" subtitle="Financial summary per project. Click 'Preview' to see the full granular budget." borderTopColor="primary">
            <div className="overflow-x-auto rounded-lg">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="px-4 py-3 text-left text-[10px] font-black text-gray-500 uppercase tracking-widest">Project</th>
                    <th className="px-4 py-3 text-right text-[10px] font-black text-gray-500 uppercase tracking-widest">Budgeted</th>
                    <th className="px-4 py-3 text-right text-[10px] font-black text-gray-500 uppercase tracking-widest">Spent</th>
                    <th className="px-4 py-3 text-right text-[10px] font-black text-gray-500 uppercase tracking-widest">Variance</th>
                    <th className="px-4 py-3 text-center text-[10px] font-black text-gray-500 uppercase tracking-widest">Items</th>
                    <th className="px-4 py-3 text-center text-[10px] font-black text-gray-500 uppercase tracking-widest">Health</th>
                    <th className="px-4 py-3 text-right text-[10px] font-black text-gray-500 uppercase tracking-widest">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/50">
                  {kpis.projectSummaries.map((ps) => {
                    const variance = ps.total_budgeted - ps.total_spent;
                    const pct = ps.total_budgeted > 0 ? Math.round((variance / ps.total_budgeted) * 100) : 100;
                    return (
                      <tr key={ps.project_id} className="hover:bg-white/5 transition-colors">
                        <td className="px-4 py-3">
                          <Link href={`/projects/${ps.project_id}/overview`} className="text-sm font-bold text-gray-200 hover:text-brand-primary transition">
                            {ps.project_name}
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="text-sm font-black text-white">{convertToDisplay(ps.total_budgeted, 'NGN')}</span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="text-sm font-bold text-gray-300">{convertToDisplay(ps.total_spent, 'NGN')}</span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className={`text-sm font-bold flex items-center justify-end gap-1 ${variance >= 0 ? 'text-alert-positive' : 'text-alert-critical'}`}>
                            {variance >= 0
                              ? <ArrowUpRight className="w-3.5 h-3.5" />
                              : <ArrowDownRight className="w-3.5 h-3.5" />
                            }
                            {convertToDisplay(Math.abs(variance), 'NGN')}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="text-xs text-gray-400">{ps.budget_count}B / {ps.expense_count}E</span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-2">
                            <div className="w-16 bg-gray-700 rounded-full h-1.5">
                              <div
                                className={`h-1.5 rounded-full ${pct >= 50 ? 'bg-alert-positive' : pct >= 20 ? 'bg-wbs-yellow' : 'bg-alert-critical'}`}
                                style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
                              />
                            </div>
                            <span className={`text-[10px] font-bold ${pct >= 50 ? 'text-alert-positive' : pct >= 20 ? 'text-wbs-yellow' : 'text-alert-critical'}`}>
                              {pct}%
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Link
                            href={`/financials/projects/preview/${ps.project_id}`}
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-[10px] font-bold text-brand-primary bg-brand-primary/10 border border-brand-primary/20 rounded-lg hover:bg-brand-primary/20 transition"
                          >
                            <Eye className="w-3.5 h-3.5" /> Preview
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* Empty State */}
        {!loading && kpis && kpis.projectSummaries.length === 0 && (
          <Card borderTopColor="secondary">
            <div className="flex flex-col items-center justify-center py-16">
              <BarChart2 className="w-16 h-16 text-gray-700 mb-4" />
              <h3 className="text-lg font-bold text-gray-400 mb-2">No Budget Data Yet</h3>
              <p className="text-sm text-gray-500 mb-6 text-center max-w-md">
                Start by creating a project and adding WBS budget items through the WBS Manager or Draft pages.
              </p>
              <div className="flex gap-3">
                <Link
                  href="/financials/projects/wbs"
                  className="px-4 py-2 bg-brand-primary text-white rounded-lg text-sm font-bold hover:bg-brand-primary/80 transition"
                >
                  Open WBS Designer
                </Link>
                <Link
                  href="/financials/projects/budgets"
                  className="px-4 py-2 bg-gray-700 text-gray-300 rounded-lg text-sm font-bold hover:bg-gray-600 transition"
                >
                  View Budgets
                </Link>
              </div>
            </div>
          </Card>
        )}

        {/* Loading State */}
        {loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-gray-800 border border-gray-700 rounded-xl p-5 animate-pulse">
                <div className="h-4 bg-gray-700 rounded w-1/3 mb-3" />
                <div className="h-3 bg-gray-700 rounded w-2/3" />
              </div>
            ))}
          </div>
        )}
      </PageContainer>
    </>
  );
};

export default BudgetHubPage;
