import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import SecuredLayout from '../../components/Layout/SecuredLayout';
import { useRouter } from 'next/router';
import {
  Calendar,
  Plus,
  ArrowLeft,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { useFinanceCore } from '../../hooks/useFinanceCore';

const FiscalYearSetupPage: React.FC = () => {
  const router = useRouter();
  const { loading, fetchFiscalYears, createFiscalYear } = useFinanceCore();
  const [fiscalYears, setFiscalYears] = useState<any[]>([]);

  // Form State
  const [label, setLabel] = useState('2026');
  const [startDate, setStartDate] = useState('2026-01-01');
  const [endDate, setEndDate] = useState('2026-12-31');

  useEffect(() => {
    fetchFiscalYears().then(setFiscalYears);
  }, [fetchFiscalYears]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await createFiscalYear({ label, startDate, endDate });
    fetchFiscalYears().then(setFiscalYears);
  };

  return (
    <SecuredLayout>
      <Head>
        <title>Fiscal Year Setup | SentinelFi</title>
      </Head>

      <div className="p-8 max-w-4xl mx-auto">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-slate-500 hover:text-slate-800 mb-6 font-medium transition-colors"
        >
          <ArrowLeft size={20} />
          Back to Planning
        </button>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Left Column: Form */}
          <div className="md:col-span-2 space-y-8">
            <div className="bg-white dark:bg-[#1e293b] p-8 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl">
              <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
                <Calendar className="text-blue-500" />
                Initialize New Fiscal Year
              </h1>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Year Label</label>
                  <input
                    type="text"
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                    placeholder="e.g. 2026 or FY26"
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Start Date</label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">End Date</label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    />
                  </div>
                </div>

                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl flex gap-3 items-start border border-blue-100 dark:border-blue-800/50">
                  <AlertCircle className="text-blue-500 shrink-0 mt-0.5" size={18} />
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    Initializing a year will automatically generate <strong>12 Monthly Fiscal Periods</strong>. You can lock or unlock individual periods later.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-lg shadow-lg shadow-blue-500/20 transition-all flex items-center justify-center gap-2"
                >
                  {loading ? 'Processing...' : <><Plus size={20} /> Create Fiscal Year</>}
                </button>
              </form>
            </div>
          </div>

          {/* Right Column: Active Years */}
          <div className="space-y-6">
            <h2 className="font-bold text-slate-500 uppercase tracking-widest text-xs">Existing Years</h2>
            <div className="space-y-3">
              {fiscalYears.map(fy => (
                <div key={fy.id} className="bg-white dark:bg-[#1e293b] p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex justify-between items-center shadow-sm">
                  <div>
                    <div className="font-bold">FY {fy.year_label}</div>
                    <div className="text-xs text-slate-400">{new Date(fy.start_date).toLocaleDateString()} - {new Date(fy.end_date).toLocaleDateString()}</div>
                  </div>
                  {fy.is_closed ? (
                    <span className="text-xs font-bold px-2 py-1 bg-slate-100 text-slate-500 rounded">CLOSED</span>
                  ) : (
                    <CheckCircle2 size={18} className="text-emerald-500" />
                  )}
                </div>
              ))}
              {fiscalYears.length === 0 && (
                <div className="text-center p-8 border-2 border-dashed border-slate-200 rounded-xl text-slate-400 italic text-sm">
                  No years created yet.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </SecuredLayout>
  );
};

export default FiscalYearSetupPage;
