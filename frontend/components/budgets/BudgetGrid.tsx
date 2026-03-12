import React, { useState, useEffect, useCallback } from 'react';
import api from '../../lib/api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { Loader2, Calendar, Save } from 'lucide-react';
import debounce from 'lodash/debounce';
import { useCurrency } from '../context/CurrencyContext';
import { formatCurrency } from '../../lib/utils';

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
  allocations: PeriodAllocation[];
}

const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

const BudgetGrid: React.FC<BudgetGridProps> = ({ budgetId }) => {
  const { isAuthenticated } = useAuth();
  const { userCurrency } = useCurrency();
  const [lines, setLines] = useState<BudgetLine[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingMsg, setSavingMsg] = useState('');

  // Derive year from current date instead of hardcoding
  const budgetYear = new Date().getFullYear();

  const fetchGrid = useCallback(async () => {
    if (!isAuthenticated) return;
    setLoading(true);
    try {
      const res = await api.get(`/operational-budgets/${budgetId}/grid`);
      setLines(res.data);
    } catch (error) {
      toast.error('Failed to load budget grid');
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, budgetId]);

  useEffect(() => {
    fetchGrid();
  }, [fetchGrid]);

  // Debounced Save — stores amounts in native currency (no USD conversion)
  const saveCell = useCallback(
    debounce(async (categoryId: string, monthIndex: number, amount: number) => {
      setSavingMsg('Saving...');
      try {
        const date = new Date(budgetYear, monthIndex, 1);
        const dateStr = date.toISOString().split('T')[0];

        await api.post('/operational-budgets/allocation', {
          operational_budget_category_id: categoryId,
          period_date: dateStr,
          amount,
          period_type: 'MONTHLY'
        });
        setSavingMsg('All changes saved');
        setTimeout(() => setSavingMsg(''), 2000);
      } catch (e) {
        setSavingMsg('Error saving!');
      }
    }, 1000),
    [budgetYear]
  );

  const handleCellChange = (lineIndex: number, monthIndex: number, val: string) => {
    // Store amounts in native currency — no USD conversion
    const amount = parseFloat(val) || 0;
    saveCell(lines[lineIndex].operational_budget_category_id, monthIndex, amount);
  };

  if (loading) return <div className="p-10 flex justify-center"><Loader2 className="animate-spin text-brand-primary" /></div>;

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
            {MONTHS.map(m => (
              <th key={m} className="px-2 py-3 text-right bg-gray-800 min-w-[100px]">{m}</th>
            ))}
            <th className="px-4 py-3 text-right bg-gray-800 font-bold text-brand-primary">Total</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-700">
          {lines.map((line, lIdx) => (
            <tr key={line.operational_budget_category_id} className="hover:bg-gray-800/30">
              <td className="px-4 py-2 font-medium text-white sticky left-0 bg-gray-900/90 z-10 border-r border-gray-700">
                {line.name}
              </td>
              {MONTHS.map((_, mIdx) => {
                const matched = line.allocations?.find(a => new Date(a.period_date).getMonth() === mIdx);
                const val = matched ? Number(matched.planned_amount) : 0;

                return (
                  <td key={mIdx} className="p-1 border-r border-gray-700/30">
                    <input
                      className="w-full bg-transparent text-right p-1 focus:bg-gray-800 focus:outline-none focus:ring-1 focus:ring-brand-primary rounded font-mono text-gray-300"
                      defaultValue={val || ''}
                      onBlur={(e) => handleCellChange(lIdx, mIdx, e.target.value)}
                    />
                  </td>
                );
              })}
              <td className="px-4 py-2 text-right font-bold text-white bg-gray-800/20">
                {formatCurrency(line.allocations?.reduce((sum, a) => sum + Number(a.planned_amount), 0) || 0)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default BudgetGrid;
