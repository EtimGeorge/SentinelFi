import React, { useMemo } from 'react';
import { PieChart as RechartsPieChart } from 'recharts';
import {
  ResponsiveChartContainer,
  ChartTooltip,
  ChartLegend,
  ChartPie,
  CHART_COLORS,
  getChartColor,
  BaseChartProps,
} from './BaseChart';
import { AlertCircle } from 'lucide-react';

interface PieChartDataPoint {
  name: string;
  value: number;
  fill?: string;
}

export interface PieChartProps extends BaseChartProps {
  data: PieChartDataPoint[];
  dataKey?: string;
  nameKey?: string;
  colors?: string[];
  innerRadius?: number | string;
  outerRadius?: number | string;
  showLegend?: boolean;
  showTooltip?: boolean;
  showLabels?: boolean;
  height?: number | string;
  cx?: number | string;
  cy?: number | string;
}

/**
 * Animated pie/donut chart component.
 * Follows DESIGN.md: surface-1 cards, hairline borders, lavender-blue accent,
 * text-xs labels, CSS custom properties for colors.
 *
 * Example usage:
 *   <PieChart
 *     data={[{ name: 'Budgeted', value: 80000 }, { name: 'Spent', value: 60000 }]}
 *     dataKey="value"
 *     nameKey="name"
 *     height={200}
 *   />
 */
export const PieChart: React.FC<PieChartProps> = ({
  data,
  dataKey = 'value',
  nameKey = 'name',
  colors,
  innerRadius = 60,
  outerRadius = 80,
  showLegend = true,
  showTooltip = true,
  showLabels = false,
  height = 200,
  cx = '50%',
  cy = '50%',
  animate = true,
  ...rest
}) => {
  const pieColors = useMemo(() => {
    if (colors) return colors;
    return data.map((_, i) => getChartColor(i));
  }, [data, colors]);

  if (!data || data.length === 0) {
    return (
      <div className="chart-empty-state">
        <AlertCircle className="w-8 h-8 text-gray-500 mx-auto mb-3" />
        <p className="text-sm font-medium text-gray-300 mb-1">No data available</p>
        <p className="text-xs text-gray-500">Adjust filters to view data.</p>
      </div>
    );
  }

  const total = data.reduce((sum, d) => sum + Number(d[dataKey]), 0);

  return (
    <ResponsiveChartContainer width="100%" height={height} animate={animate}>
      <RechartsPieChart>
        {data.map((entry, index) => (
          <ChartPie
            key={entry[nameKey] || index}
            data={[{ value: entry[dataKey], name: entry[nameKey] }]}
            dataKey={dataKey}
            nameKey={nameKey}
            cx={cx}
            cy={cy}
            innerRadius={innerRadius}
            outerRadius={outerRadius}
            fill={pieColors[index] || getChartColor(index)}
            label={showLabels ? ({ name, value }: any) => `${name}: ${value}` : false}
            labelLine={showLabels ? true : false}
          />
        ))}
        {showTooltip && (
          <ChartTooltip
            formatter={(value: any) => {
              const pct = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
              return [value.toString(), `${pct}%`];
            }}
            labelFormatter={(value: any) => value}
          />
        )}
        {showLegend && <ChartLegend wrapperStyle={{ fontSize: '11px', paddingTop: '20px' }} />}
      </RechartsPieChart>
    </ResponsiveChartContainer>
  );
};

export default PieChart;
