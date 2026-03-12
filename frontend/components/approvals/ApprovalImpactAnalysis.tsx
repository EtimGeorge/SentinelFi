import React from 'react';
import Card from '../common/Card';
import {
  AlertTriangle,
  TrendingUp,
  ShieldCheck,
  History,
  DollarSign,
  Zap
} from 'lucide-react';
import { formatCurrency } from '../../lib/utils';

export interface BudgetImpactAnalysisData {
  draftId: string;
  projectId: string;
  projectName: string;
  draftAmount: number;
  totalApprovedAmount: number;
  totalPendingAmount: number;
  contractValue: number;
  newTotalIfApproved: number;
  remainingContractBuffer: number;
  percentageOfContractValue: number;
  estimatedVatImpact: number;
  estimatedWhtImpact: number;
  volatilityScore: number;
  previousRejectionsCount: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  categoryName?: string;
}

interface ApprovalImpactAnalysisProps {
  data: BudgetImpactAnalysisData;
  currency: string;
}

const ApprovalImpactAnalysis: React.FC<ApprovalImpactAnalysisProps> = ({ data, currency }) => {
  const getRiskColor = (level: string) => {
    switch (level) {
      case 'CRITICAL': return 'text-red-500 bg-red-900/40 border-red-500/50';
      case 'HIGH': return 'text-orange-500 bg-orange-900/40 border-orange-500/50';
      case 'MEDIUM': return 'text-yellow-500 bg-yellow-900/40 border-yellow-500/50';
      default: return 'text-alert-positive bg-emerald-900/40 border-emerald-500/50';
    }
  };

  const isHighRisk = data.riskLevel === 'HIGH' || data.riskLevel === 'CRITICAL';

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
      {/* Risk Assessment Header */}
      <div className={`p-4 rounded-xl border-l-4 flex items-start gap-4 ${getRiskColor(data.riskLevel)}`}>
        <div className="mt-1">
          {isHighRisk ? <AlertTriangle className="w-6 h-6" /> : <ShieldCheck className="w-6 h-6" />}
        </div>
        <div className="flex-1">
          <div className="flex justify-between items-center mb-1">
            <h3 className="font-black uppercase text-xs tracking-widest">Decision Support Analysis</h3>
            <span className="font-black text-[10px] bg-black/40 px-2 py-0.5 rounded uppercase">{data.riskLevel} RISK</span>
          </div>
          <p className="text-sm font-bold opacity-90">
            {data.riskLevel === 'CRITICAL'
              ? `CAUTION: This approval will exceed the project's contract value by ${formatCurrency(Math.abs(data.remainingContractBuffer), currency)}.`
              : data.riskLevel === 'HIGH'
                ? `WARNING: Project budget is reaching 90% utilization. Exercise financial restraint.`
                : `Approval is within safe financial bounds of the ${data.projectName} project.`}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Core Metrics */}
        <Card title="Financial Context" borderTopColor="primary" className="bg-brand-dark/20">
          <div className="space-y-4">
            <div className="flex justify-between text-xs">
              <span className="text-gray-500 font-bold uppercase">Contract Value</span>
              <span className="text-white font-black">{formatCurrency(data.contractValue, currency)}</span>
            </div>
            <div className="w-full bg-gray-800 h-1.5 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-1000 ${isHighRisk ? 'bg-red-500' : 'bg-brand-primary'}`}
                style={{ width: `${Math.min(100, data.percentageOfContractValue)}%` }}
              />
            </div>

            <div className="grid grid-cols-2 gap-4 pt-2 border-t border-gray-800">
              <div>
                <p className="text-[10px] text-gray-500 uppercase font-black mb-1">Cumulative Approved</p>
                <p className="text-sm font-bold text-gray-300">{formatCurrency(data.totalApprovedAmount, currency)}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-gray-500 uppercase font-black mb-1">Impact of this Draft</p>
                <p className="text-sm font-bold text-brand-primary">+{formatCurrency(data.draftAmount, currency)}</p>
              </div>
            </div>
          </div>
        </Card>

        {/* Intelligence / Historical Factors */}
        <Card title="Risk Intelligence" borderTopColor="alert" className="bg-brand-dark/20">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gray-800 rounded-lg">
                <History className="w-4 h-4 text-alert-warning" />
              </div>
              <div>
                <p className="text-xs font-bold text-gray-200">Historical Volatility</p>
                <p className="text-[10px] text-gray-500 uppercase font-black">
                  {data.previousRejectionsCount > 0
                    ? `${data.previousRejectionsCount} Prev. Rejection(s) Detected`
                    : 'Stable Revision History'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="p-2 bg-gray-800 rounded-lg">
                <Zap className="w-4 h-4 text-brand-primary" />
              </div>
              <div>
                <p className="text-xs font-bold text-gray-200">Volatility Score: {data.volatilityScore}</p>
                <p className="text-[10px] text-gray-500 uppercase font-black">Rating: {data.volatilityScore > 50 ? 'High Activity' : 'Low Activity'}</p>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-800">
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-500 font-bold uppercase">Tax Projection (Estimated)</span>
                <span className="text-gray-300 font-bold">
                  {formatCurrency(data.estimatedVatImpact + data.estimatedWhtImpact, currency)}
                </span>
              </div>
              <p className="text-[9px] text-gray-600 mt-1 italic uppercase">Includes VAT and WHT impact on cashflow</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Proactive Recommendation */}
      <div className="bg-brand-primary/5 border border-brand-primary/20 rounded-xl p-4 flex items-center gap-4">
        <TrendingUp className="w-5 h-5 text-brand-primary shrink-0" />
        <p className="text-xs text-gray-400 leading-relaxed font-medium">
          <span className="text-brand-primary font-black uppercase mr-2 italic">Recommendation:</span>
          {isHighRisk
            ? "Requires senior managerial validation. Consider reallocation from non-critical WBS nodes rather than absolute budget expansion."
            : "Approval remains aligned with project cost baselines. Standard processing recommended."}
        </p>
      </div>
    </div>
  );
};

export default ApprovalImpactAnalysis;
