import React, { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import PageContainer from '../components/Layout/PageContainer';
import { CheckSquare, AlertTriangle, FileText, Loader2 } from 'lucide-react';
import Card from '../components/common/Card';
import { formatCurrency } from '../lib/utils';
import { useAuth, Role } from '../components/context/AuthContext';
import { useSecuredApi } from '../components/hooks/useSecuredApi';

// ... (interfaces remain the same)

const ApprovalsPage: React.FC = () => {
    // ... (hooks and state remain the same)

    const fetchPendingDrafts = useCallback(async () => {
        // ... (function logic remains the same)
    }, [api, isFinanceOrAdmin]);

    const fetchMajorExceptions = useCallback(async () => {
        // ... (function logic remains the same)
    }, [api]);

    useEffect(() => {
        fetchPendingDrafts();
        fetchMajorExceptions();
    }, [fetchPendingDrafts, fetchMajorExceptions]);

    const handleApproveDraft = async (id: string) => {
        // ... (function logic remains the same)
    };

    const handleRejectDraft = async (id: string) => {
        // ... (function logic remains the same)
    };

  return (
    <>
      <Head><title>Approvals | SentinelFi</title></Head>
      <PageContainer
        title="Finance Document Approvals"
        subtitle="Review and sanction pending budget drafts and financial exceptions."
        headerContent={<CheckSquare className="w-8 h-8 text-alert-positive" />}
      >
        {message && (
          <div className={`p-3 mb-4 rounded-lg text-sm ${message.type === 'success' ? 'bg-green-900 text-alert-positive' : 'bg-red-900 text-red-400'}`}>
            {message.text}
          </div>
        )}

        {/* Main Grid: Pending Queue and Exception Summary */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left (Span 2): Pending Drafts Queue */}
          <div className="lg:col-span-2">
              <Card title="Pending WBS Budget Drafts" subtitle="Requires action before the budget item is available for expense tracking." borderTopColor="positive">
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
                                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase">Budgeted Amount</th>
                                      <th className="px-6 py-3 text-right">Actions</th>
                                  </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-700">
                                  {pendingDrafts.map((draft) => (
                                      <tr key={draft.wbs_id} className="hover:bg-gray-700/50 transition">
                                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-brand-primary">{draft.wbs_code}</td>
                                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{draft.user.email}</td>
                                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{draft.description}</td>
                                          <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-white">{formatCurrency(draft.total_cost_budgeted)}</td>
                                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                                              <button 
                                                  onClick={() => handleApproveDraft(draft.wbs_id)} 
                                                  disabled={processingId === draft.wbs_id}
                                                  className="text-alert-positive hover:text-white transition"
                                              >
                                                  {processingId === draft.wbs_id ? <Loader2 className="w-4 h-4 inline animate-spin" /> : 'Approve'}
                                              </button>
                                              <button 
                                                  onClick={() => handleRejectDraft(draft.wbs_id)}
                                                  disabled={processingId === draft.wbs_id}
                                                  className="text-red-500 hover:text-white transition"
                                              >
                                                  {processingId === draft.wbs_id ? <Loader2 className="w-4 h-4 inline animate-spin" /> : 'Reject'}
                                              </button>
                                          </td>
                                      </tr>
                                  ))}
                              </tbody>
                          </table>
                      </div>
                  )}
              </Card>
          </div>

          {/* Right (Span 1): Exception Summary */}
          <div className="lg:col-span-1">
              <Card title="Major Variance Exceptions" subtitle="Unbudgeted or over-threshold expenses requiring retrospective approval." borderTopColor="alert">
                  {loadingExceptions ? (
                      <p className="p-4 text-center text-brand-primary flex items-center justify-center"><Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading exceptions...</p>
                  ) : majorExceptions.length === 0 ? (
                      <p className="p-4 text-center text-gray-500">No major variance exceptions at this time. All clear!</p>
                  ) : (
                      <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                          {majorExceptions.map((exp) => (
                              <div key={exp.id} className="p-3 bg-brand-dark/50 rounded-lg border border-gray-700">
                                  <p className="font-bold text-lg text-alert-critical">{exp.wbs_code}</p>
                                  <p className="text-gray-300">{exp.item_description}</p>
                                  <p className="text-sm text-gray-400 mt-1 flex items-center">
                                    Amount: {formatCurrency(exp.actual_paid_amount)} ({exp.variance_flag.replace('_', ' ')})
                                    {/* Placeholder for future detailed expense link */}
                                    <FileText className="w-4 h-4 ml-2 text-brand-primary cursor-pointer" title="View Expense Details" />
                                  </p>
                              </div>
                          ))}
                      </div>
                  )}
                  {majorExceptions.length > 0 && (
                      <Link href="/reporting/exceptions" className="mt-4 w-full py-2 bg-red-900/50 text-red-400 rounded-lg hover:bg-red-900 transition flex items-center justify-center">
                        <FileText className="w-5 h-5 mr-2" /> View Full Exception Log
                      </Link>
                  )}
              </Card>
          </div>
        </div>
      </PageContainer>
    </>
  );
};

export default ApprovalsPage;