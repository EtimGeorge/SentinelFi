import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import PageContainer from '../../../../components/Layout/PageContainer';
import Card from '../../../../components/common/Card';
import Button from '../../../../components/common/Button';
import Input from '../../../../components/common/Input';
import { useFinanceCore } from '../../../../hooks/useFinanceCore';
import { useCurrency } from '../../../../components/context/CurrencyContext';
import {
  Users,
  Plus,
  Calendar,
  CheckCircle2,
  Clock,
  AlertCircle,
  ArrowRight,
  DollarSign,
  TrendingUp,
  FileText
} from 'lucide-react';
import { useRouter } from 'next/router';
import toast from 'react-hot-toast';

const PayrollDeskPage: React.FC = () => {
  const router = useRouter();
  const { convertToDisplay } = useCurrency();
  const {
    loading,
    fetchPayrollRuns,
    fetchPayrollKPIs,
    createPayrollRun,
    fetchFiscalYears
  } = useFinanceCore();

  const [runs, setRuns] = useState<any[]>([]);
  const [fiscalYears, setFiscalYears] = useState<any[]>([]);
  const [kpis, setKpis] = useState<any>(null);
  const [showNewRunModal, setShowNewRunModal] = useState(false);

  // New Run Form
  const [runIdentifier, setRunIdentifier] = useState('');
  const [fiscalPeriodId, setFiscalPeriodId] = useState('');
  const [runDate, setRunDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [runsData, fyData, kpiData] = await Promise.all([
      fetchPayrollRuns(),
      fetchFiscalYears(),
      fetchPayrollKPIs()
    ]);
    setRuns(runsData || []);
    setFiscalYears(fyData || []);
    setKpis(kpiData);
  };

  const handleCreateRun = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!runIdentifier || !fiscalPeriodId) {
      toast.error('Please fill in all fields');
      return;
    }

    const res = await createPayrollRun({
      runIdentifier,
      fiscalPeriodId,
      runDate
    });

    if (res) {
      setShowNewRunModal(false);
      loadData();
      router.push(`/financials/operations/payroll/${res.data.id}`);
    }
  };

  const statusConfig: any = {
    DRAFT: { label: 'Draft', color: 'text-gray-400', bg: 'bg-gray-800', icon: Clock },
    REVIEW: { label: 'In Review', color: 'text-yellow-400', bg: 'bg-yellow-900/30', icon: AlertCircle },
    APPROVED: { label: 'Approved', color: 'text-brand-primary', bg: 'bg-brand-primary/10', icon: CheckCircle2 },
    POSTED: { label: 'Posted', color: 'text-green-400', bg: 'bg-green-900/30', icon: CheckCircle2 },
  };

  return (
    <>
      <Head>
        <title>Payroll Desk | SentinelFi</title>
      </Head>

      <PageContainer
        title="Payroll Desk"
        subtitle="Manage employee compensation, disbursements, and statutory obligations."
        headerContent={
          <Button
            variant="primary"
            onClick={() => setShowNewRunModal(true)}
            icon={<Plus className="w-4 h-4" />}
          >
            New Payroll Run
          </Button>
        }
      >
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800 rounded-2xl p-6 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-brand-primary/5 rounded-full -mr-12 -mt-12 group-hover:scale-110 transition-transform duration-700" />
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Total Gross (FY)</p>
                <h3 className="text-2xl font-black text-white">{convertToDisplay(kpis?.totalGross || 0, 'NGN')}</h3>
              </div>
              <div className="p-2 bg-brand-primary/10 rounded-lg">
                <TrendingUp className="w-5 h-5 text-brand-primary" />
              </div>
            </div>
          </div>

          <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800 rounded-2xl p-6 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-yellow-500/5 rounded-full -mr-12 -mt-12 group-hover:scale-110 transition-transform duration-700" />
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Pending Posted</p>
                <h3 className="text-2xl font-black text-yellow-500">{convertToDisplay(kpis?.pendingPosted || 0, 'NGN')}</h3>
              </div>
              <div className="p-2 bg-yellow-500/10 rounded-lg">
                <Clock className="w-5 h-5 text-yellow-500" />
              </div>
            </div>
          </div>

          <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800 rounded-2xl p-6 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-red-400/5 rounded-full -mr-12 -mt-12 group-hover:scale-110 transition-transform duration-700" />
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Employer Taxes</p>
                <h3 className="text-2xl font-black text-red-400">{convertToDisplay(kpis?.employerTaxes || 0, 'NGN')}</h3>
              </div>
              <div className="p-2 bg-red-400/10 rounded-lg">
                <AlertCircle className="w-5 h-5 text-red-400" />
              </div>
            </div>
          </div>

          <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800 rounded-2xl p-6 relative overflow-hidden group border-b-4 border-b-yellow-500/30">
            <div className="flex items-center gap-1.5 mb-2">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Employee Benefits</p>
              <h3 className="text-2xl font-black text-emerald-400">{convertToDisplay(kpis?.employerBenefits || 0, 'NGN')}</h3>
            </div>
            <div className="p-2 bg-emerald-400/10 rounded-lg">
              <Users className="w-5 h-5 text-emerald-400" />
            </div>
          </div>
        </div>

        {/* Payroll Runs Table */}
        <Card title="Executive Payroll Cycles" subtitle="Listing of all salary runs and their current lifecycle status.">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="p-4 text-[10px] font-black text-gray-500 uppercase tracking-widest">Run Identifier</th>
                  <th className="p-4 text-[10px] font-black text-gray-500 uppercase tracking-widest">Fiscal Period</th>
                  <th className="p-4 text-[10px] font-black text-gray-500 uppercase tracking-widest text-right">Gross Amount</th>
                  <th className="p-4 text-[10px] font-black text-gray-500 uppercase tracking-widest">Status</th>
                  <th className="p-4 text-[10px] font-black text-gray-500 uppercase tracking-widest">Date</th>
                  <th className="p-4"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/50">
                {runs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-12 text-center text-gray-500 italic text-sm">
                      No payroll cycles found. Initialize your first run to begin.
                    </td>
                  </tr>
                ) : runs.map(run => {
                  const cfg = statusConfig[run.status] || statusConfig.DRAFT;
                  const StatusIcon = cfg.icon;
                  return (
                    <tr key={run.id} className="group hover:bg-white/5 transition-colors cursor-pointer" onClick={() => router.push(`/financials/operations/payroll/${run.id}`)}>
                      <td className="p-4">
                        <div className="font-bold text-gray-100 flex items-center gap-2">
                          <FileText className="w-4 h-4 text-brand-primary" />
                          {run.run_identifier}
                        </div>
                      </td>
                      <td className="p-4 text-sm text-gray-400">
                        {run.fiscalPeriod?.period_name} {new Date(run.fiscalPeriod?.start_date).getFullYear()}
                      </td>
                      <td className="p-4 text-sm font-mono text-gray-100 text-right">
                        {convertToDisplay(Number(run.total_gross_pay) + Number(run.total_taxes_employer) + Number(run.total_benefits_employer), 'NGN')}
                      </td>
                      <td className="p-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${cfg.bg} ${cfg.color}`}>
                          <StatusIcon className="w-3 h-3" />
                          {cfg.label}
                        </span>
                      </td>
                      <td className="p-4 text-sm text-gray-500">
                        {new Date(run.run_date).toLocaleDateString()}
                      </td>
                      <td className="p-4 text-right">
                        <Button variant="ghost" size="sm" icon={<ArrowRight className="w-4 h-4" />}>
                          Details
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>

        {/* New Run Modal */}
        {showNewRunModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-brand-dark/80 backdrop-blur-sm">
            <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-md p-6 shadow-2xl">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-black text-white flex items-center gap-2">
                  <Plus className="text-brand-primary" />
                  Initialize Payroll Run
                </h2>
                <button onClick={() => setShowNewRunModal(false)} className="text-gray-500 hover:text-white">
                  <Calendar className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateRun} className="space-y-4">
                <Input
                  label="Run Identifier"
                  placeholder="e.g. March 2026 Monthly Salaries"
                  value={runIdentifier}
                  onChange={(e) => setRunIdentifier(e.target.value)}
                  required
                />

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Fiscal Period</label>
                  <select
                    className="w-full bg-brand-dark/60 border border-gray-800 rounded-xl p-3 text-sm text-white focus:border-brand-primary outline-none"
                    value={fiscalPeriodId}
                    onChange={(e) => setFiscalPeriodId(e.target.value)}
                    required
                  >
                    <option value="">Select Period</option>
                    {fiscalYears.map(fy => (
                      <optgroup key={fy.id} label={`FY ${fy.year_label}`}>
                        {fy.periods?.map((p: any) => (
                          <option key={p.id} value={p.id}>{p.period_name} {new Date(p.start_date).getFullYear()}</option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>

                <Input
                  type="date"
                  label="Run Date"
                  value={runDate}
                  onChange={(e) => setRunDate(e.target.value)}
                  required
                />

                <div className="pt-4 flex gap-3">
                  <Button type="button" variant="secondary" onClick={() => setShowNewRunModal(false)}>Cancel</Button>
                  <Button type="submit" variant="primary" isLoading={loading}>Create Run</Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </PageContainer>
    </>
  );
};

export default PayrollDeskPage;
