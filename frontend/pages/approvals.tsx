import React, { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import PageContainer from '../components/Layout/PageContainer';
import { CheckSquare, AlertTriangle, FileText, Loader2 } from 'lucide-react';
import Card from '../components/common/Card';
import Button from '../components/common/Button'; // Use enhanced Button
import { formatCurrency } from '../lib/utils';
import { useAuth } from '../components/context/AuthContext';
import { Role as UserRoleEnum } from '../../shared/types/role.enum';
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
}

const ApprovalsPage: React.FC = () => {
  const { user } = useAuth();
  const api = useSecuredApi();
  const addToast = useToast(state => state.addToast);
  
  const [pendingDrafts, setPendingDrafts] = useState<PendingDraft[]>([]);
  const [loadingDrafts, setLoadingDrafts] = useState(true);
  const [majorExceptions, setMajorExceptions] = useState<MajorException[]>([]);
  const [loadingExceptions, setLoadingExceptions] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const isFinanceOrAdmin = user?.role === UserRoleEnum.Finance || user?.role === UserRoleEnum.Admin;

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
    // Placeholder for fetching major exceptions
    setLoadingExceptions(true);
    // try { ... } catch { ... }
    setMajorExceptions([]); // Mocking empty for now
    setLoadingExceptions(false);
  }, []);

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
                    <thead className="bg-brand-dark/50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">WBS Code</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Submitter</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Description</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase">Amount</th>
                        <th className="px-6 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                      {pendingDrafts.map((draft) => (
                        <tr key={draft.wbs_id} className="hover:bg-gray-800/50 transition">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-brand-primary">{draft.wbs_code}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{draft.user?.email || 'N/A'}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{draft.description}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-white">{formatCurrency(draft.total_cost_budgeted)}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDecision(draft.wbs_id, 'approve')}
                              isLoading={processingId === draft.wbs_id}
                              className="text-alert-positive hover:text-white"
                            >
                              Approve
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDecision(draft.wbs_id, 'reject')}
                              isLoading={processingId === draft.wbs_id}
                              className="text-red-500 hover:text-white"
                            >
                              Reject
                            </Button>
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
                  {/* Render exceptions here */}
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
