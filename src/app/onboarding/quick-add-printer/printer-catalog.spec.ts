import { loadPrinterCatalog, searchCatalog } from './printer-catalog';

describe('printer catalog', () => {
  const list = [
    { make: 'Bambu Lab', model: 'X1 Carbon' },
    { make: 'Bambu Lab', model: 'A1' },
    { make: 'Prusa', model: 'MK4' },
  ];

  it('finds a printer when every token matches, in any case', () => {
    expect(searchCatalog(list, 'bambu x1')).toEqual([list[0]]);
    expect(searchCatalog(list, 'CARBON bambu')).toEqual([list[0]]);
  });

  it('returns nothing for a blank query', () => {
    expect(searchCatalog(list, '   ')).toEqual([]);
  });

  it('caps the results at the limit', () => {
    expect(searchCatalog(list, 'bambu', 1).length).toBe(1);
  });

  it('loads the bundled catalog once', async () => {
    const first = await loadPrinterCatalog();
    const second = await loadPrinterCatalog();

    expect(first.length).toBeGreaterThan(100);
    expect(second).toBe(first);
    expect(first.some((p) => p.make === 'Bambu Lab')).toBeTrue();
  });
});
