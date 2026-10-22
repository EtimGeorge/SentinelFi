import React, { useMemo } from 'react';
import { LineChart as RechartsLineChart } from 'recharts';
import {
  ResponsiveChartContainer,
  ChartXAxis,
  ChartYAxis,
  ChartTooltip,
  ChartLegend,
  ChartLine,
  ChartCartesianGrid,
  CHART_COLORS,
  getChartColor,
  BaseChartProps,
} from './BaseChart';
import { AlertCircle } from 'lucide-react';

export interface LineChartDataPoint {
  [key: string]: any;
}

export interface LineChartProps extends BaseChartProps {
  data: LineChartDataPoint[];
  xDataKey: string;
  yDataKeys: string[];
  yDataLabels?: Record<string, string>;
  colors?: string[];
  strokeWidth?: number;
  dot?: boolean | { r?: number; fill?: string };
  showGrid?: boolean;
  showLegend?: boolean;
  showTooltip?: boolean;
  yTickFormatter?: (value: any) => string;
  xTickFormatter?: (value: any) => string;
  height?: number | string;
}

/**
 * Animated line chart component.
 * Follows DESIGN.md: surface-1 cards, hairline borders, lavender-blue accent,
 * text-xs labels, CSS custom properties for colors.
 *
 * Example usage:
 *   <LineChart
 *     data={series}
 *     xDataKey="date"
 *     yDataKeys={['value']}
 *     yDataLabels={{ value: 'Revenue' }}
 *     height={300}
 *   />
 */
export const LineChart: React.FC<LineChartProps> = ({
  data,
  xDataKey,
  yDataKeys,
  yDataLabels = {},
  colors,
  strokeWidth = 2,
  dot = true,
  showGrid = true,
  showLegend = true,
  showTooltip = true,
  yTickFormatter,
  xTickFormatter,
  height = 300,
  animate = true,
  ...rest
}) => {
  const lineColors = useMemo(() => {
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
      <RechartsLineChart>
        {showGrid && <ChartCartesianGrid vertical={false} horizontal />}
        <ChartXAxis dataKey={xDataKey} tickFormatter={xTickFormatter} />
        <ChartYAxis tickFormatter={yTickFormatter} />
        {yDataKeys.map((key, i) => (
          <ChartLine
            key={key}
            dataKey={key}
            name={yDataLabels[key] || key}
            stroke={lineColors[i]}
            strokeWidth={strokeWidth}
            dot={dot}
            activeDot={{ r: 4, fill: lineColors[i] }}
          />
        ))}
        {showTooltip && (
          <ChartTooltip
            formatter={(value: any) => [value.toString(), 'Value']}
            labelFormatter={(value: any) => value}
          />
        )}
        {showLegend && <ChartLegend wrapperStyle={{ fontSize: '11px', paddingTop: '20px' }} />}
      </RechartsLineChart>
    </ResponsiveChartContainer>
  );
};

export default LineChart;
