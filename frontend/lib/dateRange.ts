import { TIME_RANGE_PRESETS, TimeRangeKey } from '../store/globalStore';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function formatDay(d: Date): string {
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

function formatFull(d: Date): string {
  return `${formatDay(d)} ${d.getFullYear()}`;
}

/**
 * Computes the { start, end } date range for a TimeRangeKey, ending today (inclusive).
 */
export function getDateRange(key: TimeRangeKey): { start: Date; end: Date } {
  const days = TIME_RANGE_PRESETS[key].days;
  const end = new Date();
  const start = new Date(end);
  start.setDate(start.getDate() - (days - 1));
  return { start, end };
}

/**
 * Human-readable range label, e.g. "1 Aug - 31 Aug 2026" or "1 Aug - 5 Sep 2026".
 * When the range is fully within one year, the year prints once.
 */
export function formatDateRange(key: TimeRangeKey): string {
  const { start, end } = getDateRange(key);
  const sameYear = start.getFullYear() === end.getFullYear();
  return sameYear
    ? `${formatDay(start)} - ${formatFull(end)}`
    : `${formatFull(start)} - ${formatFull(end)}`;
}

/**
 * Short comparison label, e.g. "vs Jul" or "vs previous quarter".
 */
export function previousPeriodLabel(key: TimeRangeKey): string {
  const { start } = getDateRange(key);
  const prev = new Date(start);
  prev.setDate(prev.getDate() - 1);
  switch (key) {
    case '7d':
      return 'vs prev 7 days';
    case '30d':
      return 'vs prev 30 days';
    case 'quarter':
      return 'vs prev quarter';
    case 'year':
      return 'vs prev year';
    default:
      return `vs ${MONTHS[prev.getMonth()]}`;
  }
}