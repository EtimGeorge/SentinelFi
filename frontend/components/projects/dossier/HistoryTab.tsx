import React from 'react';
import Card from '../../common/Card';
import { useCurrency } from '../../context/CurrencyContext';
import { History } from 'lucide-react';
import { ProjectDetail, AuditLog } from './types';

interface HistoryTabProps {
  project: ProjectDetail;
  audits: AuditLog[];
}

const CHANGE_TYPE_STYLES: Record<string, string> = {
  CONTRACT_VALUE_CHANGE: 'bg-blue-900/20 text-blue-400',
  LPO_CREATED: 'bg-teal-900/20 text-teal-400',
  LPO_PENDING_APPROVAL: 'bg-yellow-900/20 text-yellow-400',
  LPO_APPROVED: 'bg-green-900/20 text-green-400',
  LPO_REJECTED: 'bg-red-900/20 text-red-400',
  LPO_PAYMENT: 'bg-emerald-900/20 text-emerald-400',
  LPO_CANCELLED: 'bg-orange-900/20 text-orange-400',
  LPO_UPDATED: 'bg-gray-800 text-gray-400',
  INFLOW_CREATED: 'bg-purple-900/20 text-purple-400',
  INFLOW_UPDATED: 'bg-purple-900/20 text-purple-400',
  INFLOW_DELETED: 'bg-rose-900/20 text-rose-400',
};

const HistoryTab: React.FC<HistoryTabProps> = ({ project, audits }) => {
  const { convertToDisplay } = useCurrency();
  const currency = project.currency || 'NGN';

  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
      <Card title="Project Audit Trail" accent="primary" className="border border-gray-700 bg-brand-dark/10">
        <p className="text-sm text-gray-400 mb-6">Tracking scope creep and significant financial adjustments.</p>
        {audits.length === 0 ? (
          <div className="p-10 text-center border-2 border-dashed border-gray-800 rounded-xl text-gray-500">
            No significant changes recorded yet.
          </div>
        ) : (
          <div className="space-y-4">
            {audits.map(audit => (
              <div key={audit.id} className="p-4 bg-brand-dark/50 rounded-xl border border-gray-800 flex items-start space-x-4">
                <div className={`p-2 rounded-lg ${CHANGE_TYPE_STYLES[audit.change_type] || 'bg-gray-800 text-gray-400'}`}>
                  <History className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold uppercase text-brand-secondary ">{audit.change_type.replace(/_/g, ' ')}</span>
                    <span className="text-xs text-gray-600 font-mono">{new Date(audit.created_at).toLocaleString()}</span>
                  </div>
                  <p className="text-sm text-white mt-1">{audit.description}</p>
                  <div className="mt-2 flex items-center space-x-4">
                    {audit.old_value !== null && (
                      <div className="text-xs">
                        <span className="text-gray-500 mr-2">Old:</span>
                        <span className="text-gray-400 font-mono">{convertToDisplay(audit.old_value, currency)}</span>
                      </div>
                    )}
                    {audit.new_value !== null && (
                      <div className="text-xs">
                        <span className="text-gray-500 mr-2">New:</span>
                        <span className="text-brand-primary font-mono font-bold">{convertToDisplay(audit.new_value, currency)}</span>
                      </div>
                    )}
                  </div>
                  <div className="mt-2 text-xs text-gray-600">Performed by: {audit.performedBy?.email}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};

export default HistoryTab;