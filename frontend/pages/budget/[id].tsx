import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import PageContainer from '../../components/Layout/PageContainer';
import { useSecuredApi } from '../../components/hooks/useSecuredApi';
import Card from '../../components/common/Card';
import {
  DollarSign,
  ArrowLeft,
  Layers,
  TrendingUp,
  AlertCircle,
  FileText,
  Clock,
  Briefcase,
  ExternalLink,
  Tag
} from 'lucide-react';
import Link from 'next/link';
import { useCurrency } from '../../components/context/CurrencyContext';

interface RelatedExpense {
  expense_id: string;
  description: string;
  actual_paid_amount: string;
  expense_date: string;
  variance_flag: string;
}

interface BudgetDetails {
  wbs_id: string;
  wbs_code: string;
  description: string;
  total_cost_budgeted: string;
  project_id: string;
  project_name: string;
  project_currency: string;
  created_at: string;
  status: string;
  total_paid_rollup: number;
  remaining_budget: number;
  burn_rate: number;
  expenses: RelatedExpense[];
}

const BudgetDossierPage: React.FC = () => {
  const router = useRouter();
  const { id } = router.query;
  const api = useSecuredApi();
  const { convertToDisplay } = useCurrency();

  const [budget, setBudget] = useState<BudgetDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBudgetDetails = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const response = await api.get<BudgetDetails>(`/wbs/budgets/${id}/dossier`);
      setBudget(response.data);
    } catch (e: any) {
      setError(e.response?.data?.message || e.message);
    } finally {
      setLoading(false);
    }
  }, [id, api]);

  useEffect(() => {
    fetchBudgetDetails();
  }, [fetchBudgetDetails]);

  if (loading) return <PageContainer title="Loading Budget Dossier..."><div className="animate-pulse space-y-4"><div className="h-32 bg-gray-800 rounded-2xl" /><div className="h-64 bg-gray-800 rounded-2xl" /></div></PageContainer>;
  if (error || !budget) return <PageContainer title="Error"><div className="p-8 text-center text-red-400 bg-red-900/20 border border-red-900/50 rounded-2xl">{error || 'Budget item not found'}</div></PageContainer>;

  return (
    <>
      <Head>
        <title>{budget.wbs_code} | Budget Dossier | SentinelFi</title>
      </Head>
      <PageContainer
        title={`Budget Dossier: ${budget.wbs_code}`}
        subtitle={budget.description}
        headerContent={
          <Link href="/budget/manage" className="flex items-center text-sm text-gray-400 hover:text-white transition">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Budgets
          </Link>
        }
      >
        <div className="space-y-6">
          {/* Quick Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card className="p-4 border-gray-700 bg-brand-dark/30">
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block mb-1">Allocated Budget</label>
              <p className="text-xl font-bold text-white">{convertToDisplay(parseFloat(budget.total_cost_budgeted), budget.project_currency)}</p>
            </Card>
            <Card className="p-4 border-gray-700 bg-brand-dark/30">
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block mb-1">Actual Expenditure</label>
              <p className="text-xl font-bold text-brand-secondary">{convertToDisplay(budget.total_paid_rollup, budget.project_currency)}</p>
            </Card>
            <Card className="p-4 border-gray-700 bg-brand-dark/30">
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block mb-1">Remaining Balance</label>
              <p className={`text-xl font-bold ${budget.remaining_budget < 0 ? 'text-red-400' : 'text-green-400'}`}>
                {convertToDisplay(budget.remaining_budget, budget.project_currency)}
              </p>
            </Card>
            <Card className="p-4 border-gray-700 bg-brand-dark/30">
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block mb-1">Utilization (Burn)</label>
              <div className="flex items-center gap-2">
                <p className="text-xl font-bold text-white">{budget.burn_rate.toFixed(1)}%</p>
                <div className="flex-grow bg-gray-700 h-1.5 rounded-full overflow-hidden max-w-[60px]">
                  <div className={`h-full ${budget.burn_rate > 90 ? 'bg-red-500' : 'bg-brand-primary'}`} style={{ width: `${Math.min(budget.burn_rate, 100)}%` }} />
                </div>
              </div>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Meta Information */}
            <Card title="Structural Context" className="lg:col-span-1 border-gray-700">
              <div className="space-y-6">
                <div className="flex items-start space-x-4">
                  <Briefcase className="w-5 h-5 text-gray-500 mt-1" />
                  <div className="flex-grow">
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Parent Project</label>
                    <Link href={`/projects/${budget.project_id}/overview`} className="text-sm text-brand-primary hover:underline font-bold block">
                      {budget.project_name} <ExternalLink className="inline w-3 h-3 ml-1" />
                    </Link>
                  </div>
                </div>
                <div className="flex items-start space-x-4">
                  <Layers className="w-5 h-5 text-gray-500 mt-1" />
                  <div>
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">WBS Architecture Code</label>
                    <p className="text-sm font-mono text-gray-200">{budget.wbs_code}</p>
                  </div>
                </div>
                <div className="flex items-start space-x-4">
                  <Tag className="w-5 h-5 text-gray-500 mt-1" />
                  <div>
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Lifecycle Status</label>
                    <p className="text-sm text-gray-200 font-bold uppercase tracking-tighter">{budget.status}</p>
                  </div>
                </div>
                <div className="flex items-start space-x-4">
                  <Clock className="w-5 h-5 text-gray-500 mt-1" />
                  <div>
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Initialization Date</label>
                    <p className="text-sm text-gray-300">{new Date(budget.created_at).toLocaleString()}</p>
                  </div>
                </div>
              </div>
            </Card>

            {/* Transactional History */}
            <Card title="Live Expenditure Log" className="lg:col-span-2 border-gray-700">
              {budget.expenses && budget.expenses.length > 0 ? (
                <div className="space-y-3">
                  {budget.expenses.map(expense => (
                    <div key={expense.expense_id} className="flex items-center justify-between p-4 bg-gray-800/40 border border-gray-700/50 rounded-xl">
                      <div className="flex items-center gap-4">
                        <div className="p-2 bg-gray-700 rounded-lg">
                          <TrendingUp className="w-4 h-4 text-gray-400" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-gray-200">{expense.description}</p>
                          <p className="text-[10px] font-mono text-gray-500 uppercase">{new Date(expense.expense_date).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-black text-white">{convertToDisplay(parseFloat(expense.actual_paid_amount), budget.project_currency)}</p>
                        <span className={`text-[9px] font-black px-1.5 py-0.5 rounded border ${expense.variance_flag.includes('OVERRUN') ? 'border-red-500/30 text-red-400' : 'border-green-500/30 text-green-400 '}`}>
                          {expense.variance_flag}
                        </span>
                      </div>
                    </div>
                  ))}
                  <div className="pt-4 flex justify-end">
                    <Link href="/expense/tracker" className="text-xs text-brand-primary flex items-center hover:underline">
                      View Full Expense Tracker <ArrowLeft className="w-3 h-3 ml-2 rotate-180" />
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="p-12 text-center text-gray-500 italic bg-brand-dark/20 rounded-2xl border border-dashed border-gray-800">
                  <FileText className="w-10 h-10 mx-auto mb-3 opacity-10" />
                  No live expenses have been recorded against this budget item yet.
                </div>
              )}
            </Card>
          </div>
        </div>
      </PageContainer>
    </>
  );
};

export default BudgetDossierPage;
