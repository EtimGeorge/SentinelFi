import React, { useState, useEffect, useMemo } from 'react';
import Head from 'next/head';
import { useFinanceCore } from '../../hooks/useFinanceCore';
import { useCurrency } from '../../components/context/CurrencyContext';
import { useAuth } from '../../components/context/AuthContext';
import {
  Building2, DollarSign, TrendingUp, TrendingDown, AlertTriangle, CheckCircle2, Clock, List,
} from 'lucide-react';
import PageContainer from '../../components/Layout/PageContainer';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import DataTable from '../../components/common/DataTable';

const RISK_COLORS: Record<string, string> = {
  OK: '#22c55e',
  WARNING: '#f59e0b',
  CRITICAL: '#ef4444',
};

interface MDAUnit {
  id: string;
  name: string;
  code: string;
  budgeted: number;
  actual: number;
  committed: number;
  variance: number;
  burnPct: number;
  riskLevel: 'OK' | 'WARNING' | 'CRITICAL';
}

const MdaPortfolioRollup: React.FC = () => {
  const { user } = useAuth();
  const { convertToDisplay } = useCurrency();
  const { fetchDepartments, fetchOperationalBudgets, loading } = useFinanceCore();

  const [departments, setDepartments] = useState<any[]>([]);
  const [budgets, setBudgets] = useState<any[]>([]);

  useEffect(() => {
    const load = async () => {
      const [depts, budg] = await Promise.all([
        fetchDepartments(),
        fetchOperationalBudgets(),
      ]);
      setDepartments(depts || []);
      setBudgets(Array.isArray(budg?.operationalBudgets || budg) ? (budg?.operationalBudgets || budg) : []);
    };
    load();
  }, [fetchDepartments, fetchOperationalBudgets]);

  const mdaUnits: MDAUnit[] = useMemo(() => {
    return departments.map((dept) => {
      const deptBudgets = budgets.filter((b: any) =>
        b.categories?.some((c: any) => c.cost_center_id === dept.id) ||
        b.department_id === dept.id
      );

      const budgeted = deptBudgets.reduce((sum: number, b: any) => sum + Number(b.budgeted_amount || 0), 0);
      const actual = deptBudgets.reduce((sum: number, b: any) => sum + Number(b.actual_spent || 0), 0);
      const committed = budgeted - actual;
      const variance = budgeted - actual;
      const burnPct = budgeted > 0 ? (actual / budgeted) * 100 : 0;

      let riskLevel: 'OK' | 'WARNING' | 'CRITICAL' = 'OK';
      if (burnPct >= 100) riskLevel = 'CRITICAL';
      else if (burnPct >= 85) riskLevel = 'WARNING';

      return {
        id: dept.id,
        name: dept.name,
        code: dept.code || dept.id.slice(0, 4).toUpperCase(),
        budgeted,
        actual,
        committed,
        variance,
        burnPct,
        riskLevel,
      };
    });
  }, [departments, budgets]);

  const totalBudgeted = useMemo(() => mdaUnits.reduce((sum, u) => sum + u.budgeted, 0), [mdaUnits]);
  const totalActual = useMemo(() => mdaUnits.reduce((sum, u) => sum + u.actual, 0), [mdaUnits]);
  const totalVariance = useMemo(() => mdaUnits.reduce((sum, u) => sum + u.variance, 0), [mdaUnits]);
  const criticalCount = useMemo(() => mdaUnits.filter(u => u.riskLevel === 'CRITICAL').length, [mdaUnits]);
  const warningCount = useMemo(() => mdaUnits.filter(u => u.riskLevel === 'WARNING').length, [mdaUnits]);

  if (loading) {
    return (
      <PageContainer title="MDA Portfolio Roll-up" subtitle="Cross-departmental budget consolidation.">
        <div className="p-10 flex flex-col items-center justify-center gap-3">
          <Clock className="animate-spin text-brand-primary" />
          <p className="text-xs text-slate-400 font-black uppercase tracking-tighter">Loading portfolio data…</p>
        </div>
      </PageContainer>
    );
  }

  return (
    <>
      <Head>
        <title>MDA Portfolio Roll-up | SentinelFi</title>
      </Head>
      <PageContainer
        title="MDA Portfolio Roll-up"
        subtitle="Consolidated budget execution across ministries, departments, and agencies."
        headerContent={
          <Button variant="outline" size="sm" icon={<List className="w-4 h-4" />}>
            Export Portfolio
          </Button>
        }
      >
        {/* Portfolio KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6 mb-8">
          <Card className="p-6 border-slate-800">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-xs font-black text-slate-500 uppercase tracking-tighter">MDAs in Portfolio</p>
                <p className="text-2xl font-black text-white">{mdaUnits.length}</p>
              </div>
              <div className="p-2.5 bg-slate-800/50 rounded-lg">
                <Building2 className="w-5 h-5 text-slate-400" />
              </div>
            </div>
            <p className="text-xs text-slate-400 font-medium">Departments with budget lines</p>
          </Card>

          <Card className="p-6 border-slate-800">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-xs font-black text-slate-500 uppercase tracking-tighter">Total Budgeted</p>
                <p className="text-2xl font-black text-white">{convertToDisplay(totalBudgeted, 'NGN')}</p>
              </div>
              <div className="p-2.5 bg-slate-800/50 rounded-lg">
                <DollarSign className="w-5 h-5 text-slate-400" />
              </div>
            </div>
            <p className="text-xs text-slate-400 font-medium">Approved across all MDAs</p>
          </Card>

          <Card className="p-6 border-slate-800">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-xs font-black text-slate-500 uppercase tracking-tighter">Total Actual Spent</p>
                <p className="text-2xl font-black text-white">{convertToDisplay(totalActual, 'NGN')}</p>
              </div>
              <div className="p-2.5 bg-slate-800/50 rounded-lg">
                <TrendingUp className="w-5 h-5 text-slate-400" />
              </div>
            </div>
            <p className="text-xs text-slate-400 font-medium">Year-to-date expenditure</p>
          </Card>

          <Card className={`p-6 border-${totalVariance < 0 ? 'border-red-500/50' : 'border-emerald-500/50'}`}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-xs font-black text-slate-500 uppercase tracking-tighter">Net Variance</p>
                <p className={`text-2xl font-black text-white ${totalVariance < 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                  {totalVariance >= 0 ? '+' : ''}{convertToDisplay(Math.abs(totalVariance), 'NGN')}
                </p>
              </div>
              <div className="p-2.5 bg-slate-800/50 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-slate-400" />
              </div>
            </div>
            <p className="text-xs text-slate-400 font-medium">Budget remaining (negative = overspent)</p>
          </Card>
        </div>

        {/* Risk Summary */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <Card className="p-6 border-slate-800 bg-slate-800/30">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-500/10 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <p className="text-xs font-black text-slate-500 uppercase tracking-tighter">Critical MDAs</p>
                <p className="text-2xl font-black text-red-400">{criticalCount}</p>
              </div>
            </div>
            <p className="text-xs text-slate-400">Burn rate &gt;100% of budget</p>
          </Card>

          <Card className="p-6 border-slate-800 bg-slate-800/30">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-500/10 rounded-lg">
                <Clock className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <p className="text-xs font-black text-slate-500 uppercase tracking-tighter">Warning MDAs</p>
                <p className="text-2xl font-black text-amber-400">{warningCount}</p>
              </div>
            </div>
            <p className="text-xs text-slate-400">Burn rate 85–100% of budget</p>
          </Card>

          <Card className="p-6 border-slate-800 bg-slate-800/30">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-500/10 rounded-lg">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-xs font-black text-slate-500 uppercase tracking-tighter">Healthy MDAs</p>
                <p className="text-2xl font-black text-emerald-400">{mdaUnits.length - criticalCount - warningCount}</p>
              </div>
            </div>
            <p className="text-xs text-slate-400">Within budget tolerance</p>
          </Card>
        </div>

        {/* MDA Detail Table */}
        <Card className="p-6 border-slate-800">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-sm font-black text-white">MDA Budget Execution Detail</h3>
            <p className="text-xs text-slate-400">Roll-up by department/cost center</p>
          </div>
          <div className="overflow-x-auto">
            <DataTable
              columns={[
                { key: 'code', label: 'MDA Code', tier: 'P0', get: (u: MDAUnit) => (
                  <span className="font-mono font-bold text-xs text-brand-primary">{u.code}</span>
                )},
                { key: 'name', label: 'Ministry / Department / Agency', tier: 'P0', get: (u: MDAUnit) => (
                  <span className="font-bold text-sm text-white">{u.name}</span>
                )},
                { key: 'budgeted', label: 'Budgeted', tier: 'P1', cellClassName: 'text-right', get: (u: MDAUnit) => (
                  <span className="text-right font-mono text-xs text-slate-400">{convertToDisplay(u.budgeted, 'NGN')}</span>
                )},
                { key: 'actual', label: 'Actual Spent', tier: 'P1', cellClassName: 'text-right', get: (u: MDAUnit) => (
                  <span className="text-right font-mono text-xs text-brand-primary">{convertToDisplay(u.actual, 'NGN')}</span>
                )},
                { key: 'variance', label: 'Variance', tier: 'P0', cellClassName: 'text-right', get: (u: MDAUnit) => (
                  <span className={`text-right font-mono text-xs font-bold ${u.variance < 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                    {u.variance >= 0 ? '+' : ''}{convertToDisplay(Math.abs(u.variance), 'NGN')}
                  </span>
                )},
                { key: 'burn', label: 'Burn Rate', tier: 'P0', cellClassName: 'text-right', get: (u: MDAUnit) => (
                  <span className={`text-right font-mono text-xs font-bold ${u.riskLevel === 'CRITICAL' ? 'text-red-400' : u.riskLevel === 'WARNING' ? 'text-amber-400' : 'text-emerald-400'}`}>
                    {u.burnPct.toFixed(1)}%
                  </span>
                )},
                { key: 'risk', label: 'Risk', tier: 'P0', cellClassName: 'text-right', get: (u: MDAUnit) => (
                  <span className={`px-2 py-1 rounded text-xs font-black uppercase tracking-tighter border ${u.riskLevel === 'CRITICAL' ? 'bg-red-500/10 text-red-400 border-red-500/20' : u.riskLevel === 'WARNING' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'}`}>
                    {u.riskLevel}
                  </span>
                )},
              ]}
              rows={mdaUnits}
              rowKey={(u: MDAUnit) => u.id}
              emptyMessage="No departments with budget data found."
            />
          </div>
        </Card>

        <div className="mt-6 p-4 bg-slate-900/30 border border-slate-800 rounded-xl text-xs text-slate-400">
          <p className="font-bold text-slate-300 mb-2">About MDA Portfolio Roll-up</p>
          <p className="text-slate-500">
            This view consolidates budget execution across all departments (MDAs) within the tenant.
            For cross-tenant consolidation (e.g., multiple ministries as separate tenants), a
            reporting warehouse with cross-schema queries is required — contact your platform
            administrator to enable MDA-level consolidation.
          </p>
        </div>
      </PageContainer>
    </>
  );
};

export default MdaPortfolioRollup;
