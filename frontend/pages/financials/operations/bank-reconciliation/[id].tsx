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
import { Banknote, ShieldCheck, Plus, Clock, ArrowLeft, RefreshCw, TrendingUp } from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';

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

interface StatementLine {
  id: string;
  statement_reference: string;
  transaction_date: string;
  description: string;
  amount: number;
  is_matched: boolean;
}

interface ReconciliationLine {
  id: string;
  amount: number;
  match_type: string;
}

const ReconciliationDetailPage: React.FC = () => {
  const { user } = useAuth();
  const { convertToDisplay } = useCurrency();
  const router = useRouter() as any;
  const id = router.query.id;
  const [reconciliation, setReconciliation] = useState<Reconciliation | null>(null);
  const [statementLines, setStatementLines] = useState<StatementLine[]>([]);
  const [reconciliationLines, setReconciliationLines] = useState<ReconciliationLine[]>([]);
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState(false);
  const [posting, setPosting] = useState(false);

  const role = user?.roles?.map((r: any) => r.name) || [];
  const canApprove = role.includes(Role.CFO) || role.includes(Role.AdminDirector) || role.includes(Role.AdminManager) || role.includes(Role.SuperAdmin) || role.includes(Role.CEO);
  const canPost = role.includes(Role.CFO) || role.includes(Role.AdminDirector) || role.includes(Role.SuperAdmin) || role.includes(Role.CEO);

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [rec, lines, recLines] = await Promise.all([
        apiClient.get<Reconciliation>(`/api/v1/bank-reconciliation/${id}`),
        apiClient.get<StatementLine[]>(`/api/v1/bank-reconciliation/${id}/statement-lines`),
        apiClient.get<ReconciliationLine[]>(`/api/v1/bank-reconciliation/${id}/lines`),
      ]);
      setReconciliation(rec);
      setStatementLines(lines);
      setReconciliationLines(recLines);
    } catch (e) {
      console.error('Failed to load reconciliation', e);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !reconciliation) {
    return (
      <PageContainer title="Bank Reconciliation" subtitle="Reconcile bank statements to GL records.">
        <div className="p-10 flex items-center justify-center gap-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-primary"></div>
        </div>
      </PageContainer>
    );
  }

  return (
    <>
      <Head><title>Reconciliation #{reconciliation.id.slice(0, 8)} | SentinelFi</title></Head>
      <PageContainer
        title={`Reconciliation ${reconciliation.id.slice(0, 8)}`}
        subtitle={`Account ${reconciliation.bank_account_id.slice(0, 8)} • ${new Date(reconciliation.reconciliation_date).toLocaleDateString()}`}
        headerContent={
          <div className="flex gap-2">
            <Link
              href="/financials/operations/bank-reconciliation"
              className="flex items-center gap-2 px-3 py-2 bg-brand-primary/10 text-brand-primary rounded-xl border border-brand-primary/20 hover:bg-brand-primary/20 text-sm font-black transition"
            >
              <ArrowLeft className="w-4 h-4" /> Back
            </Link>
            {reconciliation.status === 'OPEN' && canApprove && (
              <Button
                variant="primary"
                size="sm"
                onClick={async () => {
                  if (window.confirm('Approve this reconciliation?')) {
                    setApproving(true);
                    try {
                      await apiClient.post(`/api/v1/bank-reconciliation/${id}/approve`);
                      toast.success('Reconciliation approved.');
                      loadData();
                    } catch (err: any) {
                      toast.error(err?.response?.data?.message || 'Failed to approve reconciliation.');
                    } finally {
                      setApproving(false);
                    }
                  }
                }}
                disabled={approving}
              >
                {approving ? 'Approving...' : 'Approve'}
              </Button>
            )}
            {reconciliation.status === 'APPROVED' && canPost && (
              <Button
                variant="primary"
                size="sm"
                className="bg-green-600 hover:bg-green-700"
                onClick={async () => {
                  if (window.confirm('Post this reconciliation to the General Ledger?')) {
                    setPosting(true);
                    try {
                      await apiClient.post(`/api/v1/bank-reconciliation/${id}/post`);
                      toast.success('Reconciliation posted to ledger.');
                      loadData();
                    } catch (err: any) {
                      toast.error(err?.response?.data?.message || 'Failed to post reconciliation.');
                    } finally {
                      setPosting(false);
                    }
                  }
                }}
                disabled={posting}
              >
                {posting ? 'Posting...' : 'Post to Ledger'}
              </Button>
            )}
          </div>
        }
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Card className="p-6 border-slate-800">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-black text-white">Statement Balance</h3>
              <Banknote className="w-5 h-5 text-slate-400" />
            </div>
            <p className="text-2xl font-black text-white">{convertToDisplay(reconciliation.statement_balance, 'NGN')}</p>
          </Card>
          <Card className="p-6 border-slate-800">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-black text-white">Book Balance</h3>
              <ShieldCheck className="w-5 h-5 text-slate-400" />
            </div>
            <p className="text-2xl font-black text-white">{convertToDisplay(reconciliation.book_balance, 'NGN')}</p>
          </Card>
          <Card className={`p-6 border-slate-800 ${Math.abs(reconciliation.difference) > 0.01 ? 'border-red-500/20 bg-red-500/5' : 'border-emerald-500/20 bg-emerald-500/5'}`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-black text-white">Difference</h3>
              <TrendingUp className="w-5 h-5 text-slate-400" />
            </div>
            <p className={`text-2xl font-black text-white ${reconciliation.difference >= 0 ? 'text-red-400' : 'text-emerald-400'}`}>
              {reconciliation.difference >= 0 ? '+' : ''}{convertToDisplay(Math.abs(reconciliation.difference), 'NGN')}
            </p>
          </Card>
          <Card className="p-6 border-slate-800">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-black text-white">Status</h3>
              <Clock className="w-5 h-5 text-slate-400" />
            </div>
            <p className={`text-sm font-black text-white uppercase tracking-tighter ${
              reconciliation.status === 'POSTED' ? 'text-emerald-400' :
              reconciliation.status === 'APPROVED' ? 'text-blue-400' :
              reconciliation.status === 'OPEN' ? 'text-slate-400' : 'text-red-400'
            }`}>{reconciliation.status}</p>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="p-6 border-slate-800">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-black text-white">Unmatched Statement Lines</h3>
              <Button variant="outline" size="sm" icon={<RefreshCw className="w-4 h-4" />}>Refresh</Button>
            </div>
            <div className="space-y-3">
              {statementLines.filter((l) => !l.is_matched).map((line) => (
                <div key={line.id} className="p-3 bg-slate-900/50 border border-slate-800 rounded-xl">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-black text-slate-300 uppercase tracking-tighter">{line.statement_reference}</span>
                    <span className="text-xs font-mono text-right text-slate-400">{convertToDisplay(line.amount, 'NGN')}</span>
                  </div>
                  <p className="text-xs text-slate-500 truncate">{line.description}</p>
                  <p className="text-xs text-slate-600 font-mono">{new Date(line.transaction_date).toLocaleDateString()}</p>
                </div>
              ))}
              {statementLines.filter((l) => !l.is_matched).length === 0 && (
                <p className="text-xs text-slate-500 text-center py-4">All statement lines matched.</p>
              )}
            </div>
          </Card>

          <Card className="p-6 border-slate-800">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-black text-white">Matched Reconciliation Lines</h3>
            </div>
            <div className="space-y-3">
              {reconciliationLines.map((line) => (
                <div key={line.id} className="p-3 bg-slate-900/50 border border-slate-800 rounded-xl">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-black text-slate-300 uppercase tracking-tighter">Matched Line</span>
                    <span className="text-xs font-mono text-right text-emerald-400">{convertToDisplay(line.amount, 'NGN')}</span>
                  </div>
                  <p className="text-xs text-slate-400">{line.match_type} match</p>
                </div>
              ))}
              {reconciliationLines.length === 0 && (
                <p className="text-xs text-slate-500 text-center py-4">No matched lines yet.</p>
              )}
            </div>
          </Card>
        </div>
      </PageContainer>
    </>
  );
};

export default ReconciliationDetailPage;
