import React from 'react';
import Sparkline from './Sparkline';

export type KpiTone = 'neutral' | 'positive' | 'warning' | 'critical';

interface KpiCardProps {
  label: string;
  value: React.ReactNode;
  icon?: React.ReactNode;
  tone?: KpiTone;
  footer?: React.ReactNode;
  trend?: {
    value: number;
    period?: string;
    sparkline?: number[];
  };
}

const toneStyles: Record<KpiTone, { badge: string; dot: string }> = {
  neutral: { badge: 'bg-gray-700/60 text-gray-200', dot: 'bg-gray-400' }, positive: { badge: 'bg-alert-positive/15 text-alert-positive', dot: 'bg-alert-positive' }, warning: { badge: 'bg-alert-warning/15 text-alert-warning', dot: 'bg-alert-warning' }, critical: { badge: 'bg-alert-critical/15 text-alert-critical', dot: 'bg-alert-critical' },
};

const KpiCard: React.FC<KpiCardProps> = ({ label, value, icon, tone = 'neutral', footer, trend }) => {
  const tokens = toneStyles[tone];
  const trendPositive = trend ? trend.value >= 0 : null;

  return (
    <div className="flex min-w-0 flex-col overflow-hidden rounded-lg border border-gray-700/60 bg-gray-800/80 p-4 shadow-elev-sm transition-shadow duration-200 hover:shadow-elev-md">
      <div className="flex items-center justify-between gap-3">
        <span className="text-label text-gray-400">{label}</span>
        {icon && (
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-gray-700/50 text-gray-300" aria-hidden>
            {icon}
          </span>
        )}
      </div>

      <div className="mt-2 flex min-w-0 items-baseline gap-2">
        <span className="font-mono text-lg font-semibold leading-6 tracking-tight text-white whitespace-nowrap overflow-hidden text-ellipsis">
          {value}
        </span>
        {trend && (
          <span className={`shrink-0 rounded-sm px-1.5 py-0.5 text-[11px] font-semibold leading-none whitespace-nowrap ${tokens.badge}`}>
            {trendPositive && '+'}{trend.value.toFixed(1)}%
          </span>
        )}
      </div>

      {trend?.period && <p className="mt-0.5 text-caption">{trend.period}</p>}

      {trend?.sparkline && (
        <div className="mt-2">
          <Sparkline data={trend.sparkline} positive={trendPositive === null ? true : trendPositive} />
        </div>
      )}

      {footer && <div className="mt-3">{footer}</div>}
    </div>
  );
};

export { KpiCard };
export default KpiCard;