/**
 * Client-side CSV export helpers. A UTF-8 BOM is prepended so Excel renders
 * unicode (Naira signs, accented names) correctly instead of mojibake.
 */

const csvEscape = (value: unknown): string => {
  const raw = value === null || value === undefined ? '' : String(value);
  if (/[",\n\r]/.test(raw)) {
    return `"${raw.replace(/"/g, '""')}"`;
  }
  return raw;
};

export interface CsvColumn {
  header: string;
  get: (row: Record<string, unknown>) => unknown;
}

/** Build a CSV string from a list of rows serialized as objects. */
export function toCsv(rows: Record<string, unknown>[], columns: CsvColumn[]): string {
  const header = columns.map((c) => csvEscape(c.header)).join(',');
  const body = rows.map((row) => columns.map((c) => csvEscape(c.get(row))).join(','));
  return [header, ...body].join('\r\n');
}

/** Trigger a browser download of a CSV string. */
export function downloadCsv(filename: string, rows: Record<string, unknown>[], columns: CsvColumn[]): void {
  const csv = '\uFEFF' + toCsv(rows, columns);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export const isoStamp = (date: Date = new Date()): string =>
  date.toISOString().slice(0, 10);