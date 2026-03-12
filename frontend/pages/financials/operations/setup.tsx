import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import {
  Calendar,
  Plus,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  RefreshCcw,
  ShieldCheck
} from 'lucide-react';
import { useFinanceCore } from '../../../hooks/useFinanceCore';
import api from '../../../lib/api';
import { useCurrency } from '../../../components/context/CurrencyContext';
import PageContainer from '../../../components/Layout/PageContainer';
import Card from '../../../components/common/Card';
import Button from '../../../components/common/Button';
import Input from '../../../components/common/Input';
import toast from 'react-hot-toast';

const FiscalYearSetupPage: React.FC = () => {
  const router = useRouter();
  const { convertToDisplay } = useCurrency();
  const { loading: coreLoading, fetchFiscalYears, createFiscalYear } = useFinanceCore();
  const [fiscalYears, setFiscalYears] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [label, setLabel] = useState('2026');
  const [startDate, setStartDate] = useState('2026-01-01');
  const [endDate, setEndDate] = useState('2026-12-31');

  useEffect(() => {
    fetchFiscalYears().then(setFiscalYears);
  }, [fetchFiscalYears]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Client-side validation
    if (new Date(startDate) >= new Date(endDate)) {
      toast.error('Temporal Boundary Error: Start date must precede end date.');
      return;
    }

    setIsSubmitting(true);
    try {
      await createFiscalYear({ label, startDate, endDate });
      toast.success(`Success: Fiscal Cycle ${label} is now active.`);
      const updated = await fetchFiscalYears();
      setFiscalYears(updated);

      // Reset form if successful
      setLabel('');
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Verification Failed: Unable to initialize fiscal cycle.';
      toast.error(msg, { duration: 5000 });
      console.error('[FiscalSetup] Submission Error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Head>
        <title>Fiscal Year Setup | SentinelFi</title>
      </Head>

      <PageContainer
        title="Fiscal Year Configuration"
        subtitle="Initialize and manage organizational fiscal cycles for Enterprise OPEX and CAPEX governance."
        headerContent={
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push('/financials/operations/planning')}
            icon={<ArrowLeft className="w-4 h-4" />}
          >
            Back to Planning
          </Button>
        }
      >
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left: Setup Form */}
          <div className="lg:col-span-2">
            <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
              <div className="p-6 border-b border-white/[0.03] bg-slate-900/60 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-brand-primary/10 flex items-center justify-center text-brand-primary">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white uppercase tracking-widest">Initialize New Cycle</h3>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tight">Set temporal boundaries for fiscal planning</p>
                </div>
              </div>
              <div className="p-8">
                <form onSubmit={handleSubmit} className="space-y-8">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1 mb-2 block">Fiscal Year Label</label>
                    <input
                      placeholder="e.g. 2026 or FY26"
                      value={label}
                      onChange={(e) => setLabel(e.target.value)}
                      required
                      className="w-full bg-slate-950/40 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:border-brand-primary/50 transition-all outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1 mb-2 block">Start Date</label>
                      <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        required
                        className="w-full bg-slate-950/40 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:border-brand-primary/50 transition-all outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1 mb-2 block">End Date</label>
                      <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        required
                        className="w-full bg-slate-950/40 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:border-brand-primary/50 transition-all outline-none"
                      />
                    </div>
                  </div>

                  <div className="pt-4 flex justify-end">
                    <Button
                      variant="primary"
                      type="submit"
                      disabled={isSubmitting}
                      className="px-8"
                      icon={isSubmitting ? <RefreshCcw className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                    >
                      {isSubmitting ? 'Initializing...' : 'Create Fiscal Cycle'}
                    </Button>
                  </div>
                </form>
              </div>
            </div>

            {/* Quick Tips */}
            <div className="mt-8 bg-blue-500/5 border border-blue-500/10 rounded-2xl p-6 flex items-start gap-4">
              <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-black text-blue-400 uppercase tracking-widest mb-1">Governance Insight</h4>
                <p className="text-xs text-slate-400 leading-relaxed max-w-xl">
                  Initializing a fiscal cycle automatically generates monthly periods for periodic budget reconciliation. This action cannot be reversed once transactions are recorded.
                </p>
              </div>
            </div>
          </div>

          {/* Right: Existing Cycles */}
          <div className="space-y-6">
            <h3 className="text-xs font-black text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              Active Fiscal Cycles
            </h3>

            <div className="space-y-4">
              {coreLoading ? (
                <div className="p-8 text-center text-slate-500 italic text-sm">Synchronizing with core...</div>
              ) : fiscalYears.length === 0 ? (
                <div className="p-12 text-center bg-slate-900/30 border border-slate-800 border-dashed rounded-3xl">
                  <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">No Cycles Configured</p>
                </div>
              ) : (
                fiscalYears.map(fy => (
                  <div key={fy.id} className="bg-slate-900/60 border border-slate-800 p-5 rounded-2xl group hover:border-blue-500/30 transition-all flex justify-between items-center shadow-lg">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-black text-white uppercase tracking-tight">FY {fy.year_label}</span>
                        <span className="text-[10px] font-black px-2 py-0.5 bg-brand-primary/10 text-brand-primary rounded uppercase">Active</span>
                      </div>
                      <p className="font-mono text-[10px] text-slate-500 uppercase tracking-tighter">
                        {new Date(fy.start_date).toLocaleDateString()} — {new Date(fy.end_date).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="w-8 h-8 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-center text-slate-700 group-hover:text-blue-400 transition cursor-not-allowed">
                      <ShieldCheck className="w-4 h-4" />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </PageContainer>

      <style jsx global>{`
        input[type="date"]::-webkit-calendar-picker-indicator {
          filter: invert(1);
          opacity: 0.5;
          cursor: pointer;
        }
      `}</style>
    </>
  );
};

export default FiscalYearSetupPage;
