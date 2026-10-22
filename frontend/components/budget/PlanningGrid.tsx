import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { ChevronRight, ChevronDown, Info, Zap, TrendingUp, TrendingDown, RefreshCcw, HelpCircle, Save, Loader2, Calendar } from 'lucide-react';
import api from '../../lib/api';
import { useAuth } from '../context/AuthContext';
import { useCurrency } from '../context/CurrencyContext';
import Tooltip from '../common/Tooltip';
import toast from 'react-hot-toast';
import debounce from 'lodash/debounce';

export interface PlanningGridCell {
  operational_budget_category_id: string;
  period_date: string;
  planned_amount: number;
  period_type?: string;
}

export interface PlanningGridRow {
  operational_budget_category_id: string;
  name: string;
  type?: string;
  budgeted_amount: number;
  allocations: PlanningGridCell[];
}

export interface PlanningGridProps {
  budgetId: string;
  /** Show the scenario-modeling toolbar (default true). */
  showScenarioToolbar?: boolean;
  /** Show the year header chip (default true). */
  showYearHeader?: boolean;
  /** Additional className for the root container. */
  className?: string;
}

const PlanningGrid: React.FC<PlanningGridProps> = ({
  budgetId,
  showScenarioToolbar = true,
  showYearHeader = true,
  className,
}) => {
  const { isAuthenticated } = useAuth();
  const { userCurrency, convertToDisplay } = useCurrency();
  const [rows, setRows] = useState<PlanningGridRow[]>([]);
  const [periods, setPeriods] = useState<string[]>([]);
  const [budgetYear, setBudgetYear] = useState<number>(new Date().getFullYear());
  const [loading, setLoading] = useState(true);
  const [savingMsg, setSavingMsg] = useState('');
  // values keyed by `${categoryId}:${periodKey}`
  const [values, setValues] = useState<Record<string, number>>({});

  const fetchGrid = useCallback(async () => {
    if (!isAuthenticated) return;
    setLoading(true);
    try {
      const res = await api.get(`/operational-budgets/${budgetId}/grid`);
      const cats: PlanningGridRow[] = Array.isArray(res.data) ? res.data : [];
      setRows(cats);

      // Derive ordered periods + year from loaded allocations (backend source of truth).
      const periodSet = new Set<string>();
      let year = new Date().getFullYear();
      cats.forEach(c => {
        (c.allocations || []).forEach(a => {
          if (a.period_date) {
            const key = a.period_date.slice(0, 7);
            periodSet.add(key);
            const y = parseInt(a.period_date.slice(0, 4), 10);
            if (!isNaN(y)) year = y;
          }
        });
      });
      setPeriods([...periodSet].sort());
      setBudgetYear(year);
    } catch (error) {
      toast.error('Failed to load planning grid.');
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, budgetId]);

  useEffect(() => {
    fetchGrid();
  }, [fetchGrid]);

  // Hydrate local values from loaded allocations.
  useEffect(() => {
    const next: Record<string, number> = {};
    rows.forEach(r => {
      (r.allocations || []).forEach(a => {
        if (a.period_date) {
          const key = `${r.operational_budget_category_id}:${a.period_date.slice(0, 7)}`;
          next[key] = Number(a.planned_amount || 0);
        }
      });
    });
    setValues(next);
  }, [rows]);

  // Debounced Save via canonical planning-grid endpoint (keyed on category + period_date).
  const saveCell = useCallback(
    debounce(async (categoryId: string, periodKey: string, amount: number) => {
      setSavingMsg('Saving...');
      try {
        const dateStr = `${periodKey}-01`;
        await api.post(`/operational-budgets/${budgetId}/planning-grid`, {
          cells: [{
            operational_budget_category_id: categoryId,
            period_date: dateStr,
            amount,
            period_type: 'MONTHLY',
          }],
        });
        setSavingMsg('All changes saved');
        setTimeout(() => setSavingMsg(''), 2000);
      } catch (e) {
        setSavingMsg('Error saving!');
        toast.error('Failed to save planning cell.');
      }
    }, 1000),
    [budgetId],
  );

  const handleCellChange = (categoryId: string, periodKey: string, val: string) => {
    const amount = parseFloat(val.replace(/,/g, '')) || 0;
    setValues(prev => ({ ...prev, [`${categoryId}:${periodKey}`]: amount }));
    saveCell(categoryId, periodKey, amount);
  };

  const getCellValue = (categoryId: string, periodKey: string) => {
    const v = values[`${categoryId}:${periodKey}`];
    return v == null ? 0 : v;
  };

  const getRowTotal = (categoryId: string) => {
    return periods.reduce((sum, pk) => sum + getCellValue(categoryId, pk), 0);
  };

  const getColumnTotal = (periodKey: string) => {
    return rows.reduce((sum, r) => sum + getCellValue(r.operational_budget_category_id, periodKey), 0);
  };

  const grandTotal = rows.reduce((sum, r) => sum + getRowTotal(r.operational_budget_category_id), 0);

  if (loading) {
    return (
      <div className="p-10 flex flex-col items-center justify-center gap-3">
        <Loader2 className="animate-spin text-brand-primary" />
        <p className="text-xs text-slate-400 font-black uppercase tracking-tighter">Loading planning grid…</p>
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="p-24 flex flex-col items-center justify-center text-center">
        <div className="w-16 h-16 rounded-full bg-slate-900 flex items-center justify-center text-slate-700 mb-4 border border-slate-800">
          <Info size={32} />
        </div>
        <h3 className="text-lg font-black text-slate-300 uppercase tracking-tighter">No Budget Categories</h3>
        <p className="text-slate-500 text-sm mt-1 max-w-xs">
          Create OPEX budget categories in the Operations Ledger → Categories tab, then return here to allocate.
        </p>
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-full ${className ?? ''}`}>
      {showScenarioToolbar && (
        <div className="p-4 bg-slate-900/60 backdrop-blur-xl border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-xl border border-blue-500/20">
                <Zap className="w-4 h-4 text-blue-400" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-black text-slate-500 uppercase tracking-[0.2em] block">Scenario Modeling</span>
                  <Tooltip content="Instantly adjust all active planning rows by a specific percentage to model different fiscal outcomes.">
                    <HelpCircle className="w-3 h-3 text-slate-600 hover:text-blue-400 transition" />
                  </Tooltip>
                </div>
                <span className="text-xs text-slate-400">Apply adjustments to active planning rows</span>
              </div>
            </div>

            <div className="h-8 w-px bg-slate-800 mx-2" />

            <div className="flex items-center gap-2">
              <input
                type="number"
                value={0}
                onChange={() => {}}
                className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs font-black text-white w-20 outline-none focus:ring-1 focus:ring-blue-500 placeholder-slate-500"
                placeholder="0"
                readOnly
              />
              <span className="absolute right-3 top-1.5 text-slate-600 text-xs font-black">%</span>
              <button
                className="p-1.5 bg-slate-800 text-slate-400 rounded-lg hover:text-white transition disabled:opacity-50 disabled:cursor-not-allowed"
                disabled
                title="Scenario adjustments are applied per-cell; edit any cell to model."
              >
                <TrendingUp size={16} />
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-black text-slate-400">{savingMsg}</span>
            <Save className={`w-3.5 h-3.5 ${savingMsg ? 'text-emerald-400 animate-pulse' : 'text-slate-500'}`} />
          </div>
        </div>
      )}

      <div className="overflow-x-auto w-full flex-1">
        <div className="min-w-[1400px]">
          {/* Table Header */}
          <div className="flex bg-slate-950 border-b border-slate-800 sticky top-0 z-10">
            <div className="w-[320px] px-6 py-4 font-black text-xs uppercase text-slate-500 tracking-[0.2em] border-r border-white/5 flex items-center gap-2">
              Budget Category
              <Tooltip content="Hierarchical structure of your OPEX budget categories, from Cost Centers to specific line items.">
                <Info size={12} className="text-slate-700 hover:text-slate-400" />
              </Tooltip>
            </div>
            {periods.map((p) => (
              <div key={p} className="flex-1 px-4 py-4 font-black text-xs uppercase text-slate-500 text-center border-r border-white/5 tracking-tighter">
                {p}
              </div>
            ))}
            <div className="w-[160px] px-6 py-4 font-black text-xs uppercase text-blue-500 text-right bg-blue-500/5 tracking-[0.2em] flex items-center justify-end gap-2">
              Annualized Forecast
            </div>
          </div>

          {/* Hierarchical Data */}
          <div className="divide-y divide-slate-800/40">
            {rows.map((row) => (
              <div key={row.operational_budget_category_id} className="flex items-center bg-slate-900 border-l border-brand-primary/20 hover:bg-slate-800/80 transition group">
                <div className="w-[320px] px-6 py-4 flex items-center gap-3 cursor-pointer">
                  <div className="w-5 h-5 rounded bg-slate-950 border border-slate-800 flex items-center justify-center text-slate-500 group-hover:text-brand-primary transition">
                    <Zap className="w-3 h-3" />
                  </div>
                  <span className="font-black text-[11px] text-slate-200 uppercase tracking-tight">
                    {row.operational_budget_category_id.slice(0, 4).toUpperCase()} <span className="text-slate-500 mx-1">|</span> {row.name}
                  </span>
                </div>
                {periods.map((p) => (
                  <div key={p} className="flex-1 px-2">
                    <input
                      type="text"
                      placeholder="0.00"
                      value={getCellValue(row.operational_budget_category_id, p) === 0 ? '' : getCellValue(row.operational_budget_category_id, p).toString()}
                      className="w-full bg-slate-950/40 border border-slate-800/60 rounded-lg px-2 py-2 text-right focus:border-blue-500/50 focus:bg-slate-950 focus:ring-0 transition-all outline-none font-mono text-[11px] text-white shadow-inner"
                      onChange={(e) => handleCellChange(row.operational_budget_category_id, p, e.target.value)}
                    />
                  </div>
                ))}
                <div className="w-[160px] text-right px-6 font-black text-blue-500 italic text-xs tracking-tight">
                  {convertToDisplay(getRowTotal(row.operational_budget_category_id), userCurrency.code)}
                </div>
              </div>
            ))}

            {/* Totals Row */}
            <div className="flex items-center bg-slate-800 border-t border-slate-700">
              <div className="w-[320px] px-6 py-4 font-black text-xs uppercase text-slate-400 tracking-[0.2em]">Total</div>
              {periods.map((p) => (
                <div key={p} className="flex-1 px-4 py-4 font-black text-xs text-right text-slate-300 border-r border-white/5">
                  {convertToDisplay(getColumnTotal(p), userCurrency.code)}
                </div>
              ))}
              <div className="w-[160px] px-6 py-4 font-black text-xs text-right text-emerald-400 border-r border-white/5">
                {convertToDisplay(grandTotal, userCurrency.code)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlanningGrid;
