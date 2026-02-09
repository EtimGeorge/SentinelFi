import React, { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import PageContainer from '../components/Layout/PageContainer';
import { CheckSquare, AlertTriangle, FileText, Loader2 } from 'lucide-react';
import Card from '../components/common/Card';
import Button from '../components/common/Button'; // Use enhanced Button
import { formatCurrency } from '../lib/utils';
import { useAuth, Role } from '../components/context/AuthContext';
import { useSecuredApi } from '../components/hooks/useSecuredApi';
import Link from 'next/link';
import useToast from '../store/toastStore';

// Assuming these interfaces based on component usage
interface PendingDraft {
  wbs_id: string;
  wbs_code: string;
  description: string;
  total_cost_budgeted: number;
  user: { email: string };
}

interface MajorException {
  id: string;
  wbs_code: string;
  item_description: string;
  actual_paid_amount: number;
  variance_flag: string;
  // Added missing properties based on usage
  wbsBudget?: { wbs_code: string };
  description?: string;
  expense_date?: string;
  amount?: number;
}

const ApprovalsPage: React.FC = () => {
  const { hasAnyRole } = useAuth();
  const api = useSecuredApi();
  const addToast = useToast(state => state.addToast);

  const [pendingDrafts, setPendingDrafts] = useState<PendingDraft[]>([]);
  const [loadingDrafts, setLoadingDrafts] = useState(true);
  const [majorExceptions, setMajorExceptions] = useState<MajorException[]>([]);
  const [loadingExceptions, setLoadingExceptions] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const isFinanceOrAdmin = hasAnyRole([Role.Finance, Role.Admin]);

  const fetchPendingDrafts = useCallback(async () => {
    if (!isFinanceOrAdmin) return;
    setLoadingDrafts(true);
    try {
      const response = await api.get('/wbs/budget-drafts/pending');
      setPendingDrafts(response.data);
    } catch (e: any) {
      addToast(`Failed to fetch pending drafts: ${e.response?.data?.message || e.message}`, 'error');
    } finally {
      setLoadingDrafts(false);
    }
  }, [api, addToast, isFinanceOrAdmin]);

  const fetchMajorExceptions = useCallback(async () => {
    setLoadingExceptions(true);
    try {
      const response = await api.get('/wbs/exceptions');
      setMajorExceptions(response.data);
    } catch (e: any) {
      addToast(`Failed to fetch exceptions: ${e.message}`, 'error');
    } finally {
      setLoadingExceptions(false);
    }
  }, [api, addToast]);

  useEffect(() => {
    fetchPendingDrafts();
    fetchMajorExceptions();
  }, [fetchPendingDrafts, fetchMajorExceptions]);

  const handleDecision = async (id: string, decision: 'approve' | 'reject') => {
    setProcessingId(id);
    try {
      await api.patch(`/wbs/budget-drafts/${id}/${decision}`);
      addToast(`Draft ${decision}d successfully.`, 'success');
      // Refresh the list by filtering out the decided draft
      setPendingDrafts(drafts => drafts.filter(draft => draft.wbs_id !== id));
    } catch (e: any) {
      addToast(`Failed to ${decision} draft: ${e.response?.data?.message || e.message}`, 'error');
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <>
      <Head><title>Approvals | SentinelFi</title></Head>
      <PageContainer
        title="Finance Document Approvals"
        subtitle="Review and sanction pending budget drafts and financial exceptions."
        headerContent={<CheckSquare className="w-8 h-8 text-alert-positive" />}
      >
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <Card title="Pending WBS Budget Drafts" subtitle="Requires action for budget items to become active." borderTopColor="positive">
              {!isFinanceOrAdmin ? (
                <p className="p-4 text-center text-red-400 bg-red-900/30 rounded-lg">Access Denied: Only Finance and Admin can approve drafts.</p>
              ) : loadingDrafts ? (
                <p className="p-4 text-center text-brand-primary flex items-center justify-center"><Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading pending drafts...</p>
              ) : pendingDrafts.length === 0 ? (
                <p className="p-4 text-center text-gray-500">No pending drafts at this time. All clear!</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-700">
                    <thead className="bg-brand-dark/80 backdrop-blur-md sticky top-0">
                      <tr>
                        <th className="px-6 py-4 text-left text-[10px] font-black text-gray-500 uppercase tracking-widest">WBS Code</th>
                        <th className="px-6 py-4 text-left text-[10px] font-black text-gray-500 uppercase tracking-widest">Submitter</th>
                        <th className="px-6 py-4 text-left text-[10px] font-black text-gray-500 uppercase tracking-widest">Description</th>
                        <th className="px-6 py-4 text-right text-[10px] font-black text-gray-500 uppercase tracking-widest">Requested Amt</th>
                        <th className="px-6 py-4 text-right text-[10px] font-black text-gray-500 uppercase tracking-widest">Policy Directive</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                      {pendingDrafts.map((draft) => (
                        <tr key={draft.wbs_id} className="hover:bg-white/5 transition border-b border-gray-800/50 last:border-0">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="font-mono text-xs font-black text-brand-primary bg-brand-primary/10 px-2 py-0.5 rounded">{draft.wbs_code}</span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex flex-col">
                              <span className="text-sm font-bold text-gray-200">{draft.user?.email.split('@')[0] || 'N/A'}</span>
                              <span className="text-[10px] text-gray-500 uppercase tracking-tighter">Submitter</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <p className="text-sm text-gray-400 truncate max-w-[200px]">{draft.description}</p>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-white font-black">
                            {formatCurrency(draft.total_cost_budgeted)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right">
                            <div className="flex justify-end items-center gap-2">
                              <Button
                                variant="primary"
                                size="sm"
                                onClick={() => handleDecision(draft.wbs_id, 'approve')}
                                isLoading={processingId === draft.wbs_id}
                                className="bg-alert-positive hover:bg-alert-positive/80 text-black font-black uppercase text-[10px] tracking-widest px-4"
                              >
                                Approve
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDecision(draft.wbs_id, 'reject')}
                                isLoading={processingId === draft.wbs_id}
                                className="text-red-400 hover:bg-red-900/30 font-black uppercase text-[10px] tracking-widest"
                              >
                                Reject
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </div>

          <div className="lg:col-span-1">
            <Card title="Major Variance Exceptions" subtitle="Retrospective approval for unbudgeted expenses." borderTopColor="alert">
              {loadingExceptions ? (
                <p className="p-4 text-center text-brand-primary"><Loader2 className="w-5 h-5 animate-spin inline mr-2" /> Loading...</p>
              ) : majorExceptions.length === 0 ? (
                <p className="p-4 text-center text-gray-500">No major exceptions.</p>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                  {majorExceptions.map((ex) => (
                    <div key={ex.id} className="p-3 bg-brand-dark/50 rounded-lg border border-gray-700 flex flex-col">
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-xs font-bold text-brand-primary">{ex.wbs_code || ex.wbsBudget?.wbs_code}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${ex.variance_flag === 'MAJOR_VARIANCE' ? 'bg-red-900 text-red-300' : 'bg-yellow-900 text-yellow-300'}`}>
                          {ex.variance_flag.replace(/_/g, ' ')}
                        </span>
                      </div>
                      <p className="text-sm text-gray-200 mb-1">{ex.item_description || ex.description}</p>
                      <div className="flex justify-between items-center mt-2">
                        <span className="text-xs text-gray-500">{new Date(ex.expense_date as any).toLocaleDateString()}</span>
                        <span className="text-sm font-bold text-white">{formatCurrency(ex.actual_paid_amount || ex.amount)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </div>
      </PageContainer>
    </>
  );
};

export default ApprovalsPage;
