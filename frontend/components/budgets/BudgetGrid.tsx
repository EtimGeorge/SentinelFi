import React, { useState, useEffect, useCallback } from 'react';
import api from '../../lib/api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { Loader2, Calendar, Save } from 'lucide-react';
import debounce from 'lodash/debounce';
import { useCurrency } from '../context/CurrencyContext';

interface BudgetGridProps {
  budgetId: string;
}

interface PeriodAllocation {
  id?: string;
  period_date: string;
  planned_amount: number;
}

interface BudgetLine {
  operational_budget_category_id: string;
  name: string;
  type?: string;
  budgeted_amount: number;
  allocations: PeriodAllocation[];
}

const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

const BudgetGrid: React.FC<BudgetGridProps> = ({ budgetId }) => {
  const { isAuthenticated } = useAuth();
  const { userCurrency, convertToDisplay } = useCurrency();
  const [lines, setLines] = useState<BudgetLine[]>([]);
  const [periods, setPeriods] = useState<string[]>([]);
  const [budgetYear, setBudgetYear] = useState<number>(new Date().getFullYear());
  const [loading, setLoading] = useState(true);
  const [savingMsg, setSavingMsg] = useState('');

  const fetchGrid = useCallback(async () => {
    if (!isAuthenticated) return;
    setLoading(true);
    try {
      const res = await api.get(`/operational-budgets/${budgetId}/grid`);
      const cats: BudgetLine[] = Array.isArray(res.data) ? res.data : [];
      setLines(cats);

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
      toast.error('Failed to load budget grid.');
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, budgetId]);

  useEffect(() => {
    fetchGrid();
  }, [fetchGrid]);

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
    saveCell(categoryId, periodKey, amount);
  };

  const getCellValue = (line: BudgetLine, periodKey: string) => {
    const matched = line.allocations?.find(a => a.period_date.slice(0, 7) === periodKey);
    return matched ? Number(matched.planned_amount || 0) : 0;
  };

  const getRowTotal = (line: BudgetLine) => {
    return periods.reduce((sum, pk) => sum + getCellValue(line, pk), 0);
  };

  const getColumnTotal = (periodKey: string) => {
    return lines.reduce((sum, l) => sum + getCellValue(l, periodKey), 0);
  };

  const grandTotal = lines.reduce((sum, l) => sum + getRowTotal(l), 0);

  if (loading) {
    return <div className="p-10 flex justify-center"><Loader2 className="animate-spin text-brand-primary" /></div>;
  }

  return (
    <div key={userCurrency.code} className="overflow-x-auto rounded-lg border border-gray-700 bg-gray-900/50">
      <div className="p-2 bg-gray-800 border-b border-gray-700 flex justify-between">
        <span className="text-xs font-bold uppercase text-gray-400 flex items-center gap-2">
          <Calendar className="w-4 h-4" /> {budgetYear} Budget ({userCurrency.code})
        </span>
        <span className="text-xs text-green-400 font-mono">{savingMsg}</span>
      </div>
      <table className="w-full text-sm text-left">
        <thead className="text-xs text-gray-400 uppercase bg-gray-800">
          <tr>
            <th className="px-4 py-3 sticky left-0 bg-gray-800 z-10 w-48">Category</th>
            {periods.map(p => (
              <th key={p} className="px-2 py-3 text-right bg-gray-800 min-w-[100px]">{p}</th>
            ))}
            <th className="px-4 py-3 text-right bg-gray-800 font-bold text-brand-primary">Total</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-700">
          {lines.map((line) => (
            <tr key={line.operational_budget_category_id} className="hover:bg-gray-800/30">
              <td className="px-4 py-2 font-medium text-white sticky left-0 bg-gray-900/90 z-10 border-r border-gray-700">
                {line.name}
              </td>
              {periods.map(p => {
                const val = getCellValue(line, p);
                return (
                  <td key={p} className="p-1 border-r border-gray-700/30">
                    <input
                      className="w-full bg-transparent text-right p-1 focus:bg-gray-800 focus:outline-none focus:ring-1 focus:ring-brand-primary rounded font-mono text-gray-300"
                      defaultValue={val || ''}
                      onBlur={(e) => handleCellChange(line.operational_budget_category_id, p, e.target.value)}
                    />
                  </td>
                );
              })}
              <td className="px-4 py-2 text-right font-bold text-white bg-gray-800/20">
                {convertToDisplay(getRowTotal(line), userCurrency.code)}
              </td>
            </tr>
          ))}
          {/* Totals Row */}
          <tr className="bg-gray-800/40 font-black text-slate-200 border-t border-slate-700">
            <td className="px-4 py-2 sticky left-0 bg-gray-900 z-10 border-r border-gray-700">Total</td>
            {periods.map(p => (
              <td key={p} className="p-1 border-r border-gray-700/30 text-right">
                {convertToDisplay(getColumnTotal(p), userCurrency.code)}
              </td>
            ))}
            <td className="px-4 py-2 text-right text-emerald-400">
              {convertToDisplay(grandTotal, userCurrency.code)}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
};

export default BudgetGrid;
