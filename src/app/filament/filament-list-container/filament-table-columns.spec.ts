import {
  DEFAULT_FILAMENT_TABLE_COLUMNS,
  FILAMENT_TABLE_COLUMNS,
  FILAMENT_TABLE_COLUMNS_KEY,
  readFilamentTableColumns,
  sanitizeFilamentTableColumns,
  toFilamentTableRow,
  writeFilamentTableColumns,
} from './filament-table-columns';

/** An in-memory Storage, so no spec touches the browser's real localStorage. */
const memoryStorage = (initial: Record<string, string> = {}): Storage => {
  const items = new Map(Object.entries(initial));
  return {
    get length() {
      return items.size;
    },
    clear: () => items.clear(),
    getItem: (key: string) => items.get(key) ?? null,
    key: (index: number) => Array.from(items.keys())[index] ?? null,
    removeItem: (key: string) => void items.delete(key),
    setItem: (key: string, value: string) => void items.set(key, value),
  };
};

/** A Storage whose every call throws, the way a blocked-cookies browser does. */
const blockedStorage = (): Storage =>
  ({
    getItem: () => {
      throw new DOMException('denied', 'SecurityError');
    },
    setItem: () => {
      throw new DOMException('denied', 'SecurityError');
    },
  }) as unknown as Storage;

describe('filament table columns', () => {
  it('defaults to exactly the columns the table showed before it was customizable', () => {
    // Anyone who never opens the dialog must see the table they always had.
    expect([...DEFAULT_FILAMENT_TABLE_COLUMNS]).toEqual([
      'isFavorite',
      'image',
      'colorHex',
      'displayName',
      'brand',
      'colorName',
      'materialType',
      'storageLocation',
      'loadedInPrinter',
      'filamentRemaining',
      'isActive',
    ]);
  });

  it('offers every default column in the chooser, each with a name', () => {
    const keys = FILAMENT_TABLE_COLUMNS.map((column) => column.key);
    for (const key of DEFAULT_FILAMENT_TABLE_COLUMNS) {
      expect(keys).toContain(key);
    }
    for (const column of FILAMENT_TABLE_COLUMNS) {
      expect(column.displayName.trim()).not.toBe('');
      expect(column.description.trim()).not.toBe('');
    }
  });

  it('never offers the fixed select and more columns', () => {
    const keys = FILAMENT_TABLE_COLUMNS.map((column) => column.key);
    expect(keys).not.toContain('select');
    expect(keys).not.toContain('more');
  });

  describe('toFilamentTableRow', () => {
    it('pins the checkbox first and the menu last', () => {
      expect(toFilamentTableRow(['brand', 'displayName'])).toEqual([
        'select',
        'brand',
        'displayName',
        'more',
      ]);
    });
  });

  describe('sanitizeFilamentTableColumns', () => {
    it('keeps a valid choice in the order given', () => {
      expect(
        sanitizeFilamentTableColumns(['filamentRemaining', 'displayName'])
      ).toEqual(['filamentRemaining', 'displayName']);
    });

    it('drops unknown, fixed and duplicate keys', () => {
      expect(
        sanitizeFilamentTableColumns([
          'select',
          'displayName',
          'retired-column',
          'displayName',
          'more',
          'brand',
        ])
      ).toEqual(['displayName', 'brand']);
    });

    it('falls back to the defaults for anything that is not a string list', () => {
      for (const value of [
        null,
        undefined,
        'brand',
        42,
        {},
        [1, 2],
        ['a', 3],
      ]) {
        expect(sanitizeFilamentTableColumns(value))
          .withContext(JSON.stringify(value))
          .toEqual([...DEFAULT_FILAMENT_TABLE_COLUMNS]);
      }
    });

    it('falls back to the defaults when nothing displayable is left', () => {
      // A table of only checkboxes and menus cannot be read; the defaults can.
      expect(sanitizeFilamentTableColumns([])).toEqual([
        ...DEFAULT_FILAMENT_TABLE_COLUMNS,
      ]);
      expect(sanitizeFilamentTableColumns(['select', 'gone'])).toEqual([
        ...DEFAULT_FILAMENT_TABLE_COLUMNS,
      ]);
    });

    it('returns a fresh array, so callers cannot mutate the defaults', () => {
      const result = sanitizeFilamentTableColumns(null);
      result.pop();
      expect(DEFAULT_FILAMENT_TABLE_COLUMNS.length).toBe(11);
    });
  });

  describe('readFilamentTableColumns', () => {
    it('returns the defaults when nothing is saved', () => {
      expect(readFilamentTableColumns(memoryStorage())).toEqual([
        ...DEFAULT_FILAMENT_TABLE_COLUMNS,
      ]);
    });

    it('returns a saved choice', () => {
      const storage = memoryStorage({
        [FILAMENT_TABLE_COLUMNS_KEY]: JSON.stringify(['brand', 'colorName']),
      });
      expect(readFilamentTableColumns(storage)).toEqual(['brand', 'colorName']);
    });

    it('returns the defaults for corrupt JSON', () => {
      const storage = memoryStorage({ [FILAMENT_TABLE_COLUMNS_KEY]: '[brand' });
      expect(readFilamentTableColumns(storage)).toEqual([
        ...DEFAULT_FILAMENT_TABLE_COLUMNS,
      ]);
    });

    it('returns the defaults when storage throws or is unavailable', () => {
      expect(readFilamentTableColumns(blockedStorage())).toEqual([
        ...DEFAULT_FILAMENT_TABLE_COLUMNS,
      ]);
      expect(readFilamentTableColumns(null)).toEqual([
        ...DEFAULT_FILAMENT_TABLE_COLUMNS,
      ]);
    });
  });

  describe('writeFilamentTableColumns', () => {
    it('round-trips through read', () => {
      const storage = memoryStorage();
      writeFilamentTableColumns(storage, ['colorName', 'brand']);
      expect(readFilamentTableColumns(storage)).toEqual(['colorName', 'brand']);
    });

    it('does not throw when storage throws or is unavailable', () => {
      expect(() =>
        writeFilamentTableColumns(blockedStorage(), ['brand'])
      ).not.toThrow();
      expect(() => writeFilamentTableColumns(null, ['brand'])).not.toThrow();
    });
  });
});
