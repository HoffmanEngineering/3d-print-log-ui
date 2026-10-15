import type { ColumnDefinition } from 'src/app/print/print-list/print-list.component';

/** Where the materials table remembers the columns this browser chose. */
export const FILAMENT_TABLE_COLUMNS_KEY = 'filament_table_displayed_columns';

/**
 * Every column the user can show, hide or reorder, in the table's default
 * order. `select` (the checkbox) and `more` (the row menu, which also holds the
 * layout button) are not here: they are pinned to the ends by
 * `toFilamentTableRow`, so no saved layout can lose the way back into the
 * dialog.
 */
export const FILAMENT_TABLE_COLUMNS: readonly ColumnDefinition[] = [
  {
    key: 'isFavorite',
    displayName: 'Favorite',
    description: 'A star you can click to add or remove a favorite.',
  },
  {
    key: 'image',
    displayName: 'Photo',
    description: "A thumbnail of the material's default photo.",
  },
  {
    key: 'colorHex',
    displayName: 'Color Swatch',
    description: 'A swatch of the material colors, pattern and finish.',
  },
  {
    key: 'displayName',
    displayName: 'Name',
    description: 'The name of the material.',
  },
  {
    key: 'brand',
    displayName: 'Brand',
    description: 'The brand or manufacturer.',
  },
  {
    key: 'colorName',
    displayName: 'Color',
    description: 'The name of the color.',
  },
  {
    key: 'materialType',
    displayName: 'Material',
    description: 'The material type, such as PLA or PETG.',
  },
  {
    key: 'storageLocation',
    displayName: 'Storage Location',
    description: 'Where the material is stored.',
  },
  {
    key: 'loadedInPrinter',
    displayName: 'Loaded In Printer',
    description: 'The printer the material is loaded in, if any.',
  },
  {
    key: 'filamentRemaining',
    displayName: 'Remaining (g)',
    description: 'How much material is left.',
  },
  {
    key: 'isActive',
    displayName: 'Inactive Tag',
    description: 'An "Inactive" tag on empty or inactive materials.',
  },
];

/**
 * Exactly the columns the table showed before it was customizable, so nothing
 * changes for anyone who never opens the layout dialog.
 */
export const DEFAULT_FILAMENT_TABLE_COLUMNS: readonly string[] =
  FILAMENT_TABLE_COLUMNS.map((column) => column.key);

const CHOOSABLE = new Set(DEFAULT_FILAMENT_TABLE_COLUMNS);

/** The row the table renders: the checkbox first and the menu last. */
export function toFilamentTableRow(columns: readonly string[]): string[] {
  return ['select', ...columns, 'more'];
}

/**
 * Turns whatever came out of storage (or the dialog) into a list the table can
 * render. Unknown keys - a column renamed or removed since it was saved - are
 * dropped, as are duplicates and the pinned columns. Anything that is not a
 * list of strings, or leaves no column to read, falls back to the defaults.
 */
export function sanitizeFilamentTableColumns(value: unknown): string[] {
  if (
    !Array.isArray(value) ||
    !value.every((entry) => typeof entry === 'string')
  ) {
    return [...DEFAULT_FILAMENT_TABLE_COLUMNS];
  }

  const columns = Array.from(
    new Set(value.filter((key: string) => CHOOSABLE.has(key)))
  );

  return columns.length > 0 ? columns : [...DEFAULT_FILAMENT_TABLE_COLUMNS];
}

/**
 * Reads the saved layout. `storage` is null on the server, and the read throws
 * when site data is blocked; both fall back to the defaults.
 */
export function readFilamentTableColumns(storage: Storage | null): string[] {
  try {
    const saved = storage?.getItem(FILAMENT_TABLE_COLUMNS_KEY);
    return sanitizeFilamentTableColumns(saved ? JSON.parse(saved) : null);
  } catch {
    return [...DEFAULT_FILAMENT_TABLE_COLUMNS];
  }
}

/**
 * Saves the layout. A browser that refuses the write keeps the layout for this
 * visit only, which is not worth an error.
 */
export function writeFilamentTableColumns(
  storage: Storage | null,
  columns: readonly string[]
): void {
  try {
    storage?.setItem(FILAMENT_TABLE_COLUMNS_KEY, JSON.stringify(columns));
  } catch {
    // Storage is blocked or full; the in-memory layout still applies.
  }
}
