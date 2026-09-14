import React from 'react';
import Sparkline from '../common/Sparkline';

interface MetricHeroProps {
  label: string;
  value: React.ReactNode;
  period: string;
  trend?: {
    value: number;
    period: string;
    sparkline?: number[];
  };
  progress?: {
    current: number;
    target: number;
    label?: string;
  };
  anomaly?: string | null;
  onInteractiveElementClick?: () => void;
}

/**
 * Primary dashboard metric, the largest, heaviest-weighted number on the page.
 * Supports drill-down (whole card clickable), sparkline, and goal progress.
 */
const MetricHero: React.FC<MetricHeroProps> = ({
  label, value, period, trend, progress, anomaly, onInteractiveElementClick,
}) => {
  const progressPct = progress ? Math.min(100, (progress.current / Math.max(1, progress.target)) * 100) : null;
  const trendPositive = trend ? trend.value >= 0 : null;
  const isOverTarget = progress ? progress.current > progress.target : false;

  const inner = (
    <>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center gap-2">
          <span className="text-label text-gray-400">{label}</span>
          {anomaly && (
            <span
              className="inline-flex shrink-0 items-center gap-1 rounded-sm bg-alert-critical/15 px-1.5 py-0.5 text-[11px] font-semibold text-alert-critical"
              role="img"
              aria-label={anomaly}
              title={anomaly}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-alert-critical" />
              Anomaly
            </span>
          )}
        </div>

        <div className="mt-1 flex min-w-0 items-baseline gap-2">
          <span className="font-mono text-2xl font-semibold leading-8 tracking-tight text-white whitespace-nowrap overflow-hidden text-ellipsis sm:text-3xl">
            {value}
          </span>
          {trend && (
            <>
              <span className={`shrink-0 rounded-sm px-1.5 py-0.5 text-xs font-semibold leading-none whitespace-nowrap ${trendPositive ? 'bg-alert-positive/15 text-alert-positive' : 'bg-alert-critical/15 text-alert-critical'}`}>
                {trendPositive && '+'}{trend.value.toFixed(1)}%
              </span>
              <span className="truncate text-caption">{trend.period}</span>
            </>
          )}
        </div>
        <p className="mt-0.5 text-caption">{period}</p>

        {progress !== undefined && progressPct !== null && (
          <div className="mt-4">
            <div className="mb-1 flex items-center justify-between">
              <span className="text-caption">{progress.label || 'Progress toward target'}</span>
              <span className={`font-mono text-xs font-medium ${isOverTarget ? 'text-alert-critical' : 'text-gray-300'}`}>
                {progressPct.toFixed(0)}%
              </span>
            </div>
            <div
              className="h-1.5 w-full overflow-hidden rounded-full bg-gray-700"
              role="progressbar"
              aria-valuenow={Math.round(progressPct)}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={progress.label || 'Progress toward target'}
            >
              <div
                className={`h-full rounded-full transition-all duration-500 ${isOverTarget ? 'bg-alert-critical' : 'bg-brand-primary'}`}
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {trend?.sparkline && (
        <div className="hidden w-40 shrink-0 sm:block">
          <Sparkline data={trend.sparkline} positive={trendPositive === null ? true : trendPositive} height={56} />
        </div>
      )}
    </>
  );

  if (onInteractiveElementClick) {
    return (
      <button
        type="button"
        onClick={onInteractiveElementClick}
        className="flex min-w-0 flex-col rounded-lg border border-gray-700/60 bg-gray-800/80 p-5 text-left shadow-elev-sm transition-shadow duration-200 hover:shadow-elev-md sm:flex-row sm:items-center sm:gap-6"
        aria-label={`${label} - click to view breakdown`}
      >
        {inner}
      </button>
    );
  }

  return (
    <div className="flex min-w-0 flex-col rounded-lg border border-gray-700/60 bg-gray-800/80 p-5 shadow-elev-sm sm:flex-row sm:items-center sm:gap-6">
      {inner}
    </div>
  );
};

export default MetricHero;