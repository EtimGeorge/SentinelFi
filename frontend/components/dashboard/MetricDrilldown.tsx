import React, { useEffect, useMemo } from 'react';
import { X } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useCurrency } from '../../components/context/CurrencyContext';

export interface DrilldownPoint {
  date: string;
  amount: number;
}

interface MetricDrilldownProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  history: DrilldownPoint[];
  sourceCurrency: string;
  footer?: React.ReactNode;
}

/**
 * Slide-over showing the movement of a single metric over the active period.
 * Used for the "click the primary number for the breakdown" pattern.
 */
const MetricDrilldown: React.FC<MetricDrilldownProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  history,
  sourceCurrency,
  footer,
}) => {
  const { convertAmount, convertToDisplay, userCurrency } = useCurrency();
  const closeButtonRef = React.useRef<HTMLButtonElement>(null);

  const series = useMemo(() => {
    const src = sourceCurrency || 'NGN';
    return history.map((h) => ({
      date: new Date(h.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      value: convertAmount(h.amount, src, userCurrency.code),
    }));
  }, [history, sourceCurrency, userCurrency.code, convertAmount]);

  const stats = useMemo(() => {
    if (series.length === 0) return { current: 0, average: 0, peak: 0, low: 0 };
    const values = series.map((s) => s.value);
    const current = values[values.length - 1];
    const average = values.reduce((a, b) => a + b, 0) / values.length;
    return { current, average, peak: Math.max(...values), low: Math.min(...values) };
  }, [series]);

  useEffect(() => {
    if (!isOpen) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    closeButtonRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = 'unset';
      previouslyFocused?.focus?.();
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose} aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="absolute right-0 top-0 flex h-full w-full max-w-md flex-col border-l border-gray-700 bg-brand-dark elev-lg animate-in slide-in-from-right-full duration-300"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-gray-700 bg-brand-dark/50 p-5">
          <div className="min-w-0">
            <p className="text-label text-gray-500">{title}</p>
            <h3 className="mt-0.5 truncate text-lg font-semibold text-white">{subtitle || '\u00a0'}</h3>
          </div>
          <button
            type="button"
            ref={closeButtonRef}
            onClick={onClose}
            aria-label="Close breakdown"
            className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-800 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Chart */}
        <div className="h-56 w-full px-5 pt-5">
          {series.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={series}>
                <defs>
                  <linearGradient id="drilldownFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--chart-budget)" stopOpacity={0.28} />
                    <stop offset="100%" stopColor="var(--chart-budget)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" vertical={false} />
                <XAxis dataKey="date" stroke="var(--chart-axis)" fontSize={10} tickLine={false} axisLine={false} minTickGap={24} />
                <YAxis stroke="var(--chart-axis)" fontSize={10} tickLine={false} axisLine={false} width={54} tickFormatter={(v) => `${userCurrency.symbol}${(Number(v) / 1000).toFixed(0)}k`} />
                <Tooltip
                  contentStyle={{ backgroundColor: 'var(--chart-tooltip)', border: '1px solid var(--chart-axis)', borderRadius: '8px' }}
                  itemStyle={{ fontSize: '12px' }}
                  formatter={(value: any) => [convertToDisplay(Number(value)), 'Value']}
                />
                <Area type="monotone" dataKey="value" stroke="var(--chart-budget)" strokeWidth={2} fill="url(#drilldownFill)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-gray-500">No history in this period.</div>
          )}
        </div>

        {/* Stats */}
        <div className="px-5 pt-5">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Latest" value={convertToDisplay(stats.current, sourceCurrency)} />
            <Stat label="Period avg" value={convertToDisplay(stats.average, sourceCurrency)} />
            <Stat label="Peak" value={convertToDisplay(stats.peak, sourceCurrency)} />
            <Stat label="Low" value={convertToDisplay(stats.low, sourceCurrency)} />
          </div>
        </div>

        {/* Footer */}
        {footer && (
          <div className="mt-auto border-t border-gray-700 bg-brand-dark/50 p-4">{footer}</div>
        )}
      </div>
    </div>
  );
};

const Stat: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="rounded-lg border border-gray-700/60 bg-gray-800/40 p-3">
    <p className="text-label-sm text-gray-500">{label}</p>
    <p className="mt-1 truncate font-mono text-sm font-semibold text-white" title={value}>{value}</p>
  </div>
);

export default MetricDrilldown;