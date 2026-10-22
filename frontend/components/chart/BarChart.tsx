import React, { useMemo } from 'react';
import { BarChart as RechartsBarChart } from 'recharts';
import {
  ResponsiveChartContainer,
  ChartXAxis,
  ChartYAxis,
  ChartTooltip,
  ChartLegend,
  ChartBar,
  ChartCartesianGrid,
  CHART_COLORS,
  getChartColor,
  BaseChartProps,
} from './BaseChart';
import { AlertCircle } from 'lucide-react';

interface BarChartDataPoint {
  [key: string]: any;
}

export interface BarChartProps extends BaseChartProps {
  data: BarChartDataPoint[];
  xDataKey: string;
  yDataKeys: string[];
  yDataLabels?: Record<string, string>;
  colors?: string[];
  layout?: 'vertical' | 'horizontal';
  stackId?: string;
  showGrid?: boolean;
  showLegend?: boolean;
  showTooltip?: boolean;
  yTickFormatter?: (value: any) => string;
  xTickFormatter?: (value: any) => string;
  height?: number | string;
  barWidth?: number;
  maxBarSize?: number;
}

/**
 * Animated bar chart component.
 * Supports vertical and horizontal layouts, stacked bars, and grouped bars.
 * Follows DESIGN.md: surface-1 cards, hairline borders, lavender-blue accent,
 * text-xs labels, CSS custom properties for colors.
 *
 * Example usage:
 *   <BarChart
 *     data={series}
 *     xDataKey="name"
 *     yDataKeys={['budget', 'spent']}
 *     yDataLabels={{ budget: 'Budgeted', spent: 'Actual' }}
 *     height={300}
 *   />
 */
export const BarChart: React.FC<BarChartProps> = ({
  data,
  xDataKey,
  yDataKeys,
  yDataLabels = {},
  colors,
  layout = 'vertical',
  stackId,
  showGrid = true,
  showLegend = true,
  showTooltip = true,
  yTickFormatter,
  xTickFormatter,
  height = 300,
  barWidth,
  maxBarSize,
  animate = true,
  ...rest
}) => {
  const barColors = useMemo(() => {
    if (colors) return colors;
    return yDataKeys.map((_, i) => getChartColor(i));
  }, [yDataKeys, colors]);

  if (!data || data.length === 0) {
    return (
      <div className="chart-empty-state">
        <AlertCircle className="w-8 h-8 text-gray-500 mx-auto mb-3" />
        <p className="text-sm font-medium text-gray-300 mb-1">No data available</p>
        <p className="text-xs text-gray-500">Adjust filters to view data.</p>
      </div>
    );
  }

  return (
    <ResponsiveChartContainer width="100%" height={height} animate={animate}>
      <RechartsBarChart layout={layout}>
        {showGrid && <ChartCartesianGrid vertical={layout === 'vertical'} horizontal={layout === 'horizontal'} />}
        <ChartXAxis dataKey={xDataKey} tickFormatter={xTickFormatter} angle={layout === 'vertical' ? -15 : 0} textAnchor={layout === 'vertical' ? 'end' : 'middle'} />
        <ChartYAxis tickFormatter={yTickFormatter} />
        {yDataKeys.map((key, i) => (
          <ChartBar
            key={key}
            dataKey={key}
            name={yDataLabels[key] || key}
            fill={barColors[i]}
            barWidth={barWidth}
            maxBarSize={maxBarSize}
          />
        ))}
        {showTooltip && (
          <ChartTooltip
            formatter={(value: any) => [value.toString(), 'Value']}
            labelFormatter={(value: any) => value}
          />
        )}
        {showLegend && <ChartLegend wrapperStyle={{ fontSize: '11px', paddingTop: '20px' }} />}
      </RechartsBarChart>
    </ResponsiveChartContainer>
  );
};

export default BarChart;
