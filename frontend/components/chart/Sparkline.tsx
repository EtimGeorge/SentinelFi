import React from 'react';
import { LineChart as RechartsLineChart } from 'recharts';
import {
  ResponsiveChartContainer,
  ChartXAxis,
  ChartYAxis,
  ChartLine,
  ChartCartesianGrid,
  ChartTooltip,
  getChartColor,
} from './BaseChart';
import { AlertCircle } from 'lucide-react';

export interface SparklineProps {
  data: number[];
  positive?: boolean;
  height?: number;
  width?: number | string;
  showGrid?: boolean;
  showAxes?: boolean;
  showTooltip?: boolean;
  animate?: boolean;
}

/**
 * Minimal sparkline chart - shows trend at a glance.
 * Follows DESIGN.md: no axes by default, single color line, small size.
 * Default color is brand-primary (#5e6ad2) unless positive/negative override.
 *
 * Example usage:
 *   <Sparkline data={[10, 20, 15, 25, 30]} positive height={56} />
 */
export const Sparkline: React.FC<SparklineProps> = ({
  data,
  positive = true,
  height = 32,
  width = '100%',
  showGrid = false,
  showAxes = false,
  showTooltip = false,
  animate = true,
}) => {
  if (!data || data.length < 2) return null;

  const points = data.map((value, index) => ({ index, value }));
  const color = positive ? 'var(--chart-success)' : 'var(--chart-critical)';

  const minValue = Math.min(...data);
  const maxValue = Math.max(...data);
  const allSame = minValue === maxValue;

  return (
    <ResponsiveChartContainer width={width} height={height} animate={animate}>
      <RechartsLineChart
        data={points}
        margin={{ top: 2, right: 0, bottom: 2, left: 0 }}
      >
        {showGrid && <ChartCartesianGrid vertical={false} horizontal />}
        {!showAxes && (
          <>
            <ChartXAxis dataKey="index" hide />
            <ChartYAxis dataKey="value" hide />
          </>
        )}
        {showAxes && (
          <>
            <ChartXAxis dataKey="index" stroke="var(--chart-axis)" fontSize={10} />
            <ChartYAxis dataKey="value" stroke="var(--chart-axis)" fontSize={10} />
          </>
        )}
        {showTooltip && <ChartTooltip formatter={(value: any) => [value.toString(), 'Value']} />}
        <ChartLine
          dataKey="value"
          stroke={color}
          strokeWidth={1.5}
          strokeLinecap="round"
          dot={false}
          isAnimationActive={animate}
          animationDuration={1200}
          animationEasing="ease"
        />
      </RechartsLineChart>
    </ResponsiveChartContainer>
  );
};

export default Sparkline;
