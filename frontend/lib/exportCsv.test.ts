import { toCsv, isoStamp } from './exportCsv';

describe('toCsv', () => {
  const columns = [
    { header: 'Name', get: (r: any) => r.name },
    { header: 'Amount', get: (r: any) => r.amount },
    { header: 'Note', get: (r: any) => r.note },
  ];

  it('renders a header row and one line per row', () => {
    const csv = toCsv(
      [
        { name: 'A', amount: 5, note: 'x' },
        { name: 'B', amount: 6, note: 'y' },
      ],
      columns,
    );
    expect(csv).toBe('Name,Amount,Note\r\nA,5,x\r\nB,6,y');
  });

  it('escapes quotes, commas, and line breaks', () => {
    const csv = toCsv([{ name: 'ACME, Inc', amount: 5, note: 'say "hi"\nnext' }], columns);
    expect(csv).toContain('"ACME, Inc"');
    expect(csv).toContain('"say ""hi""\nnext"');
  });

  it('coerces null/undefined to empty cells', () => {
    const csv = toCsv([{ name: null, amount: undefined, note: 'z' }], columns);
    expect(csv).toContain(',,z');
  });
});

describe('isoStamp', () => {
  it('builds a YYYY-MM-DD stamp', () => {
    expect(isoStamp(new Date('2026-09-12T10:00:00Z'))).toBe('2026-09-12');
  });
});