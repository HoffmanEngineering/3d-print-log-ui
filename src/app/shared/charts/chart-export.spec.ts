import { escapeCsvCell, toCsv } from './chart-export';

describe('escapeCsvCell', () => {
  it('prefixes a formula so a spreadsheet cannot execute it', () => {
    // Print titles are user-controlled and land in a file someone else may open.
    expect(escapeCsvCell('=1+1')).toBe(`"'=1+1"`);
    expect(escapeCsvCell('+SUM(A1)')).toBe(`"'+SUM(A1)"`);
    expect(escapeCsvCell('-2+3')).toBe(`"'-2+3"`);
    expect(escapeCsvCell('@import')).toBe(`"'@import"`);
    expect(escapeCsvCell('\tstart')).toBe(`"'\tstart"`);
    expect(escapeCsvCell('\rstart')).toBe(`"'\rstart"`);
  });

  it('quotes and doubles embedded quotes', () => {
    expect(escapeCsvCell('say "hi"')).toBe('"say ""hi"""');
  });

  it('quotes cells containing a comma or a newline', () => {
    expect(escapeCsvCell('a,b')).toBe('"a,b"');
    expect(escapeCsvCell('a\nb')).toBe('"a\nb"');
  });

  it('formats numbers invariantly and never with a locale separator', () => {
    expect(escapeCsvCell(1234.5)).toBe('1234.5');
  });

  it('renders null and undefined as empty', () => {
    expect(escapeCsvCell(null)).toBe('');
    expect(escapeCsvCell(undefined)).toBe('');
  });

  it('does not treat a negative NUMBER as a formula', () => {
    expect(escapeCsvCell(-5)).toBe('-5');
  });
});

describe('toCsv', () => {
  it('emits a BOM, a header row and CRLF line endings', () => {
    const csv = toCsv(['a', 'b'], [[1, 'x']]);

    expect(csv.charCodeAt(0)).toBe(0xfeff);
    expect(csv).toContain('a,b\r\n');
    expect(csv).toContain('1,x');
  });

  it('truncates at the row cap and says so', () => {
    const rows = Array.from({ length: 10_050 }, (_, i) => [i]);

    const csv = toCsv(['n'], rows);

    expect(csv).toContain('# truncated at 10000 rows');
    expect(csv.split('\r\n').length).toBeLessThan(10_010);
  });
});
