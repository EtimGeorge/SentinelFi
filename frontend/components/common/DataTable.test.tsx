import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import DataTable, { computeTableLayout, TIER_MIN_WIDTHS, STACK_BREAKPOINT, type DataColumn, type DataColumnTier } from './DataTable';

const columns: DataColumn<any>[] = [
  { key: 'merchant', label: 'Merchant', tier: 'P0' as DataColumnTier, get: (r) => r.merchant },
  { key: 'amount', label: 'Amount', tier: 'P0' as DataColumnTier, cellClassName: 'text-right', get: (r) => r.amount },
  { key: 'category', label: 'Category', tier: 'P1' as DataColumnTier, get: (r) => r.category },
  { key: 'date', label: 'Date', tier: 'P1' as DataColumnTier, get: (r) => r.date },
  { key: 'status', label: 'Status', tier: 'P2' as DataColumnTier, get: (r) => r.status },
  { key: 'notes', label: 'Notes', tier: 'P3' as DataColumnTier, get: (r) => r.notes },
];

const rows = [
  { id: '1', merchant: 'Amazon', amount: '120.00', category: 'SaaS', date: '2026-09-01', status: 'OPEN', notes: 'monthly plan' },
  { id: '2', merchant: 'AWS', amount: '340.50', category: 'Hosting', date: '2026-09-02', status: 'OPEN', notes: 'compute' },
];

const actions = [
  { key: 'edit', label: 'Edit', primary: true, onClick: () => {} },
  { key: 'delete', label: 'Delete', danger: true, onClick: () => {} },
];

const RESERVED = 8 + 40 + 40; // ZONE_GAP + primary + kebab

class ResizeObserverMock {
  static width = 700;
  static instances = new Set<ResizeObserverMock>();
  private cb: ResizeObserverCallback;
  private el?: Element;
  constructor(cb: ResizeObserverCallback) {
    this.cb = cb;
    ResizeObserverMock.instances.add(this);
  }
  observe(el: Element) {
    this.el = el;
    const w = ResizeObserverMock.width;
    this.cb([{ target: el, contentRect: { width: w, height: 400 } }] as unknown as ResizeObserverEntry[], this);
  }
  disconnect() {
    ResizeObserverMock.instances.delete(this);
  }
  unobserve() {}
}

describe('computeTableLayout (space-driven reordering)', () => {
  it('renders every column at full desktop width, P3 expansion-only', () => {
    const layout = computeTableLayout(1440, columns, RESERVED);
    expect(layout.mode).toBe('grid');
    expect(layout.visibleColumns.map(c => c.key)).toEqual([
      'merchant', 'amount', 'category', 'date', 'status',
    ]);
    expect(layout.expansionColumns.map(c => c.key)).toEqual(['notes']);
  });

  it('drops the lowest-priority columns only when space is exhausted', () => {
    const layout = computeTableLayout(640, columns, RESERVED);
    expect(layout.mode).toBe('grid');
    // data zone = 640 - 88 = 552; P0x2 + P1x2 = 460; status (96) needs 556 -> over
    expect(layout.visibleColumns.map(c => c.key)).toEqual([
      'merchant', 'amount', 'category', 'date',
    ]);
    expect(layout.expansionColumns.map(c => c.key)).toEqual(['status', 'notes']);
  });

  it('wraps overflowing columns onto extra lines instead of dropping them', () => {
    const layout = computeTableLayout(600, columns, RESERVED);
    expect(layout.mode).toBe('stack');
    expect(layout.lines.map(l => l.map(c => c.key))).toEqual([
      ['merchant', 'amount', 'category', 'date'],
      ['status'],
    ]);
    expect(layout.expansionColumns.map(c => c.key)).toEqual(['notes']);
  });

  it('never limits the visible columns to a fixed count', () => {
    const at375 = computeTableLayout(375, columns, RESERVED);
    expect(at375.mode).toBe('stack');
    expect(at375.lines.map(l => l.map(c => c.key))).toEqual([
      ['merchant', 'amount'],
      ['category', 'date'],
      ['status'],
    ]);
    expect(at375.expansionColumns.map(c => c.key)).toEqual(['notes']);

    const at320 = computeTableLayout(320, columns, RESERVED);
    expect(at320.mode).toBe('stack');
    expect(at320.lines.map(l => l.map(c => c.key))).toEqual([
      ['merchant'],
      ['amount', 'category'],
      ['date', 'status'],
    ]);
    expect(at320.expansionColumns.map(c => c.key)).toEqual(['notes']);
  });

  it('always keeps every P0 column reachable at any width', () => {
    for (const width of [320, 375, 428, 600, 700, 768, 1024, 1440]) {
      const layout = computeTableLayout(width, columns, RESERVED);
      const onScreen = layout.mode === 'grid'
        ? layout.visibleColumns
        : layout.lines.flat();
      const keys = onScreen.map(c => c.key);
      expect(keys).toContain('merchant');
      expect(keys).toContain('amount');
    }
  });

  it('uses container width, not window width', () => {
    expect(STACK_BREAKPOINT).toBe(640);
    expect(TIER_MIN_WIDTHS.P0).toBe(120);
    expect(TIER_MIN_WIDTHS.P1).toBe(110);
    expect(TIER_MIN_WIDTHS.P2).toBe(96);
  });
});

describe('DataTable reachability & no-horizontal-scroll', () => {
  beforeAll(() => {
    (globalThis as unknown as { ResizeObserver: typeof ResizeObserver }).ResizeObserver =
      ResizeObserverMock as unknown as typeof ResizeObserver;
  });

  afterEach(() => {
    ResizeObserverMock.width = 700;
    ResizeObserverMock.instances.clear();
  });

  it('renders no scroll container at any sweep width', () => {
    for (const width of [320, 375, 428, 600, 700, 1024, 1440]) {
      ResizeObserverMock.width = width;
      const { container } = render(
        <DataTable columns={columns} rows={rows} rowKey={r => r.id} actions={actions} />,
      );
      const scrollContainers = container.querySelectorAll(
        '.overflow-x-auto, [style*="overflow-x"]',
      );
      expect(scrollContainers.length).toBe(0);
    }
  });

  it('keeps at least one focusable control per row', () => {
    ResizeObserverMock.width = 380;
    render(<DataTable columns={columns} rows={rows} rowKey={r => r.id} actions={actions} />);
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThanOrEqual(rows.length);
    expect(screen.getAllByLabelText('More actions')).toHaveLength(rows.length);
  });

  it('opens the overflow menu and runs an action from it', () => {
    ResizeObserverMock.width = 380;
    const onDelete = jest.fn();
    const del = { key: 'delete', label: 'Delete', danger: true, onClick: onDelete };
    render(<DataTable columns={columns} rows={[rows[0]]} rowKey={r => r.id} actions={[del]} />);
    fireEvent.click(screen.getByLabelText('More actions'));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Delete' }));
    expect(onDelete).toHaveBeenCalledWith(rows[0]);
  });

  it('expands collapsed/hidden columns via the +N indicator', () => {
    ResizeObserverMock.width = 900;
    render(<DataTable columns={columns} rows={[rows[0]]} rowKey={r => r.id} actions={actions} />);
    fireEvent.click(screen.getByLabelText('Show 1 more details'));
    expect(screen.getByText('Notes')).toBeTruthy();
    expect(screen.getByText('monthly plan')).toBeTruthy();
  });

  it('responsive stack mode keeps data on-screen, labels included', () => {
    ResizeObserverMock.width = 320;
    render(<DataTable columns={columns} rows={[rows[0]]} rowKey={r => r.id} actions={actions} />);
    // all non-P3 columns are shown via wrapped lines (never a fixed 2-column cap)
    for (const label of ['Merchant', 'Amount', 'Category', 'Date', 'Status']) {
      expect(screen.getAllByText(label).length).toBeGreaterThanOrEqual(1);
    }
    expect(screen.getByText('120.00')).toBeTruthy();
  });
});

describe('DataTable virtualization', () => {
  const proto = HTMLElement.prototype;
  let origOffsetHeight: PropertyDescriptor | undefined;
  let origOffsetWidth: PropertyDescriptor | undefined;

  beforeAll(() => {
    (globalThis as unknown as { ResizeObserver: typeof ResizeObserver }).ResizeObserver =
      ResizeObserverMock as unknown as typeof ResizeObserver;
    // jsdom has no layout engine: give elements a viewport so the virtualizer's
    // range resolves to > 0 visible rows and rows measure to a real height.
    origOffsetHeight = Object.getOwnPropertyDescriptor(proto, 'offsetHeight');
    origOffsetWidth = Object.getOwnPropertyDescriptor(proto, 'offsetWidth');
    Object.defineProperty(proto, 'offsetHeight', { configurable: true, get: () => 560 });
    Object.defineProperty(proto, 'offsetWidth', { configurable: true, get: () => 700 });
  });

  afterAll(() => {
    if (origOffsetHeight) Object.defineProperty(proto, 'offsetHeight', origOffsetHeight);
    if (origOffsetWidth) Object.defineProperty(proto, 'offsetWidth', origOffsetWidth);
  });

  afterEach(() => {
    ResizeObserverMock.width = 700;
    ResizeObserverMock.instances.clear();
  });

  it('caps the height, scrolls in place, and reports the true row count', () => {
    const many = Array.from({ length: 200 }, (_, i) => ({
      id: String(i),
      merchant: `Merchant ${i}`,
      amount: `${i}.00`,
      category: 'SaaS',
      date: '2026-09-01',
      status: 'OPEN',
      notes: 'row',
    }));
    const { container } = render(
      <DataTable virtualized columns={columns} rows={many} rowKey={r => r.id} actions={actions} />,
    );
    const table = container.querySelector('table');
    expect(table?.getAttribute('aria-rowcount')).toBe('200');
    const wrapper = container.firstElementChild as HTMLElement;
    expect(wrapper.className).toContain('overflow-auto');
    expect(wrapper.style.maxHeight).toBe('560px');
    const bodyRows = container.querySelectorAll('tbody tr');
    expect(bodyRows.length).toBeGreaterThan(0);
    expect(bodyRows.length).toBeLessThan(200);
  });

  it('keeps the virtualized flag off by default (no scroll cap)', () => {
    const { container } = render(
      <DataTable columns={columns} rows={rows} rowKey={r => r.id} actions={actions} />,
    );
    const wrapper = container.firstElementChild as HTMLElement;
    expect(wrapper.className).toContain('overflow-hidden');
    expect(wrapper.style.maxHeight).toBe('');
  });
});