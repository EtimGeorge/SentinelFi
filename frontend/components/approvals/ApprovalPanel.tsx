import React from 'react';
import { AlertTriangle, CheckCircle, XCircle, Info, TrendingUp, TrendingDown, Zap, Brain, ChevronLeft, ChevronRight } from 'lucide-react';
import Button from '../common/Button';
import { useCurrency } from '../context/CurrencyContext';

interface Anomaly {
  type: 'variance' | 'threshold' | 'pattern' | 'forecast';
  severity: 'critical' | 'warning' | 'info';
  message: string;
  field: string;
  currentValue: number;
  expectedValue?: number;
  variance?: number;
}

interface BudgetSummary {
  wbs_id: string;
  wbs_code: string;
  description: string;
  total_cost_budgeted: number;
  total_paid_rollup: number;
  total_committed_lpo: number;
  project_id: string;
  project_name: string;
  project_currency: string;
  category_name: string;
  quantity_budgeted: number;
  uom: string;
  unit_cost_budgeted: number;
  days_budgeted: number;
  status: string;
  custom_metadata?: Record<string, any>;
}

interface ApprovalPanelProps {
  budget: BudgetSummary;
  anomalies: Anomaly[];
  onApprove: (comment?: string) => void;
  onReject: (comment: string) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

const severityStyles: Record<string, { bg: string; text: string; border: string; icon: React.ReactNode }> = {
  critical: { bg: 'bg-red-900/30', text: 'text-red-400', border: 'border-red-700/50', icon: <AlertTriangle className="w-4 h-4" /> },
  warning: { bg: 'bg-yellow-900/30', text: 'text-yellow-400', border: 'border-yellow-700/50', icon: <TrendingUp className="w-4 h-4" /> },
  info: { bg: 'bg-blue-900/30', text: 'text-blue-400', border: 'border-blue-700/50', icon: <Info className="w-4 h-4" /> },
};

const AnomalyBadge: React.FC<{ anomaly: Anomaly }> = ({ anomaly }) => {
  const styles = severityStyles[anomaly.severity];
  const { convertToDisplay } = useCurrency();
  
  return (
    <div className={`flex items-start gap-3 p-4 rounded-xl border ${styles.bg} ${styles.border}`}>
      <div className="flex-shrink-0 mt-0.5">{styles.icon}</div>
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-bold r {styles.text}">{anomaly.type.toUpperCase()}</span>
          <span className="text-xs font-medium text-gray-400">{anomaly.field}</span>
        </div>
        <p className="text-sm text-gray-300">{anomaly.message}</p>
        <div className="flex items-center gap-4 mt-2 text-xs">
          <span className="flex items-center gap-1 text-gray-500">
            <TrendingDown className="w-3 h-3" /> Current: {convertToDisplay(anomaly.currentValue, 'NGN')}
          </span>
          {anomaly.expectedValue !== undefined && (
            <span className="flex items-center gap-1 text-gray-500">
              <TrendingUp className="w-3 h-3" /> Expected: {convertToDisplay(anomaly.expectedValue, 'NGN')}
            </span>
          )}
          {anomaly.variance !== undefined && (
            <span className={`flex items-center gap-1 font-bold ${anomaly.variance > 0 ? 'text-red-400' : 'text-green-400'}`}>
              <Zap className="w-3 h-3" /> Variance: {anomaly.variance > 0 ? '+' : ''}{anomaly.variance.toFixed(1)}%
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

const KPIWithAnomaly: React.FC<{
  label: string;
  value: number;
  currency: string;
  anomaly?: Anomaly;
  helpText?: string;
}> = ({ label, value, currency, anomaly, helpText }) => {
  const { convertToDisplay } = useCurrency();
  const styles = anomaly ? severityStyles[anomaly.severity] : null;

  return (
    <div className={`p-4 rounded-xl border ${anomaly ? `${styles!.bg} ${styles!.border}` : 'bg-gray-800 border-gray-700'} relative group`}>
      {anomaly && (
        <div className="absolute -top-2 -right-2">
          <button className="p-1.5 bg-black/50 rounded-full hover:bg-black/70 transition-opacity opacity-0 group-hover:opacity-100">
            <Brain className="w-4 h-4" style={{ color: styles!.text.replace('text-', '') }} />
          </button>
        </div>
      )}
      <p className="text-xs font-bold text-gray-500 r mb-1">{label}</p>
      <p className="text-2xl font-black text-white mb-1">{convertToDisplay(value, currency)}</p>
      {helpText && <p className="text-xs text-gray-500">{helpText}</p>}
      {anomaly && (
        <div className="mt-3 pt-3 border-t border-white/10">
          <AnomalyBadge anomaly={anomaly} />
        </div>
      )}
    </div>
  );
};

export const ApprovalPanel: React.FC<ApprovalPanelProps> = ({
  budget,
  anomalies,
  onApprove,
  onReject,
  onCancel,
  isLoading = false,
}) => {
  const { convertToDisplay } = useCurrency();
  const [showComment, setShowComment] = React.useState<'approve' | 'reject' | null>(null);
  const [comment, setComment] = React.useState('');
  const [activeTab, setActiveTab] = React.useState<'overview' | 'anomalies' | 'details'>('overview');

  const variance = budget.total_cost_budgeted > 0 
    ? ((budget.total_cost_budgeted - budget.total_paid_rollup) / budget.total_cost_budgeted) * 100 
    : 0;
  const burnRate = budget.total_cost_budgeted > 0 
    ? (budget.total_paid_rollup / budget.total_cost_budgeted) * 100 
    : 0;

  const varianceAnomaly = anomalies.find(a => a.field.toLowerCase().includes('variance'));
  const burnAnomaly = anomalies.find(a => a.field.toLowerCase().includes('burn') || a.field.toLowerCase().includes('rate'));
  const commitAnomaly = anomalies.find(a => a.field.toLowerCase().includes('commit') || a.field.toLowerCase().includes('lpo'));

  const handleSubmitApprove = () => {
    onApprove(comment);
    setShowComment(null);
    setComment('');
  };

  const handleSubmitReject = () => {
    if (!comment.trim()) return;
    onReject(comment);
    setShowComment(null);
    setComment('');
  };

  return (
    <div className="bg-brand-dark/50 rounded-2xl border border-gray-700 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-700 bg-black/20">
        <div>
          <p className="text-xs font-bold text-gray-500 r">Approval Review</p>
          <h3 className="text-lg font-black text-white">{budget.wbs_code} — {budget.description}</h3>
          <p className="text-xs text-gray-500 mt-0.5">{budget.project_name} · {budget.category_name}</p>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
          budget.status === 'pending' ? 'bg-yellow-900/30 text-yellow-400 border border-yellow-700/50' :
          budget.status === 'approved' ? 'bg-green-900/30 text-green-400' :
          'bg-red-900/30 text-red-400'
        }`}>
          {budget.status.toUpperCase()}
        </span>
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b border-gray-700 px-4">
        {[
          { id: 'overview', label: 'Overview', icon: <Info className="w-4 h-4" /> },
          { id: 'anomalies', label: `AI Anomalies ${anomalies.length > 0 ? `(${anomalies.length})` : ''}`, icon: <Brain className="w-4 h-4" /> },
          { id: 'details', label: 'Details', icon: <Zap className="w-4 h-4" /> },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-brand-primary text-brand-primary'
                : 'border-transparent text-gray-500 hover:text-gray-300'
            }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="p-4">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* KPI Cards with AI Anomalies */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <KPIWithAnomaly
                label="Budgeted"
                value={budget.total_cost_budgeted}
                currency={budget.project_currency}
                anomaly={varianceAnomaly}
                helpText="Total approved budget"
              />
              <KPIWithAnomaly
                label="Actual Spent"
                value={budget.total_paid_rollup}
                currency={budget.project_currency}
                anomaly={burnAnomaly}
                helpText="Total paid to date"
              />
              <KPIWithAnomaly
                label="Committed (LPO)"
                value={budget.total_committed_lpo}
                currency={budget.project_currency}
                anomaly={commitAnomaly}
                helpText="Committed not yet paid"
              />
              <KPIWithAnomaly
                label={anomalies.some(a => a.type === 'forecast') ? 'Forecast' : 'Variance'}
                value={budget.total_cost_budgeted - budget.total_paid_rollup}
                currency={budget.project_currency}
                anomaly={anomalies.find(a => a.type === 'forecast')}
                helpText={anomalies.some(a => a.type === 'forecast') ? 'AI projected expenditure' : 'Remaining budget'}
              />
            </div>

            {/* Variance & Burn Rate Indicators */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-gray-800 border border-gray-700 rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-gray-500 uppercase">Budget Variance</span>
                  <span className={`text-sm font-bold ${variance >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {variance >= 0 ? '+' : ''}{variance.toFixed(1)}%
                  </span>
                </div>
                <div className="w-full bg-gray-700 h-3 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-1000 ${variance < 0 ? 'bg-red-500' : 'bg-green-500'}`}
                    style={{ width: `${Math.min(100, Math.max(0, 50 + variance / 2))}%` }}
                  ></div>
                </div>
                <p className="text-xs text-gray-500 mt-2 text-center">
                  {variance >= 0 ? 'Under budget' : 'Over budget'} by {convertToDisplay(Math.abs(budget.total_cost_budgeted - budget.total_paid_rollup), budget.project_currency)}
                </p>
              </div>

              <div className="p-4 bg-gray-800 border border-gray-700 rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-gray-500 uppercase">Burn Rate</span>
                  <span className={`text-sm font-bold ${burnRate > 90 ? 'text-red-400' : burnRate > 70 ? 'text-yellow-400' : 'text-green-400'}`}>
                    {burnRate.toFixed(1)}%
                  </span>
                </div>
                <div className="w-full bg-gray-700 h-3 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-1000 ${burnRate > 90 ? 'bg-red-500' : burnRate > 70 ? 'bg-yellow-500' : 'bg-green-500'}`}
                    style={{ width: `${Math.min(100, burnRate)}%` }}
                  ></div>
                </div>
                <p className="text-xs text-gray-500 mt-2 text-center">
                  {burnRate > 90 ? 'Critical — immediate review required' : burnRate > 70 ? 'Elevated — monitor closely' : 'Within normal range'}
                </p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'anomalies' && (
          <div className="space-y-4">
            {anomalies.length === 0 ? (
              <div className="text-center py-12">
                <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <h4 className="text-lg font-bold text-white mb-2">No Anomalies Detected</h4>
                <p className="text-gray-500">AI analysis found no significant variances, threshold breaches, or unusual patterns.</p>
              </div>
            ) : (
              anomalies.map((anomaly, index) => (
                <AnomalyBadge key={index} anomaly={anomaly} />
              ))
            )}
          </div>
        )}

        {activeTab === 'details' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-gray-800 border border-gray-700 rounded-xl">
                <p className="text-xs font-bold text-gray-500 r mb-3">Budget Breakdown</p>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between"><span className="text-gray-400">Unit Cost</span><span className="font-mono text-white">{convertToDisplay(budget.unit_cost_budgeted, budget.project_currency)}</span></div>
                  <div className="flex justify-between"><span className="text-gray-400">Quantity</span><span className="font-mono text-white">{budget.quantity_budgeted} {budget.uom}</span></div>
                  <div className="flex justify-between"><span className="text-gray-400">Duration</span><span className="font-mono text-white">{budget.days_budgeted} days</span></div>
                  <div className="flex justify-between pt-2 border-t border-gray-700"><span className="font-medium text-gray-300">Total</span><span className="font-bold text-white">{convertToDisplay(budget.total_cost_budgeted, budget.project_currency)}</span></div>
                </div>
              </div>

              <div className="p-4 bg-gray-800 border border-gray-700 rounded-xl">
                <p className="text-xs font-bold text-gray-500 r mb-3">Metadata</p>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-gray-400">WBS ID</span><span className="font-mono text-white">{budget.wbs_id}</span></div>
                  <div className="flex justify-between"><span className="text-gray-400">Project</span><span className="font-medium text-white">{budget.project_name}</span></div>
                  <div className="flex justify-between"><span className="text-gray-400">Category</span><span className="font-medium text-white">{budget.category_name}</span></div>
                  {budget.custom_metadata && Object.entries(budget.custom_metadata).map(([k, v]) => (
                    <div key={k} className="flex justify-between"><span className="text-gray-400 capitalize">{k.replace(/_/g, ' ')}</span><span className="font-mono text-white">{String(v)}</span></div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-gray-700 flex-wrap">
          <Button variant="ghost" onClick={onCancel} disabled={isLoading}>
            Cancel
          </Button>
          {showComment === 'reject' && (
            <>
              <input
                type="text"
                value={comment}
                onChange={e => setComment(e.target.value)}
                placeholder="Rejection reason (required)"
                className="w-full sm:w-auto flex-1 sm:flex-none min-w-0 sm:min-w-[300px] px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                autoFocus
              />
              <Button variant="secondary" onClick={() => setShowComment(null)}>Cancel</Button>
              <Button variant="danger" onClick={handleSubmitReject} disabled={isLoading || !comment.trim()}>
                <XCircle className="w-4 h-4 mr-2" /> Confirm Reject
              </Button>
            </>
          )}
          {showComment === 'approve' && (
            <>
              <input
                type="text"
                value={comment}
                onChange={e => setComment(e.target.value)}
                placeholder="Approval comment (optional)"
                className="w-full sm:w-auto flex-1 sm:flex-none min-w-0 sm:min-w-[300px] px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                autoFocus
              />
              <Button variant="secondary" onClick={() => setShowComment(null)}>Cancel</Button>
              <Button variant="primary" onClick={handleSubmitApprove} disabled={isLoading}>
                <CheckCircle className="w-4 h-4 mr-2" /> Confirm Approve
              </Button>
            </>
          )}
          {!showComment && (
            <>
              <Button variant="outline" onClick={() => setShowComment('reject')} disabled={isLoading}>
                <XCircle className="w-4 h-4 mr-2" /> Reject
              </Button>
              <Button variant="primary" onClick={() => setShowComment('approve')} disabled={isLoading}>
                <CheckCircle className="w-4 h-4 mr-2" /> Approve
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ApprovalPanel;