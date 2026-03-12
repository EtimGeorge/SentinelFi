import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import {
  Calendar,
  Settings,
  Plus,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  ShieldAlert,
  ArrowUpRight,
  Info,
  Layers,
  HelpCircle
} from 'lucide-react';
import { useFinanceCore } from '../../../hooks/useFinanceCore';
import { useCurrency } from '../../../components/context/CurrencyContext';
import PageContainer from '../../../components/Layout/PageContainer';
import Button from '../../../components/common/Button';
import PlanningGrid from '../../../components/budget/PlanningGrid';
import Modal from '../../../components/common/Modal';
import Tooltip from '../../../components/common/Tooltip';
import toast from 'react-hot-toast';

const OpexPlanningPage: React.FC = () => {
  const router = useRouter();
  const { convertToDisplay } = useCurrency();
  const { fetchFiscalYears, fetchDepartments, fetchChartOfAccounts } = useFinanceCore();

  const [fiscalYears, setFiscalYears] = useState<any[]>([]);
  const [selectedFy, setSelectedFy] = useState<any>(null);
  const [departments, setDepartments] = useState<any[]>([]);
  const [coa, setCoa] = useState<any[]>([]);

  // UI State
  const [activeTab, setActiveTab] = useState<'setup' | 'budgeting' | 'review'>('budgeting');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSummaryModalOpen, setIsSummaryModalOpen] = useState(false);

  useEffect(() => {
    const init = async () => {
      const years = await fetchFiscalYears();
      setFiscalYears(years);
      if (years.length > 0) setSelectedFy(years[0]);

      const depts = await fetchDepartments();
      setDepartments(depts);

      const accounts = await fetchChartOfAccounts();
      setCoa(accounts);
    };
    init();
  }, [fetchFiscalYears, fetchDepartments, fetchChartOfAccounts]);

  const handleSubmitToGovernance = async () => {
    setIsSubmitting(true);
    await new Promise(resolve => setTimeout(resolve, 1500));
    setIsSubmitting(false);
    setIsSummaryModalOpen(false);
    toast.success('Planning cycle submitted for Governance Review', {
      duration: 4000,
      icon: '🏛️',
      style: {
        background: '#0f172a',
        color: '#fff',
        border: '1px solid #1e293b'
      }
    });
    setActiveTab('review');
  };

  return (
    <>
      <Head>
        <title>Enterprise OPEX Planning | SentinelFi</title>
      </Head>

      <PageContainer
        title="Enterprise OPEX Planning Matrix"
        subtitle="Manage organizational overhead, departmental targets, and recurring fiscal obligations."
        headerContent={
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push('/financials/operations/setup')}
              icon={<Settings className="w-4 h-4" />}
            >
              Fiscal Setup
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsSummaryModalOpen(true)}
              icon={<ArrowUpRight className="w-4 h-4" />}
            >
              Finalize Planning
            </Button>
          </div>
        }
      >
        {/* Workspace Tab Navigation */}
        <div className="flex bg-slate-900/60 p-1 rounded-2xl border border-white/5 self-start mb-10 backdrop-blur-xl shadow-2xl">
          <button
            onClick={() => setActiveTab('setup')}
            className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${activeTab === 'setup' ? 'bg-brand-primary text-black shadow-[0_0_20px_rgba(var(--brand-primary-rgb),0.4)]' : 'text-slate-500 hover:text-white'}`}
          >
            <Calendar className="w-3.5 h-3.5" />
            Temporal Setup
          </button>
          <button
            onClick={() => setActiveTab('budgeting')}
            className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${activeTab === 'budgeting' ? 'bg-brand-primary text-black shadow-[0_0_20px_rgba(var(--brand-primary-rgb),0.4)]' : 'text-slate-500 hover:text-white'}`}
          >
            <Layers className="w-3.5 h-3.5" />
            Planning Matrix
          </button>
          <button
            onClick={() => setActiveTab('review')}
            className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${activeTab === 'review' ? 'bg-brand-primary text-black shadow-[0_0_20px_rgba(var(--brand-primary-rgb),0.4)]' : 'text-slate-500 hover:text-white'}`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            Governance Audit
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 bg-slate-900/30 backdrop-blur-md border border-slate-800 rounded-3xl overflow-hidden shadow-2xl min-h-[600px] flex flex-col relative group">
          <div className="absolute top-0 right-0 w-96 h-96 bg-brand-primary/5 rounded-full -mr-48 -mt-48 blur-3xl opacity-50 pointer-events-none" />

          {activeTab === 'setup' ? (
            <div className="p-12 max-w-2xl mx-auto text-center space-y-6 flex-1 flex flex-col justify-center relative z-10">
              <div className="w-20 h-20 bg-blue-500/10 rounded-3xl flex items-center justify-center mx-auto text-blue-400 border border-blue-500/20 shadow-[0_0_30px_rgba(59,130,246,0.1)]">
                <Calendar className="w-10 h-10" />
              </div>
              <div>
                <div className="flex items-center justify-center gap-2 mb-2">
                  <h3 className="text-2xl font-black text-white uppercase tracking-tighter">Temporal Configuration</h3>
                  <Tooltip content="Define the fiscal boundaries and reporting periods. This setup is critical for chronological accuracy in your operational planning.">
                    <HelpCircle className="w-4 h-4 text-slate-600 hover:text-brand-primary transition cursor-help" />
                  </Tooltip>
                </div>
                <p className="text-slate-400 text-sm mt-3 font-medium leading-relaxed max-w-sm mx-auto">Configure the active fiscal year and reporting cycles before entering budget targets.</p>
              </div>
              <div className="flex justify-center gap-3 pt-4">
                <Button
                  variant="primary"
                  className="px-10 h-12 text-black font-black uppercase tracking-widest text-[10px]"
                  onClick={() => router.push('/financials/operations/setup')}
                >
                  Initialize Fiscal Cycle
                </Button>
              </div>
            </div>
          ) : activeTab === 'budgeting' ? (
            <div className="flex-1 overflow-hidden relative z-10">
              {coa.length > 0 ? (
                <PlanningGrid coa={coa} departments={departments} fiscalYear={selectedFy} />
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center p-20 text-center">
                  <div className="w-16 h-16 rounded-full bg-slate-900 flex items-center justify-center text-slate-700 mb-4 border border-slate-800">
                    <Info size={32} />
                  </div>
                  <h3 className="text-lg font-black text-slate-300 uppercase tracking-tighter">No Chart Architecture</h3>
                  <p className="text-slate-500 text-sm mt-1 max-w-xs">Connecting with core Ledger system...</p>
                </div>
              )}
            </div>
          ) : (
            <div className="p-12 text-center space-y-6 flex-1 flex flex-col justify-center relative z-10">
              <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto text-emerald-500 border border-emerald-500/20 shadow-[0_0_30px_rgba(16,185,129,0.1)]">
                <ShieldCheck className="w-10 h-10" />
              </div>
              <div>
                <div className="flex items-center justify-center gap-2 mb-2">
                  <h3 className="text-3xl font-black text-white uppercase tracking-tighter">Plan Lock Active</h3>
                  <Tooltip content="Operational targets are currently being reviewed by the Governance Desk. Modifications are restricted to preserve the audit trail.">
                    <ShieldAlert className="w-5 h-5 text-yellow-500 hover:scale-110 transition cursor-help" />
                  </Tooltip>
                </div>
                <p className="text-slate-400 text-sm mt-3 font-medium max-w-md mx-auto leading-relaxed">
                  The current Enterprise OPEX configuration is under Governance Review. No further modifications are permitted during this phase.
                </p>
              </div>
              <div className="flex justify-center gap-3 pt-6">
                <Button variant="outline" className="px-8 border-slate-700" onClick={() => setActiveTab('budgeting')}>Review Snapshot</Button>
                <Button variant="outline" className="px-8 border-slate-700">Download PDF Dossier</Button>
              </div>
            </div>
          )}
        </div>
      </PageContainer>

      {/* Submission Summary Modal */}
      <Modal
        isOpen={isSummaryModalOpen}
        onClose={() => setIsSummaryModalOpen(false)}
        title="Enterprise Governance Summary"
        size="lg"
      >
        <div className="space-y-8 pt-4">
          <div className="p-6 bg-brand-primary/5 border border-brand-primary/10 rounded-2xl flex gap-5 items-start">
            <div className="p-3.5 bg-brand-primary/10 rounded-xl text-brand-primary shadow-inner">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-[11px] font-black text-white uppercase tracking-[0.2em] mb-1.5">Final Validation Protocol</h4>
              <p className="text-xs text-slate-400 leading-relaxed font-semibold">
                Submission will freeze this planning version and transmit detailed targets to the Governance Desk.
                Ensure all scenario modeling adjustments and departmental rollups are verified for the current cycle.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="bg-slate-950/60 p-6 rounded-2xl border border-slate-800 shadow-inner group">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 group-hover:text-slate-400 transition">Master OPEX Target</p>
              <p className="text-3xl font-black text-white tracking-tighter italic">₦ 0.00</p>
            </div>
            <div className="bg-slate-950/60 p-6 rounded-2xl border border-slate-800 shadow-inner group">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 group-hover:text-slate-400 transition">Active Depts Rolling Up</p>
              <p className="text-3xl font-black text-white tracking-tighter italic">{departments.length}</p>
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Governance Attestations</h4>
            <div className="space-y-3">
              <div className="flex items-center gap-4 p-4 bg-slate-950/40 border border-slate-800 rounded-xl group hover:border-brand-primary/30 transition cursor-pointer">
                <div className="w-5 h-5 rounded-full border-2 border-slate-800 group-hover:border-brand-primary transition flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-brand-primary" />
                </div>
                <p className="text-[11px] text-slate-300 font-bold uppercase tracking-tight">I attest overhead Targets align with 2026 Strategic Mandate.</p>
              </div>
              <div className="flex items-center gap-4 p-4 bg-slate-950/40 border border-slate-800 rounded-xl group hover:border-brand-primary/30 transition cursor-pointer">
                <div className="w-5 h-5 rounded-full border-2 border-slate-800 group-hover:border-brand-primary transition flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-brand-primary" />
                </div>
                <p className="text-[11px] text-slate-300 font-bold uppercase tracking-tight">Departmental allocations have been peer-reviewed and signed off.</p>
              </div>
            </div>
          </div>

          <div className="flex gap-4 justify-end pt-8 border-t border-white/[0.03]">
            <Button variant="outline" className="px-10 border-slate-800 h-12 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-white" onClick={() => setIsSummaryModalOpen(false)}>Back to Matrix</Button>
            <Button
              variant="primary"
              className="px-12 h-12 font-black uppercase tracking-widest text-[10px] shadow-[0_0_20px_rgba(var(--brand-primary-rgb),0.3)]"
              onClick={handleSubmitToGovernance}
              isLoading={isSubmitting}
              icon={<ArrowUpRight className="w-4 h-4" />}
            >
              {isSubmitting ? 'Transmitting...' : 'Seal & Submit to Governance'}
            </Button>
          </div>
        </div>
      </Modal>

      <style jsx global>{`
        .glass-card {
           background: rgba(15, 23, 42, 0.4);
           backdrop-filter: blur(12px);
           border: 1px solid rgba(255, 255, 255, 0.05);
        }
      `}</style>
    </>
  );
};

export default OpexPlanningPage;
