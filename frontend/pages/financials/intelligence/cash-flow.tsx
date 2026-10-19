import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Head from 'next/head';
import { useFinanceCore } from '../../../hooks/useFinanceCore';
import { useCurrency } from '../../../components/context/CurrencyContext';
import {
  TrendingUp, TrendingDown, DollarSign, Clock, AlertTriangle, CheckCircle2, Activity, Building2, Target,
} from 'lucide-react';
import PageContainer from '../../../components/Layout/PageContainer';
import Card from '../../../components/common/Card';
import Button from '../../../components/common/Button';
import { useAuth } from '../../../components/context/AuthContext';

// ARCH-004 thresholds: CRITICAL <7 days or >100% burn; WARNING <30 days or >85% burn
const RISK_THRESHOLDS = {
  CRITICAL_DAYS: 7,
  WARNING_DAYS: 30,
  CRITICAL_BURN_PCT: 100,
  WARNING_BURN_PCT: 85,
};

type PeriodRow = {
  period: string;
  plan: number;
  actual: number;
  committed: number;
  forecast: number;
};

interface IntelligenceData {
  total_budgeted: number;
  total_actual: number;
  total_committed: number;
  monthly_burn_rate: number;
  months_remaining: number;
  exhaustion_date?: string;
  risk_level: 'OK' | 'WARNING' | 'CRITICAL';
  periods: PeriodRow[];
}

const CashFlowForecasting: React.FC = () => {
  const { user } = useAuth();
  const { convertToDisplay } = useCurrency();
  const { fetchCapexDashboard, fetchOpexDashboard, loading } = useFinanceCore();

  const [capexData, setCapexData] = useState<IntelligenceData | null>(null);
  const [opexData, setOpexData] = useState<IntelligenceData | null>(null);
  const [fiscalYearId, setFiscalYearId] = useState<string | null>(null);

  const emptyData = (): IntelligenceData => ({
    total_budgeted: 0,
    total_actual: 0,
    total_committed: 0,
    monthly_burn_rate: 0,
    months_remaining: 0,
    risk_level: 'OK',
    periods: [],
  });

  const normalizeIntelligence = useCallback((raw: any): IntelligenceData => {
    if (!raw) return emptyData();
    const periods: PeriodRow[] = (raw.periods || []).map((p: any) => ({
      period: p.period,
      plan: Number(p.plan || 0),
      actual: Number(p.actual || 0),
      committed: Number(p.committed || 0),
      forecast: Number(p.forecast || 0),
    }));

    const totalBudgeted = Number(raw.total_budgeted || 0);
    const totalActual = Number(raw.total_actual || 0);
    const totalCommitted = Number(raw.total_committed || 0);
    const monthlyBurnRate = Number(raw.monthly_burn_rate || 0);
    const monthsRemaining = Number(raw.months_remaining || 0);

    let riskLevel: 'OK' | 'WARNING' | 'CRITICAL' = 'OK';
    if (
      monthsRemaining <= RISK_THRESHOLDS.CRITICAL_DAYS / 30 ||
      (monthlyBurnRate > 0 && totalBudgeted > 0 && totalActual / totalBudgeted >= RISK_THRESHOLDS.CRITICAL_BURN_PCT / 100)
    ) {
      riskLevel = 'CRITICAL';
    } else if (
      monthsRemaining <= RISK_THRESHOLDS.WARNING_DAYS / 30 ||
      (monthlyBurnRate > 0 && totalBudgeted > 0 && totalActual / totalBudgeted >= RISK_THRESHOLDS.WARNING_BURN_PCT / 100)
    ) {
      riskLevel = 'WARNING';
    }

    return {
      total_budgeted: totalBudgeted,
      total_actual: totalActual,
      total_committed: totalCommitted,
      monthly_burn_rate: monthlyBurnRate,
      months_remaining: monthsRemaining,
      exhaustion_date: raw.exhaustion_date,
      risk_level: riskLevel,
      periods,
    };
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        const [capex, opex] = await Promise.all([
          fetchCapexDashboard(),
          fetchOpexDashboard(fiscalYearId || undefined),
        ]);
        setCapexData(normalizeIntelligence(capex));
        setOpexData(normalizeIntelligence(opex));
      } catch (e) {
        console.error('Failed to load intelligence data', e);
      }
    };
    load();
  }, [fetchCapexDashboard, fetchOpexDashboard, fiscalYearId, normalizeIntelligence]);

  const combinedBurnRate = useMemo(() => {
    const capexBurn = capexData?.monthly_burn_rate || 0;
    const opexBurn = opexData?.monthly_burn_rate || 0;
    return capexBurn + opexBurn;
  }, [capexData, opexData]);

  const combinedBudgeted = useMemo(() => {
    return (capexData?.total_budgeted || 0) + (opexData?.total_budgeted || 0);
  }, [capexData, opexData]);

  const combinedActual = useMemo(() => {
    return (capexData?.total_actual || 0) + (opexData?.total_actual || 0);
  }, [capexData, opexData]);

  const combinedRemaining = useMemo(() => {
    return (capexData?.months_remaining || 0) + (opexData?.months_remaining || 0);
  }, [capexData, opexData]);

  const combinedRisk = useMemo(() => {
    if (capexData?.risk_level === 'CRITICAL' || opexData?.risk_level === 'CRITICAL') return 'CRITICAL';
    if (capexData?.risk_level === 'WARNING' || opexData?.risk_level === 'WARNING') return 'WARNING';
    return 'OK';
  }, [capexData, opexData]);

  const riskColors: Record<string, string> = {
    OK: '#22c55e',
    WARNING: '#f59e0b',
    CRITICAL: '#ef4444',
  };

  if (loading) {
    return (
      <PageContainer title="Cash Flow Forecasting" subtitle="Burn-rate velocity and exhaustion projection.">
        <div className="p-10 flex flex-col items-center justify-center gap-3">
          <Clock className="animate-spin text-brand-primary" />
          <p className="text-xs text-slate-400 font-black uppercase tracking-tighter">Loading cash flow data…</p>
        </div>
      </PageContainer>
    );
  }

  return (
    <>
      <Head>
        <title>Cash Flow Forecasting | SentinelFi</title>
      </Head>
      <PageContainer
        title="Cash Flow Forecasting"
        subtitle="Burn-rate velocity, exhaustion dates, and risk projection across CAPEX and OPEX."
        headerContent={
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setFiscalYearId(null)}
              icon={<Clock className="w-4 h-4" />}
            >
              Reset Period
            </Button>
            <select
              className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:border-brand-primary outline-none"
              onChange={(e) => setFiscalYearId(e.target.value || null)}
              value={fiscalYearId || ""}
            >
              <option value="">All Fiscal Years</option>
              <option value="current">Current Fiscal Year</option>
            </select>
          </div>
        }
      >
        {/* Executive Summary KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="p-6 border-slate-800">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-xs font-black text-slate-500 uppercase tracking-tighter">Monthly Burn Rate</p>
                <p className="text-2xl font-black text-white">{convertToDisplay(combinedBurnRate, 'NGN')}</p>
              </div>
              <div className="p-2.5 bg-slate-800/50 rounded-lg">
                <DollarSign className="w-5 h-5 text-slate-400" />
              </div>
            </div>
            <p className="text-xs text-slate-400 font-medium">
              CAPEX + OPEX combined monthly burn
            </p>
          </Card>

          <Card className="p-6 border-slate-800">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-xs font-black text-slate-500 uppercase tracking-tighter">Months Remaining</p>
                <p className="text-2xl font-black text-white">{combinedRemaining.toFixed(1)}</p>
              </div>
              <div className="p-2.5 bg-slate-800/50 rounded-lg">
                <Activity className="w-5 h-5 text-slate-400" />
              </div>
            </div>
            <p className="text-xs text-slate-400 font-medium">
              At current burn rate, before exhaustion
            </p>
          </Card>

          <Card className="p-6 border-slate-800">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-xs font-black text-slate-500 uppercase tracking-tighter">Budget Consumed</p>
                <p className="text-2xl font-black text-white">
                  {combinedBudgeted > 0 ? ((combinedActual / combinedBudgeted) * 100).toFixed(1) + '%' : '0%'}
                </p>
              </div>
              <div className="p-2.5 bg-slate-800/50 rounded-lg">
                <Target className="w-5 h-5 text-slate-400" />
              </div>
            </div>
            <p className="text-xs text-slate-400 font-medium">
              Of total approved budget
            </p>
          </Card>

          <Card className={`p-6 border-${riskColors[combinedRisk]}/50`}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-xs font-black text-slate-500 uppercase tracking-tighter">Risk Level</p>
                <p className={`text-2xl font-black text-white ${riskColors[combinedRisk]}`}>
                  {combinedRisk}
                </p>
              </div>
              <div className="p-2.5 bg-slate-800/50 rounded-lg">
                {combinedRisk === 'CRITICAL' ? <AlertTriangle className="w-5 h-5 text-red-400" /> : combinedRisk === 'WARNING' ? <Clock className="w-5 h-5 text-amber-400" /> : <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
              </div>
            </div>
            <p className="text-xs text-slate-400 font-medium">
              ARCH-004 thresholds: CRITICAL &lt;7 days or &gt;100% burn; WARNING &lt;30 days or &gt;85% burn
            </p>
          </Card>
        </div>

        {/* CAPEX vs OPEX Burn Comparison */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <Card className="p-6 border-slate-800">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-black text-white">CAPEX Cash Flow</h3>
              <Badge risk={capexData?.risk_level || 'OK'} />
            </div>
            <div className="space-y-4">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Monthly Burn</span>
                <span className="font-mono font-bold text-white">{convertToDisplay(capexData?.monthly_burn_rate || 0, 'NGN')}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Months Remaining</span>
                <span className="font-mono font-bold text-white">{capexData?.months_remaining?.toFixed(1) || '0'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Exhaustion Date</span>
                <span className="font-mono font-bold text-white">{capexData?.exhaustion_date || '—'}</span>
              </div>
              <div className="pt-2 border-t border-slate-800/50">
                <p className="text-xs text-slate-400">
                  Burn rate: {(capexData?.monthly_burn_rate || 0) > 0 && capexData?.total_budgeted > 0
                    ? (((capexData?.total_actual || 0) / capexData.total_budgeted) * 100).toFixed(1) + '% of budget consumed'
                    : 'No data'}
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-6 border-slate-800">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-black text-white">OPEX Cash Flow</h3>
              <Badge risk={opexData?.risk_level || 'OK'} />
            </div>
            <div className="space-y-4">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Monthly Burn</span>
                <span className="font-mono font-bold text-white">{convertToDisplay(opexData?.monthly_burn_rate || 0, 'NGN')}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Months Remaining</span>
                <span className="font-mono font-bold text-white">{opexData?.months_remaining?.toFixed(1) || '0'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Exhaustion Date</span>
                <span className="font-mono font-bold text-white">{opexData?.exhaustion_date || '—'}</span>
              </div>
              <div className="pt-2 border-t border-slate-800/50">
                <p className="text-xs text-slate-400">
                  Burn rate: {(opexData?.monthly_burn_rate || 0) > 0 && opexData?.total_budgeted > 0
                    ? (((opexData?.total_actual || 0) / opexData.total_budgeted) * 100).toFixed(1) + '% of budget consumed'
                    : 'No data'}
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Period-by-period table */}
        <Card className="p-6 border-slate-800">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-sm font-black text-white">Period-by-Period Projection</h3>
            <p className="text-xs text-slate-400">Forecast = Actual + Committed pipeline</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs text-slate-500 uppercase border-b border-slate-800">
                <tr>
                  <th className="px-4 py-3 font-black text-slate-200">Period</th>
                  <th className="px-4 py-3 font-black text-slate-200 text-right">Plan</th>
                  <th className="px-4 py-3 font-black text-slate-200 text-right">Actual</th>
                  <th className="px-4 py-3 font-black text-slate-200 text-right">Committed</th>
                  <th className="px-4 py-3 font-black text-slate-200 text-right">Forecast</th>
                  <th className="px-4 py-3 font-black text-slate-200 text-right">Variance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {[
                  ...(capexData?.periods || []).map((p) => ({ ...p, source: 'CAPEX' })),
                  ...(opexData?.periods || []).map((p) => ({ ...p, source: 'OPEX' })),
                ].sort((a, b) => a.period.localeCompare(b.period)).map((row) => (
                  <tr key={`${row.source}-${row.period}`} className="hover:bg-slate-800/30">
                    <td className="px-4 py-3 font-mono text-xs text-slate-300">{row.period}</td>
                    <td className="px-4 py-3 text-right font-mono text-xs text-slate-400">{convertToDisplay(row.plan, 'NGN')}</td>
                    <td className="px-4 py-3 text-right font-mono text-xs text-brand-primary">{convertToDisplay(row.actual, 'NGN')}</td>
                    <td className="px-4 py-3 text-right font-mono text-xs text-amber-400">{convertToDisplay(row.committed, 'NGN')}</td>
                    <td className="px-4 py-3 text-right font-mono text-xs text-emerald-400">{convertToDisplay(row.forecast, 'NGN')}</td>
                    <td className={`px-4 py-3 text-right font-mono text-xs font-bold ${row.forecast > row.plan ? 'text-red-400' : 'text-emerald-400'}`}>
                      {((row.forecast - row.plan) / (row.plan || 1) * 100).toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </PageContainer>
    </>
  );
};

const Badge: React.FC<{ risk: string }> = ({ risk }) => {
  const colors: Record<string, string> = {
    OK: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    WARNING: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    CRITICAL: 'bg-red-500/10 text-red-400 border-red-500/20',
  };
  return (
    <span className={`px-2 py-1 rounded text-xs font-black uppercase tracking-tighter border ${colors[risk]}`}>
      {risk}
    </span>
  );
};

export default CashFlowForecasting;
