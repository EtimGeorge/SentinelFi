import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { RollupData } from './WBSHierarchyTree';
import { getWBSColor } from '../../lib/utils';
import { useCurrency } from '../context/CurrencyContext';

interface ChartData {
  name: string;
  Budget: number;
  Spent: number;
  color: string;
}

interface SpendingChartProps {
  data: RollupData[];
  sourceCurrency?: string;
}

const SpendingChart: React.FC<SpendingChartProps> = ({ data, sourceCurrency = 'NGN' }) => {
  const { convertAmount, convertToDisplay, userCurrency } = useCurrency();

  const chartData = useMemo(() => {
    // 1. Filter for only Level 1 WBS items (root nodes)
    const level1Data = data.filter(item => !item.parent_wbs_id);

    return level1Data.map(item => ({
      name: `${item.wbs_code} ${item.description.substring(0, 15)}...`,
      Budget: convertAmount(Number(item.total_cost_budgeted), sourceCurrency, userCurrency.code),
      Spent: convertAmount(Number(item.total_paid_rollup), sourceCurrency, userCurrency.code),
      color: getWBSColor(item.wbs_code),
    }));
  }, [data, sourceCurrency, userCurrency.code, convertAmount]);

  if (chartData.length === 0) {
    return (
      <div className="h-96 flex items-center justify-center text-gray-500 bg-gray-900/50 rounded-xl border border-dashed border-gray-700">
        No Level 1 WBS data to display in chart.
      </div>
    );
  }

  const budgetColor = '#4B5563';
  const spentColor = '#0D9488';
  
  return (
    <div className="bg-gray-900 p-6 rounded-xl shadow-lg h-[400px] border border-gray-700">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis 
            dataKey="name" 
            angle={-20} 
            textAnchor="end" 
            height={60} 
            stroke="#9CA3AF"
            tick={{ fill: '#D1D5DB' }}
            interval={0}
            style={{ fontSize: '12px' }}
          />
          <YAxis 
            tickFormatter={(value) => `${userCurrency.symbol}${(value / 1000).toFixed(0)}k`}
            stroke="#9CA3AF"
            tick={{ fill: '#D1D5DB' }}
            style={{ fontSize: '12px' }}
          />
          <Tooltip 
            contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151', borderRadius: '8px' }}
            itemStyle={{ fontSize: '12px' }}
            formatter={(value: any, name: string) => [convertToDisplay(Number(value)), name]}
            labelStyle={{ color: '#D1D5DB', fontWeight: 'bold' }}
          />
          <Legend wrapperStyle={{ paddingTop: '10px', color: '#D1D5DB' }} />
          
          <Bar 
            dataKey="Budget" 
            fill={budgetColor} 
            name="Budgeted Cost"
            radius={[4, 4, 0, 0]}
          />
          
          <Bar 
            dataKey="Spent" 
            fill={spentColor} 
            name="Actual Paid Rollup"
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default SpendingChart;
