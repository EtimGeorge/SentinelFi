import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { MoreVertical, ChevronDown } from 'lucide-react';
import { useVirtualizer } from '@tanstack/react-virtual';

// ─────────────────────────────────────────────────────────────────────────────
// table-architecture-blueprint.md implementation (§1 Reserved Action Zone,
// §2 space-driven column reordering, §3 discoverability, §4 anti-patterns).
// Guarantees: no horizontal scroll at any container width; columns reorder /
// wrap automatically to fill the space that is available; nothing is hidden
// without a persistent one-tap/keyboard path.
// ─────────────────────────────────────────────────────────────────────────────

export type DataColumnTier = 'P0' | 'P1' | 'P2' | 'P3';

export interface DataColumn<T> {
  key: string;
  label: string;
  get: (row: T) => React.ReactNode;
  tier: DataColumnTier; // P0 identity/value first, then P1/P2 metadata, P3 expansion-only
  cellClassName?: string; // alignment / font utility classes
  headerClassName?: string;
  title?: (row: T) => string; // full value for ellipsis affordance
  minWidth?: number; // px driving the space-driven reorder
}

export interface DataAction<T> {
  key: string;
  label: string;
  icon?: React.ReactNode;
  onClick: (row: T) => void;
  primary?: boolean; // pinned icon in the Reserved Action Zone
  danger?: boolean;
  visible?: (row: T) => boolean;
  title?: string;
}

export interface DataTableProps<T> {
  columns: DataColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  actions?: DataAction<T>[];
  expandedContent?: (row: T) => React.ReactNode; // extra body inside the expansion
  emptyMessage?: string;
  className?: string;
  /**
   * Optical window rendering for large tables (grid mode only). When enabled the
   * body scrolls inside a capped-height container and only visible rows are in
   * the DOM. Templates / micrometer sizes are estimated and measured live, so a
   * row that was expanded keeps its collapsed neighbours aligned. Stack (mobile)
   * mode ignores this flag and renders all rows.
   */
  virtualized?: boolean;
  /** Scroll-container height when `virtualized` (px). */
  maxHeight?: number;
  /** Estimated row height used before live measurement (px). */
  estimatedRowHeight?: number;
}

// Min column widths (px) per tier. There is NO cap on how many columns are
// visible — columns are added in priority order until the width is exhausted.
export const TIER_MIN_WIDTHS: Record<DataColumnTier, number> = {
  P0: 120,
  P1: 110,
  P2: 96,
  P3: 0,
};

// Below this container width rows switch to stacked-card mode.
export const STACK_BREAKPOINT = 640;

export interface TableLayout {
  mode: 'grid' | 'stack';
  visibleColumns: DataColumn<any>[]; // header columns (grid mode)
  lines: DataColumn<any>[][]; // wrapped rows of columns (stack mode)
  expansionColumns: DataColumn<any>[]; // reachable via the +N indicator
}

function priorityOrder<T>(cols: DataColumn<T>[]): DataColumn<T>[] {
  const tiers: DataColumnTier[] = ['P0', 'P1', 'P2', 'P3'];
  const out: DataColumn<T>[] = [];
  for (const tier of tiers) out.push(...cols.filter(c => c.tier === tier));
  return out;
}

export function computeTableLayout(
  width: number,
  columns: DataColumn<any>[],
  reservedWidth: number,
): TableLayout {
  const ordered = priorityOrder(columns);
  const dataWidth = Math.max(0, width - reservedWidth);
  const p3 = ordered.filter(c => c.tier === 'P3');
  const nonP3 = ordered.filter(c => c.tier !== 'P3');

  if (width < STACK_BREAKPOINT) {
    // Stacked mode: wrap as many columns as fit onto successive lines,
    // in priority order — nothing is dropped except P3.
    const lines: DataColumn<any>[][] = [];
    let line: DataColumn<any>[] = [];
    let used = 0;
    for (const col of nonP3) {
      const min = col.minWidth ?? TIER_MIN_WIDTHS[col.tier];
      if (line.length > 0 && used + min > dataWidth) {
        lines.push(line);
        line = [];
        used = 0;
      }
      line.push(col);
      used += min;
    }
    if (line.length > 0) lines.push(line);

    return {
      mode: 'stack',
      visibleColumns: nonP3,
      lines,
      expansionColumns: [...p3],
    };
  }

  // Grid mode: greedy fill in priority order until the width is exhausted.
  const visible: DataColumn<any>[] = [];
  let remaining = dataWidth;
  for (const col of nonP3) {
    const min = col.minWidth ?? TIER_MIN_WIDTHS[col.tier];
    if (remaining >= min) {
      visible.push(col);
      remaining -= min;
    }
  }
  const expansion = ordered.filter(col => !visible.includes(col));

  return {
    mode: 'grid',
    visibleColumns: visible,
    lines: [],
    expansionColumns: expansion,
  };
}

function useContainerWidth(): [React.RefObject<HTMLDivElement>, number] {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(1024);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(entries => {
      for (const entry of entries) {
        setWidth(Math.round(entry.contentRect.width));
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return [ref, width];
}

const ACTION_WIDTH = 40; // one icon
const KEBAB_WIDTH = 40; // overflow trigger
const ZONE_GAP = 8; // spacing

function DataTable<T>({
  columns,
  rows,
  rowKey,
  actions = [],
  expandedContent,
  emptyMessage = 'No data available.',
  className = '',
  virtualized = false,
  maxHeight = 560,
  estimatedRowHeight = 48,
}: DataTableProps<T>) {
  const [bodyRef, width] = useContainerWidth();
  const [openMenuKey, setOpenMenuKey] = useState<string | null>(null);
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set());

  const reservedWidth = useMemo(() => {
    let w = ZONE_GAP;
    if (actions.some(a => a.primary)) w += ACTION_WIDTH;
    if (actions.length > 1) w += KEBAB_WIDTH;
    return w;
  }, [actions]);

  const layout = useMemo(
    () => computeTableLayout(width, columns, reservedWidth),
    [width, columns, reservedWidth],
  );

  const { mode, visibleColumns, lines, expansionColumns } = layout;

  // Flask item model for the virtualizer (grid mode only): one item per data row,
  // plus one extra item for each expanded row so measured heights match reality.
  const virtualItemsModel = useMemo<number[]>(() => {
    if (!virtualized || mode !== 'grid' || rows.length === 0) return [];
    const model: number[] = [];
    for (let i = 0; i < rows.length; i++) {
      model.push(i);
      if (expandedKeys.has(rowKey(rows[i]))) model.push(-(i + 1)); // expansion marker
    }
    return model;
  }, [virtualized, mode, rows, expandedKeys, rowKey]);

  const virtualizer = useVirtualizer({
    count: virtualItemsModel.length,
    getScrollElement: () => bodyRef.current,
    estimateSize: () => estimatedRowHeight,
    overscan: 10,
  });

  const toggleExpansion = useCallback((key: string) => {
    setExpandedKeys(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const closeMenu = useCallback(() => setOpenMenuKey(null), []);

  useEffect(() => {
    if (!openMenuKey) return;
    const onDocClick = () => closeMenu();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeMenu();
    };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [openMenuKey, closeMenu]);

  const autoAlign = (col: DataColumn<T>): string =>
    col.headerClassName ||
    (col.cellClassName || '').includes('text-right') ? 'text-right' : '';

  if (rows.length === 0) {
    return (
      <div className={`flex flex-col items-center justify-center py-12 px-4 rounded-xl border-2 border-dashed border-gray-800 ${className}`}>
        <p className="text-gray-500 text-sm">{emptyMessage}</p>
      </div>
    );
  }

  const renderReservedZone = (row: T, key: string) => {
    const rowActions = actions.filter(a => a.visible?.(row) !== false);
    if (rowActions.length === 0) return null;

    const primaryAction = rowActions.find(a => a.primary);
    const menuActions = rowActions.filter(a => a !== primaryAction);
    const expansionCount = expansionColumns.length;

    return (
      <div className="flex items-center justify-end gap-1 shrink-0">
        {expansionCount > 0 && (
          <button
            type="button"
            onClick={() => toggleExpansion(key)}
            className="flex items-center gap-1 px-1.5 py-1 text-xs font-bold text-gray-300 bg-brand-dark/60 border border-gray-700 rounded hover:text-white hover:border-brand-primary transition"
            aria-label={`Show ${expansionCount} more details`}
          >
            +{expansionCount}
            <ChevronDown className={`w-3 h-3 transition-transform ${expandedKeys.has(key) ? 'rotate-180' : ''}`} />
          </button>
        )}
        {primaryAction && (
          <button
            type="button"
            onClick={() => primaryAction.onClick(row)}
            title={primaryAction.title || primaryAction.label}
            className={`p-1.5 rounded transition ${primaryAction.danger ? 'text-red-400 hover:text-white hover:bg-red-900/30' : 'text-brand-primary hover:text-white hover:bg-brand-primary/30'}`}
          >
            {primaryAction.icon}
          </button>
        )}
        {menuActions.length > 0 && (
          <div className="relative">
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setOpenMenuKey(openMenuKey === key ? null : key); }}
              className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-600 rounded transition"
              aria-haspopup="menu"
              aria-expanded={openMenuKey === key}
              aria-label="More actions"
            >
              <MoreVertical className="w-4 h-4" />
            </button>
            {openMenuKey === key && (
              <div
                role="menu"
                className="absolute right-0 top-8 z-30 min-w-40 bg-brand-dark border border-gray-700 rounded-lg elev-lg py-1"
              >
                {menuActions.map(action => (
                  <button
                    key={action.key}
                    role="menuitem"
                    type="button"
                    onClick={() => {
                      closeMenu();
                      action.onClick(row);
                    }}
                    className={`w-full text-left px-4 py-2 text-xs font-medium flex items-center gap-2 transition ${action.danger ? 'text-red-400 hover:bg-red-900/20' : 'text-gray-300 hover:bg-gray-700/50 hover:text-white'}`}
                  >
                    {action.icon && <span className="w-4 h-4">{action.icon}</span>}
                    {action.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const expandRowContent = (key: string, row: T) => {
    const showValues = expansionColumns.length > 0;
    return (
      <div className="px-4 py-3 bg-brand-dark/30 border-t border-gray-800">
        {showValues && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {expansionColumns.map(col => (
              <div key={col.key}>
                <div className="text-xs font-bold  text-gray-500 mb-1">{col.label}</div>
                <div className="text-xs text-gray-300 break-words">{col.get(row)}</div>
              </div>
            ))}
          </div>
        )}
        {expandedContent && expandedContent(row)}
      </div>
    );
  };

  const isVirtualized = virtualized && mode === 'grid' && virtualItemsModel.length > 0;
  const totalColumns = (visibleColumns.length || 1) + (reservedWidth > ZONE_GAP ? 1 : 0);

  return (
    <div
      ref={bodyRef}
      className={`rounded-xl border border-gray-700 bg-brand-dark/30 w-full min-w-0 ${isVirtualized ? 'overflow-auto' : 'overflow-hidden elev-lg'} ${className}`}
      style={isVirtualized ? { maxHeight, overflowY: 'auto' } : undefined}
    >
      {mode === 'grid' ? (
        <table
          className="w-full table-fixed divide-y divide-gray-700"
          aria-rowcount={isVirtualized ? rows.length : undefined}
        >
          <thead className="bg-brand-dark/50">
            <tr>
              {visibleColumns.map(col => (
                <th
                  key={col.key}
                  className={`px-3 py-3 text-xs font-black text-gray-500  whitespace-nowrap ${autoAlign(col)}`}
                >
                  {col.label}
                </th>
              ))}
              {reservedWidth > ZONE_GAP && (
                <th className="py-3" style={{ width: reservedWidth, minWidth: reservedWidth }} />
              )}
            </tr>
          </thead>
          {isVirtualized ? (
            <tbody style={{ position: 'relative', height: `${virtualizer.getTotalSize()}px` }}>
              {virtualizer.getVirtualItems().map(virtualRow => {
                const modelValue = virtualItemsModel[virtualRow.index];
                const isExpansionItem = modelValue < 0;
                const rowIndex = isExpansionItem ? -modelValue - 1 : modelValue;
                const row = rows[rowIndex];
                const key = rowKey(row);
                const style: React.CSSProperties = {
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  transform: `translateY(${virtualRow.start}px)`,
                };

                if (isExpansionItem) {
                  return (
                    <tr
                      key={`${key}:expansion`}
                      data-index={virtualRow.index}
                      ref={virtualizer.measureElement}
                      style={style}
                      className="border-b border-gray-700"
                    >
                      <td colSpan={totalColumns} className="p-0">
                        {expandRowContent(key, row)}
                      </td>
                    </tr>
                  );
                }

                return (
                  <tr
                    key={key}
                    data-index={virtualRow.index}
                    ref={virtualizer.measureElement}
                    style={style}
                    className="hover:bg-gray-700/50 transition border-b border-gray-700"
                  >
                    {visibleColumns.map(col => (
                      <td key={col.key} className={`px-3 py-3 ${col.cellClassName || ''}`}>
                        <div className="truncate" title={col.title ? col.title(row) : undefined}>
                          {col.get(row)}
                        </div>
                      </td>
                    ))}
                    {reservedWidth > ZONE_GAP && (
                      <td className="px-2 py-3 text-right align-middle">
                        {renderReservedZone(row, key)}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          ) : (
            <tbody className="divide-y divide-gray-700">
              {rows.map(row => {
                const key = rowKey(row);
                const expanded = expandedKeys.has(key);
                return (
                  <React.Fragment key={key}>
                    <tr className="hover:bg-gray-700/50 transition">
                      {visibleColumns.map(col => (
                        <td key={col.key} className={`px-3 py-3 ${col.cellClassName || ''}`}>
                          <div className="truncate" title={col.title ? col.title(row) : undefined}>
                            {col.get(row)}
                          </div>
                        </td>
                      ))}
                      {reservedWidth > ZONE_GAP && (
                        <td className="px-2 py-3 text-right align-middle">
                          {renderReservedZone(row, key)}
                        </td>
                      )}
                    </tr>
                    {expanded && (
                      <tr>
                        <td colSpan={totalColumns} className="p-0">
                          {expandRowContent(key, row)}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          )}
        </table>
      ) : (
        <div className="divide-y divide-gray-700">
          {rows.map(row => {
            const key = rowKey(row);
            const expanded = expandedKeys.has(key);
            return (
              <div key={key} className="p-3 hover:bg-gray-700/50 transition relative">
                <div className="pr-16 space-y-2">
                  {lines.map((line, lineIndex) => (
                    <div
                      key={lineIndex}
                      className="grid gap-2"
                      style={{ gridTemplateColumns: `repeat(${line.length}, minmax(0,1fr))` }}
                    >
                      {line.map(col => (
                        <div key={col.key} className="min-w-0">
                          <div className="text-xs font-bold  text-gray-500">{col.label}</div>
                          <div className={`truncate ${col.cellClassName || ''}`} title={col.title ? col.title(row) : undefined}>
                            {col.get(row)}
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
                <div className="absolute top-3 right-3">
                  {renderReservedZone(row, key)}
                </div>
                {expanded && expandRowContent(key, row)}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default DataTable;