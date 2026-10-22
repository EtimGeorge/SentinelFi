import React, { useMemo } from 'react';
import {
  ResponsiveChartContainer,
  ChartXAxis,
  ChartYAxis,
  ChartTooltip,
  ChartLegend,
  ChartBar,
  ChartCartesianGrid,
  getChartColor,
} from '../chart';
import { getWBSColor } from '../../lib/utils';
import { useCurrency } from '../context/CurrencyContext';

interface ChartDataPoint {
  [key: string]: any;
}

interface SpendingChartProps {
  data: RollupData[];
  sourceCurrency?: string;
}

interface RollupData {
  [key: string]: any;
  wbs_code?: string;
  description?: string;
  parent_wbs_id?: string;
  total_cost_budgeted?: number;
  total_paid_rollup?: number;
  total_cost_actual?: number;
}

const SpendingChart: React.FC<SpendingChartProps> = ({ data, sourceCurrency = 'NGN' }) => {
  const { convertAmount, convertToDisplay, userCurrency } = useCurrency();

  const chartData = useMemo(() => {
    // 1. Filter for only Level 1 WBS items (root nodes)
    const level1Data = data.filter(item => !item.parent_wbs_id);

    return level1Data.map(item => ({
      name: `${item.wbs_code} ${item.description.substring(0, 15)}...`,
      Budget: convertAmount(Number(item.total_cost_budgeted), sourceCurrency, userCurrency.code),
      Spent: convertAmount(Number(item.total_paid_rollup || item.total_cost_actual || 0), sourceCurrency, userCurrency.code),
      color: getWBSColor(item.wbs_code),
    }));
  }, [data, sourceCurrency, userCurrency.code, convertAmount]);

  if (chartData.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-gray-500 bg-gray-900/50 rounded-xl border border-dashed border-gray-700">
        No Level 1 WBS data to display in chart.
      </div>
    );
  }

  const budgetColor = '#4B5563';
  const spentColor = '#0D9488';

  return (
    <div className="bg-gray-900 p-6 rounded-xl elev-lg h-[400px] border border-gray-700">
      <ResponsiveChartContainer width="100%" height="100%">
        <ChartBar
          data={chartData}
          xDataKey="name"
          yDataKeys={['Budget', 'Spent']}
          yDataLabels={{ Budget: 'Budgeted Cost', Spent: 'Actual Paid Rollup' }}
          colors={[budgetColor, spentColor]}
          layout="vertical"
          barWidth={20}
          height={400}
        />
      </ResponsiveChartContainer>
    </div>
  );
};

export default SpendingChart;
