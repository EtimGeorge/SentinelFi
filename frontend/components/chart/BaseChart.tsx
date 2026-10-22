import React from 'react';
import {
  ResponsiveContainer,
  LineChart as RechartsLineChart,
  BarChart as RechartsBarChart,
  AreaChart as RechartsAreaChart,
  PieChart as RechartsPieChart,
  Line as RechartsLine,
  Area as RechartsArea,
  Bar as RechartsBar,
  Pie as RechartsPie,
  XAxis as RechartsXAxis,
  YAxis as RechartsYAxis,
  Tooltip as RechartsTooltip,
  Legend as RechartsLegend,
  CartesianGrid as RechartsCartesianGrid,
  Cell as RechartsCell,
} from 'recharts';

/**
 * Chart color palette derived from DESIGN.md.
 * All colors use CSS custom properties defined in ChartTheme.css.
 */
export const CHART_COLORS = {
  primary: 'var(--chart-primary)',       // #5e6ad2 lavender-blue
  secondary: 'var(--chart-secondary)',   // #0ea5e9 cyan
  success: 'var(--chart-success)',       // #27a644 green
  warning: 'var(--chart-warning)',       // #f59e0b amber
  critical: 'var(--chart-critical)',     // #ef4444 red
  muted: 'var(--chart-muted)',           // #94a3b8 slate-400
  fill: 'var(--chart-fill)',             // rgba(13, 148, 136, 0.08)
  grid: 'var(--chart-grid)',             // rgba(255,255,255,0.06)
  axis: 'var(--chart-axis)',             // rgba(255,255,255,0.12)
  tooltip: 'var(--chart-tooltip)',       // #1f2937
} as const;

/**
 * Standard animation duration for chart entrances (ms).
 * RESPECTS prefers-reduced-motion via CSS in ChartTheme.css.
 */
export const CHART_ANIMATION_DURATION = 1200;

/**
 * Standard easing for chart animations.
 */
export const CHART_ANIMATION_EASING = 'ease';

/**
 * Base props for all chart components.
 */
export interface BaseChartProps {
  data: any[];
  width?: number | string;
  height?: number | string;
  margin?: { top?: number; right?: number; bottom?: number; left?: number };
  className?: string;
  animate?: boolean;
  animationDuration?: number;
}

/**
 * Wraps Recharts ResponsiveContainer with consistent sizing.
 * Enters with a fade-in animation on mount via CSS class.
 */
export const ResponsiveChartContainer: React.FC<{
  width?: number | string;
  height?: number | string;
  className?: string;
  children: React.ReactNode;
  animate?: boolean;
}> = ({ width = '100%', height = '100%', className, children, animate = true }) => (
  <ResponsiveContainer
    width={width as any}
    height={height as any}
    className={`chart-responsive chart-animate-in ${className ?? ''} ${!animate ? 'opacity-100' : ''}`}
  >
    {children}
  </ResponsiveContainer>
);

/**
 * Standard CartesianGrid with design-system styling.
 */
export const ChartCartesianGrid: React.FC<{
  vertical?: boolean;
  horizontal?: boolean;
  dasharray?: string;
}> = ({ vertical = true, horizontal = true, dasharray = '3 3' }) => (
  <RechartsCartesianGrid
    vertical={vertical}
    horizontal={horizontal}
    strokeDasharray={dasharray}
    stroke="var(--chart-grid)"
  />
);

/**
 * Standard XAxis with design-system styling.
 */
export const ChartXAxis: React.FC<{
  dataKey: string;
  tickFormatter?: (value: any) => string;
  stroke?: string;
  fontSize?: number | string;
  tick?: any;
  hide?: boolean;
  angle?: number;
  textAnchor?: string;
}> = ({ dataKey, tickFormatter, stroke = 'var(--chart-axis)', fontSize = 10, tick, hide = false, angle, textAnchor }) => {
  if (hide) return null;
  return (
    <RechartsXAxis
      dataKey={dataKey}
      stroke={stroke}
      fontSize={fontSize as any}
      tickLine={false}
      axisLine={false}
      tick={tick as any}
      tickFormatter={tickFormatter as any}
      angle={angle as any}
      textAnchor={textAnchor as any}
    />
  );
};

/**
 * Standard YAxis with design-system styling.
 */
export const ChartYAxis: React.FC<{
  tickFormatter?: (value: any) => string;
  stroke?: string;
  fontSize?: number | string;
  tick?: any;
  hide?: boolean;
  width?: number | string;
  type?: 'number' | 'category';
  dataKey?: string;
  orientation?: 'left' | 'right';
}> = ({ tickFormatter, stroke = 'var(--chart-axis)', fontSize = 10, tick, hide = false, width, type = 'number', dataKey, orientation = 'left' }) => {
  if (hide) return null;
  return (
    <RechartsYAxis
      dataKey={dataKey as any}
      stroke={stroke}
      fontSize={fontSize as any}
      tickLine={false}
      axisLine={false}
      tick={tick as any}
      tickFormatter={tickFormatter as any}
      width={width as any}
      type={type}
      orientation={orientation}
    />
  );
};

/**
 * Standard Tooltip with design-system styling.
 * Accepts a custom content component or uses the default styled one.
 */
export const ChartTooltip: React.FC<{
  content?: React.ReactNode;
  formatter?: (value: any) => string | React.ReactNode;
  labelFormatter?: (value: any) => string;
  itemStyle?: React.CSSProperties;
  contentStyle?: React.CSSProperties;
}> = ({ content, formatter, labelFormatter, itemStyle = { fontSize: '11px', fontWeight: '600' as const }, contentStyle = { backgroundColor: 'var(--chart-tooltip)', border: '1px solid var(--chart-axis)', borderRadius: '8px', padding: '10px 14px' } }) => (
  <RechartsTooltip
    content={content as any}
    itemStyle={itemStyle}
    labelStyle={{ color: 'rgba(255,255,255,0.7)', fontWeight: 'bold' as const }}
    contentStyle={contentStyle}
    formatter={formatter as any}
    labelFormatter={labelFormatter as any}
  />
);

/**
 * Standard Legend with design-system styling.
 */
export const ChartLegend: React.FC<{
  iconType?: 'circle' | 'rect' | 'line' | 'none';
  wrapperStyle?: React.CSSProperties;
  verticalAlign?: 'top' | 'middle' | 'bottom';
  align?: 'left' | 'center' | 'right';
}> = ({ iconType = 'circle', wrapperStyle, verticalAlign = 'top', align = 'right' }) => (
  <RechartsLegend
    iconType={iconType}
    wrapperStyle={{ fontSize: '11px', paddingTop: '20px', ...wrapperStyle }}
    verticalAlign={verticalAlign}
    align={align}
  />
);

/**
 * Helper to get a color from the palette by index.
 */
export const getChartColor = (index: number): string => {
  const colors = [
    CHART_COLORS.primary,
    CHART_COLORS.secondary,
    CHART_COLORS.success,
    CHART_COLORS.warning,
    CHART_COLORS.critical,
    CHART_COLORS.muted,
  ];
  return colors[index % colors.length];
};

/**
 * Standard Line component with animation support.
 * Use inside <RechartsLineChart>.
 */
export const ChartLine: React.FC<any> = React.memo((props) => (
  <RechartsLine
    {...props}
    animationDuration={CHART_ANIMATION_DURATION}
    animationEasing={CHART_ANIMATION_EASING}
    animationId="line-anim"
  />
));
ChartLine.displayName = 'ChartLine';

/**
 * Standard Area component with animation support.
 * Use inside <RechartsAreaChart>.
 */
export const ChartArea: React.FC<any> = React.memo((props) => (
  <RechartsArea
    {...props}
    animationDuration={CHART_ANIMATION_DURATION}
    animationEasing={CHART_ANIMATION_EASING}
    animationId="area-anim"
  />
));
ChartArea.displayName = 'ChartArea';

/**
 * Standard Bar component with animation support.
 * Use inside <RechartsBarChart>.
 */
export const ChartBar: React.FC<any> = React.memo((props) => (
  <RechartsBar
    {...props}
    animationDuration={CHART_ANIMATION_DURATION}
    animationEasing={CHART_ANIMATION_EASING}
    animationId="bar-anim"
  />
));
ChartBar.displayName = 'ChartBar';

/**
 * Standard Pie component with animation support.
 * Use inside <RechartsPieChart>.
 */
export const ChartPie: React.FC<any> = React.memo((props) => (
  <RechartsPie
    {...props}
    animationDuration={CHART_ANIMATION_DURATION}
    animationEasing={CHART_ANIMATION_EASING}
    animationId="pie-anim"
  />
));
ChartPie.displayName = 'ChartPie';

/**
 * Standard Legend component.
 */
export const ChartLegendComponent: React.FC<any> = React.memo((props) => (
  <RechartsLegend {...props} />
));
ChartLegendComponent.displayName = 'ChartLegend';

/**
 * Standard CartesianGrid component.
 */
export const ChartCartesianGridComponent: React.FC<any> = React.memo((props) => (
  <RechartsCartesianGrid {...props} />
));
ChartCartesianGridComponent.displayName = 'ChartCartesianGrid';

const chartComponents = {
  ResponsiveChartContainer: ResponsiveChartContainer,
  ChartCartesianGrid: ChartCartesianGrid,
  ChartXAxis: ChartXAxis,
  ChartYAxis: ChartYAxis,
  ChartTooltip: ChartTooltip,
  ChartLegend: ChartLegend,
  ChartLine: ChartLine,
  ChartArea: ChartArea,
  ChartBar: ChartBar,
  ChartPie: ChartPie,
  getChartColor,
  CHART_COLORS,
};

export default chartComponents;
