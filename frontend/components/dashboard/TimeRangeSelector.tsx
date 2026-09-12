import React from 'react';
import useGlobalStore, { type TimeRangeKey, TIME_RANGE_PRESETS } from '../../store/globalStore';

const RANGE_OPTIONS: { key: TimeRangeKey; short: string }[] = [
  { key: '7d', short: '7D' },
  { key: '30d', short: '30D' },
  { key: 'quarter', short: 'Q' },
  { key: 'year', short: 'Y' },
];

/**
 * Global time-range control backed by globalStore. Renders a compact segmented
 * control; pages read `timeRange` from the store to shape their queries.
 */
const TimeRangeSelector: React.FC = () => {
  const timeRange = useGlobalStore((s) => s.timeRange);
  const setTimeRange = useGlobalStore((s) => s.setTimeRange);

  return (
    <div className="flex items-center gap-1 rounded-lg border border-gray-700 bg-gray-800/60 p-1" role="group" aria-label="Time range">
      {RANGE_OPTIONS.map(({ key, short }) => (
        <button
          key={key}
          type="button"
          onClick={() => setTimeRange(key)}
          aria-pressed={timeRange === key}
          title={TIME_RANGE_PRESETS[key].label}
          className={`tap-target rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${timeRange === key ? 'bg-brand-primary text-white' : 'text-gray-400 hover:text-white'}`}
        >
          {short}
        </button>
      ))}
    </div>
  );
};

export default TimeRangeSelector;