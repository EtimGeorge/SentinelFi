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
  Activity,
  Calendar,
  Briefcase,
  ExternalLink,
  ShieldCheck,
  Hash,
  AlertTriangle
} from 'lucide-react';
import Link from 'next/link';
import { useCurrency } from '../../components/context/CurrencyContext';

interface ExpenseDetails {
  expense_id: string;
  wbs_id: string;
  wbs_code: string;
  budget_description: string;
  project_id: string;
  project_name: string;
  project_currency: string;
  description: string;
  actual_paid_amount: string;
  expense_date: string;
  variance_flag: string;
  created_at: string;
  performed_by_email: string;
}

const ExpenseDossierPage: React.FC = () => {
  const router = useRouter();
  const { id } = router.query;
  const api = useSecuredApi();
  const { convertToDisplay } = useCurrency();

  const [expense, setExpense] = useState<ExpenseDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchExpenseDetails = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const response = await api.get<ExpenseDetails>(`/wbs/expenses/${id}/dossier`);
      setExpense(response.data);
    } catch (e: any) {
      setError(e.response?.data?.message || e.message);
    } finally {
      setLoading(false);
    }
  }, [id, api]);

  useEffect(() => {
    fetchExpenseDetails();
  }, [fetchExpenseDetails]);

  if (loading) return <PageContainer title="Loading Expense Dossier..."><div className="animate-pulse space-y-4"><div className="h-32 bg-gray-800 rounded-2xl" /><div className="h-64 bg-gray-800 rounded-2xl" /></div></PageContainer>;
  if (error || !expense) return <PageContainer title="Error"><div className="p-8 text-center text-red-400 bg-red-900/20 border border-red-900/50 rounded-2xl">{error || 'Expense entry not found'}</div></PageContainer>;

  const isOverrun = expense.variance_flag.includes('OVERRUN') || expense.variance_flag.includes('UNBUDGETED');

  return (
    <>
      <Head>
        <title>Expense {expense.expense_id.substring(0, 8)} | Dossier | SentinelFi</title>
      </Head>
      <PageContainer
        title="Expense Transaction Dossier"
        subtitle={`Transaction Ref: ${expense.expense_id}`}
        headerContent={
          <Link href="/expense/manage" className="flex items-center text-sm text-gray-400 hover:text-white transition">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to List
          </Link>
        }
      >
        <div className="space-y-6">
          {/* Main Transaction Card */}
          <Card className={`p-8 border-l-4 ${isOverrun ? 'border-l-red-500 bg-red-900/10' : 'border-l-brand-primary bg-brand-dark/30'} border-gray-700`}>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest ${isOverrun ? 'bg-red-500 text-white' : 'bg-brand-primary/20 text-brand-primary'}`}>
                    {expense.variance_flag.replace(/_/g, ' ')}
                  </span>
                  {isOverrun && <AlertTriangle className="w-4 h-4 text-red-500 animate-pulse" />}
                </div>
                <h1 className="text-3xl font-bold text-white">{expense.description}</h1>
                <p className="text-gray-400 text-sm flex items-center">
                  <Calendar className="w-4 h-4 mr-2" /> Effective Date: {new Date(expense.expense_date).toLocaleDateString(undefined, { dateStyle: 'full' })}
                </p>
              </div>
              <div className="text-left md:text-right">
                <p className="text-4xl font-black text-white">{convertToDisplay(parseFloat(expense.actual_paid_amount), expense.project_currency)}</p>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mt-1">Confirmed Settlement Amount</p>
              </div>
            </div>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Context & Attribution */}
            <Card title="Financial Context" className="lg:col-span-1 border-gray-700">
              <div className="space-y-6">
                <div className="flex items-start space-x-4">
                  <Briefcase className="w-5 h-5 text-gray-500 mt-1" />
                  <div>
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Target Project</label>
                    <Link href={`/projects/${expense.project_id}/overview`} className="text-sm text-brand-primary hover:underline font-bold block">
                      {expense.project_name} <ExternalLink className="inline w-3 h-3 ml-1" />
                    </Link>
                  </div>
                </div>
                <div className="flex items-start space-x-4">
                  <Layers className="w-5 h-5 text-gray-500 mt-1" />
                  <div>
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Allocated Budget Line</label>
                    <Link href={`/budget/${expense.wbs_id}`} className="text-sm text-gray-200 hover:text-brand-secondary transition font-mono">
                      {expense.wbs_code} - {expense.budget_description}
                    </Link>
                  </div>
                </div>
                <div className="flex items-start space-x-4">
                  <ShieldCheck className="w-5 h-5 text-gray-500 mt-1" />
                  <div>
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Entry Verified By</label>
                    <p className="text-sm text-gray-300">{expense.performed_by_email}</p>
                  </div>
                </div>
                <div className="flex items-start space-x-4">
                  <Hash className="w-5 h-5 text-gray-500 mt-1" />
                  <div>
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">System Record Hash</label>
                    <p className="text-[10px] font-mono text-gray-500 truncate max-w-[150px]">{expense.expense_id}</p>
                  </div>
                </div>
              </div>
            </Card>

            {/* Verification & Audit */}
            <Card title="Audit Readiness" className="lg:col-span-2 border-gray-700">
              <div className="p-6 bg-brand-dark/20 rounded-2xl border border-gray-800">
                <div className="flex items-center gap-4 mb-4">
                  <Activity className="w-6 h-6 text-brand-primary" />
                  <h3 className="text-lg font-bold text-white">Integrity Check</h3>
                </div>
                <p className="text-sm text-gray-400 leading-relaxed mb-6">
                  This transaction has been cross-referenced with the primary project budget.
                  {isOverrun
                    ? " It has triggered a variance alert due to unauthorized expenditure levels or unbudgeted request status."
                    : " It falls within the authorized thresholds for the assigned WBS node."}
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-gray-800/50 rounded-lg">
                    <p className="text-[10px] font-black text-gray-500 uppercase">Input Timestamp</p>
                    <p className="text-xs text-gray-300">{new Date(expense.created_at).toLocaleString()}</p>
                  </div>
                  <div className="p-3 bg-gray-800/50 rounded-lg">
                    <p className="text-[10px] font-black text-gray-500 uppercase">Process Workflow</p>
                    <p className="text-xs text-gray-300">Live Expense API v1</p>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </PageContainer>
    </>
  );
};

export default ExpenseDossierPage;
