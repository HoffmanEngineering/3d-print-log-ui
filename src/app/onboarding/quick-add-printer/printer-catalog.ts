export interface CatalogPrinter {
  make: string;
  model: string;
}

let catalogPromise: Promise<CatalogPrinter[]> | null = null;

/** Lazy-loads the bundled printer list (a separate chunk, about 60 KB) and caches it. */
export function loadPrinterCatalog(): Promise<CatalogPrinter[]> {
  catalogPromise ??= import(
    '../../printer/printer-detail/cura-exported-printers'
  ).then((m) => m.default.printers);
  return catalogPromise;
}

/** Case-insensitive match where every whitespace-separated token appears in "make model". */
export function searchCatalog(
  list: CatalogPrinter[],
  query: string,
  limit = 20
): CatalogPrinter[] {
  const tokens = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) {
    return [];
  }
  const matches: CatalogPrinter[] = [];
  for (const printer of list) {
    const haystack = `${printer.make} ${printer.model}`.toLowerCase();
    if (tokens.every((t) => haystack.includes(t))) {
      matches.push(printer);
      if (matches.length >= limit) {
        break;
      }
    }
  }
  return matches;
}
