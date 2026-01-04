import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { RollupData } from './WBSHierarchyTree';
import { formatCurrency, getWBSColor } from '../../lib/utils';

// Interface for the data that will be fed to the chart
interface ChartData {
  name: string; // WBS Code (e.g., '1.0 H/R')
  Budget: number;
  Spent: number;
  color: string;
}

interface SpendingChartProps {
  data: RollupData[];
}

/**
 * Transforms the flat rollup data into chart data, aggregating to WBS Level 1.
 */
const transformDataForChart = (data: RollupData[]): ChartData[] => {
  console.log('[SpendingChart] Received data for transformation:', data);
  // 1. Filter for only Level 1 WBS items (root nodes) for executive overview
  const level1Data = data.filter(item => !item.parent_wbs_id);
  console.log('[SpendingChart] Filtered Level 1 data:', level1Data);

  const chartData = level1Data.map(item => ({
    name: `${item.wbs_code} ${item.description.substring(0, 15)}...`,
    Budget: Number(item.total_cost_budgeted),
    Spent: Number(item.total_paid_rollup),
    color: getWBSColor(item.wbs_code),
  }));
  console.log('[SpendingChart] Generated chartData:', chartData);
  return chartData;
};

/**
 * Custom Tooltip for professional financial display.
 */
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const budget = payload.find((p: any) => p.name === 'Budget')?.value || 0;
    const spent = payload.find((p: any) => p.name === 'Spent')?.value || 0;
    const variance = budget - spent;
    
    return (
      <div className="bg-white p-3 border border-gray-300 shadow-xl rounded-lg text-sm">
        <p className="font-bold text-brand-dark mb-1">{label}</p>
        <p className="text-alert-positive">{`Budget: ${formatCurrency(budget)}`}</p>
        <p className="text-alert-critical">{`Spent: ${formatCurrency(spent)}`}</p>
        <p className={variance >= 0 ? "text-brand-primary font-bold" : "text-alert-critical font-bold"}>
          {`Variance: ${formatCurrency(variance)}`}
        </p>
      </div>
    );
  }
  return null;
};

/**
 * Renders the WBS Level 1 Spending vs. Budget Bar Chart.
 */
const SpendingChart: React.FC<SpendingChartProps> = ({ data }) => {
  const chartData = transformDataForChart(data);

  if (chartData.length === 0) {
    console.log('[SpendingChart] No chart data to render. Displaying empty state.');
    return (
      <div className="h-96 flex items-center justify-center text-gray-500 bg-gray-50 rounded-lg border border-dashed">
        No Level 1 WBS data to display in chart.
      </div>
    );
  }

  // Determine bar colors using the WBS Category Palette
  const budgetColor = '#1E293B'; // Dark Navy for Budget (static)
  const spentColor = '#0D9488'; // Teal for Actual Spent (Primary Brand Color)
  
  return (
    <div className="bg-gray-900 p-6 rounded-xl shadow-lg h-[400px] border border-gray-700">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" /> {/* Adjusted stroke color for dark theme */}
          <XAxis 
            dataKey="name" 
            angle={-20} 
            textAnchor="end" 
            height={60} 
            stroke="#9CA3AF" // Adjusted stroke color for dark theme
            tick={{ fill: '#D1D5DB' }} // Adjusted tick color for dark theme
            interval={0}
            style={{ fontSize: '12px' }}
          />
          <YAxis 
            tickFormatter={(value) => formatCurrency(value, 'USD', 'en-US', true)} // Using updated formatCurrency with omitCurrencySymbol
            stroke="#9CA3AF" // Adjusted stroke color for dark theme
            tick={{ fill: '#D1D5DB' }} // Adjusted tick color for dark theme
            style={{ fontSize: '12px' }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ paddingTop: '10px', color: '#D1D5DB' }} /> {/* Adjusted legend color */}
          
          {/* Budget Bar - Static background for reference */}
          <Bar 
            dataKey="Budget" 
            fill="#4B5563" // Darker gray for the budgeted reference
            name="Budgeted Cost"
            radius={[4, 4, 0, 0]}
          />
          
          {/* Spent Bar - Vibrant brand color for the actual spending */}
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
