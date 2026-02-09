import React, { useState, useEffect, useCallback } from 'react';
import { useSecuredApi } from '../hooks/useSecuredApi';
import useToast from '../../store/toastStore';
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
  allocations: PeriodAllocation[];
}

const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

const BudgetGrid: React.FC<BudgetGridProps> = ({ budgetId }) => {
  const api = useSecuredApi();
  const addToast = useToast((state) => state.addToast);
  const { userCurrency, convertToDisplay, convertToUSD } = useCurrency();
  const [lines, setLines] = useState<BudgetLine[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingMsg, setSavingMsg] = useState('');

  const fetchGrid = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/operational-budgets/${budgetId}/grid`);
      // Transform response to handy structure if needed, or stick to raw Entity
      setLines(res.data);
    } catch (error) {
      addToast('Failed to load budget grid', 'error');
    } finally {
      setLoading(false);
    }
  }, [api, budgetId, addToast]);

  useEffect(() => {
    fetchGrid();
  }, [fetchGrid]);

  // Debounced Save
  const saveCell = useCallback(
    debounce(async (categoryId: string, monthIndex: number, amount: number) => {
      setSavingMsg('Saving...');
      try {
        // Construct date: Current Year + Month
        // Warning: This assumes the Budget Start Date defines the Year. 
        // For Phase 1 MVP, we hardcode 2026 or need budget details.
        // Ideally, we pass the full date from the backend allocation or construct it carefully.
        const year = 2026; // TODO: Fetch from Budget Context
        const date = new Date(year, monthIndex, 1);
        const dateStr = date.toISOString().split('T')[0];

        await api.post('/operational-budgets/allocation', {
          operational_budget_category_id: categoryId,
          period_date: dateStr,
          amount, // This amount is now passed in USD by the caller
          period_type: 'MONTHLY'
        });
        setSavingMsg('All changes saved');
        setTimeout(() => setSavingMsg(''), 2000);
      } catch (e) {
        setSavingMsg('Error saving!');
      }
    }, 1000),
    [api]
  );

  const handleCellChange = (lineIndex: number, monthIndex: number, val: string) => {
    // val is in User's Display Currency (e.g. NGN)
    // We need to convert it back to USD for storage
    const displayAmount = parseFloat(val) || 0;
    const usdAmount = convertToUSD(displayAmount);

    // We don't update local state 'lines' deeply here to avoid complex re-renders/cursor jumps on controlled inputs
    // relying on defaultValue for now, which is imperfect but stable for MVP grid.
    // Ideally we'd use local state for the input value.

    saveCell(lines[lineIndex].operational_budget_category_id, monthIndex, usdAmount);
  };

  if (loading) return <div className="p-10 flex justify-center"><Loader2 className="animate-spin text-brand-primary" /></div>;

  // Use currency code as key to force re-render when currency changes, updating defaultValues
  return (
    <div key={userCurrency.code} className="overflow-x-auto rounded-lg border border-gray-700 bg-gray-900/50">
      <div className="p-2 bg-gray-800 border-b border-gray-700 flex justify-between">
        <span className="text-xs font-bold uppercase text-gray-400 flex items-center gap-2">
          <Calendar className="w-4 h-4" /> 2026 Budget ({userCurrency.code})
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
                // Find allocation for this month (basic mapping)
                const matched = line.allocations?.find(a => new Date(a.period_date).getMonth() === mIdx);
                const usdVal = matched ? Number(matched.planned_amount) : 0;

                // Convert USD to Display Currency for the input
                const displayVal = convertToDisplay(usdVal, false); // false = no symbol in input

                return (
                  <td key={mIdx} className="p-1 border-r border-gray-700/30">
                    <input
                      className="w-full bg-transparent text-right p-1 focus:bg-gray-800 focus:outline-none focus:ring-1 focus:ring-brand-primary rounded font-mono text-gray-300"
                      defaultValue={displayVal}
                      onBlur={(e) => handleCellChange(lIdx, mIdx, e.target.value)}
                    // OnChange optimization: For true real-time saving we'd use onChange, but for conversion inputs onBlur is often safer 
                    // to prevent jitter, though we have debounce. Let's use onBlur for the heavy lifting or keep onChange but accept the "controlled vs uncontrolled" risks.
                    // Given debounce, onChange is fine if we weren't doing conversion.
                    // With conversion, let's stick to defaultValue + schema.
                    />
                  </td>
                );
              })}
              <td className="px-4 py-2 text-right font-bold text-white bg-gray-800/20">
                {/* Calculate total */}
                {convertToDisplay(line.allocations?.reduce((sum, a) => sum + Number(a.planned_amount), 0) || 0)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default BudgetGrid;
