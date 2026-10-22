import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useAuth } from '../../../../components/context/AuthContext';
import PageContainer from '../../../../components/Layout/PageContainer';
import Card from '../../../../components/common/Card';
import Button from '../../../../components/common/Button';
import Input from '../../../../components/common/Input';
import { apiClient } from '../../../../lib/api';
import { useCurrency } from '../../../../components/context/CurrencyContext';
import { Role } from '@shared/types/role.enum';
import { Banknote, Plus, Clock, ShieldCheck, TrendingUp, AlertCircle } from 'lucide-react';
import Link from 'next/link';

interface Reconciliation {
  id: string;
  bank_account_id: string;
  reconciliation_date: string;
  statement_balance: number;
  book_balance: number;
  difference: number;
  status: string;
  created_at: string;
}

const BankReconciliationPage: React.FC = () => {
  const { user } = useAuth();
  const { convertToDisplay } = useCurrency();
  const [reconciliations, setReconciliations] = useState<Reconciliation[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const role = user?.roles?.map((r: any) => r.name) || [];
  const canApprove = role.includes(Role.CFO) || role.includes(Role.AdminDirector) || role.includes(Role.AdminManager) || role.includes(Role.SuperAdmin) || role.includes(Role.CEO);

  useEffect(() => {
    loadReconciliations();
  }, []);

  const loadReconciliations = async () => {
    setLoading(true);
    try {
      const res: any = await apiClient.get('/api/v1/bank-reconciliation');
      const unwrapped = res?.data?.reconciliations || res?.data || res;
      const data: Reconciliation[] = Array.isArray(unwrapped) ? unwrapped : [];
      setReconciliations(data);
    } catch (e) {
      console.error('Failed to load reconciliations', e);
    } finally {
      setLoading(false);
    }
  };

  const riskColor = (status: string) => {
    switch (status) {
      case 'POSTED': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'APPROVED': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'OPEN': return 'bg-slate-800 text-slate-500 border-slate-700';
      case 'CANCELLED': return 'bg-red-500/10 text-red-400 border-red-500/20';
      default: return 'bg-slate-800 text-slate-500 border-slate-700';
    }
  };

  if (loading) {
    return (
      <PageContainer title="Bank Reconciliation" subtitle="Match bank statements to GL records.">
        <div className="p-10 flex items-center justify-center gap-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-primary"></div>
        </div>
      </PageContainer>
    );
  }

  return (
    <>
      <Head><title>Bank Reconciliation | SentinelFi</title></Head>
      <PageContainer
        title="Bank Reconciliation"
        subtitle="Reconcile bank statements against the General Ledger."
          headerContent={
            <Link href="/financials/operations/bank-reconciliation/new" className="flex items-center gap-2 px-3 py-2 bg-brand-primary/10 text-brand-primary rounded-xl border border-brand-primary/20 hover:bg-brand-primary/20 text-sm font-black transition">
              <Plus className="w-4 h-4" /> New Reconciliation
            </Link>
          }
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs text-slate-500 uppercase border-b border-slate-800">
              <tr>
                <th className="px-4 py-3 font-black text-slate-200">Account</th>
                <th className="px-4 py-3 font-black text-slate-200 text-right">Statement Balance</th>
                <th className="px-4 py-3 font-black text-slate-200 text-right">Book Balance</th>
                <th className="px-4 py-3 font-black text-slate-200 text-right">Difference</th>
                <th className="px-4 py-3 font-black text-slate-200">Status</th>
                <th className="px-4 py-3 font-black text-slate-200 text-right">Date</th>
                <th className="px-4 py-3 font-black text-slate-200 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {reconciliations.map((rec) => (
                <tr key={rec.id} className="hover:bg-slate-800/30">
                  <td className="px-4 py-3 font-mono text-xs text-slate-300">{rec.bank_account_id.slice(0, 8)}...</td>
                  <td className="px-4 py-3 text-right font-mono text-xs text-slate-400">{convertToDisplay(rec.statement_balance, 'NGN')}</td>
                  <td className="px-4 py-3 text-right font-mono text-xs text-brand-primary">{convertToDisplay(rec.book_balance, 'NGN')}</td>
                  <td className={`px-4 py-3 text-right font-mono text-xs font-bold ${Math.abs(rec.difference) > 0.01 ? 'text-red-400' : 'text-emerald-400'}`}>
                    {rec.difference >= 0 ? '+' : ''}{convertToDisplay(Math.abs(rec.difference), 'NGN')}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded text-[10px] font-black uppercase tracking-tighter border ${riskColor(rec.status)}`}>
                      {rec.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-400">{new Date(rec.reconciliation_date).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (rec.status !== 'POSTED') {
                          router.push(`/financials/operations/bank-reconciliation/${rec.id}`);
                        }
                      }}
                      disabled={rec.status === 'POSTED'}
                    >
                      Open
                    </Button>
                    {canApprove && rec.status === 'APPROVED' && (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => {
                          if (window.confirm('Post this reconciliation to the General Ledger?')) {
                            fetch(`/api/v1/bank-reconciliation/${rec.id}/post`, { method: 'POST' }).then(() => loadReconciliations());
                          }
                        }}
                      >
                        Post to Ledger
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
              {reconciliations.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-500 text-sm">
                    No reconciliations found. Create one to begin matching bank statements.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </PageContainer>
    </>
  );
};

export default BankReconciliationPage;
