/**
 * How a slicer writes its "; key SEP value" comment lines.
 * - spaced: the separator is surrounded by single spaces ("; layer_height = 0.2")
 * - unspaced: the first separator character splits the line (";TIME:669")
 */
export interface GcodeSettingsOptions {
  separators: string;
  spaced: boolean;
}

export const SPACED_EQUALS: GcodeSettingsOptions = {
  separators: '=',
  spaced: true,
};
export const SPACED_EQUALS_OR_COLON: GcodeSettingsOptions = {
  separators: '=:',
  spaced: true,
};
export const UNSPACED_COLON: GcodeSettingsOptions = {
  separators: ':',
  spaced: false,
};

/** Header keys that name the printer, in priority order. */
const PRINTER_NAME_KEYS = [
  'printer_model',
  'printer_settings_id',
  'TARGET_MACHINE.NAME',
] as const;

/**
 * The same keys as whole header lines, in either separator style, for a file whose parser
 * indexes the other style: the Creality Print parser reads ";key:value", so a spaced
 * "; printer_model = X" line never reaches its index.
 */
const PRINTER_NAME_LINES: readonly RegExp[] = PRINTER_NAME_KEYS.map(
  (key) =>
    // [ \t]*, not \s*: \s spans a newline and would take the next line as an empty key's value.
    new RegExp(
      `^[ \\t]*;[ \\t]*${key.replace('.', '\\.')}[ \\t]*[=:][ \\t]*(.*?)[ \\t]*$`,
      'im'
    )
);

/** `"Original Prusa MK4S"` -> `Original Prusa MK4S`; one surrounding pair only. */
function unquote(value: string): string {
  const trimmed = value.trim();
  return trimmed.length >= 2 && trimmed.startsWith('"') && trimmed.endsWith('"')
    ? trimmed.slice(1, -1).trim()
    : trimmed;
}

/** Unquoted, without empties or repeats, in their original order. */
function distinctNames(values: string[]): string[] {
  return [...new Set(values.map(unquote).filter((v) => v !== ''))];
}

/**
 * A single-pass index of the "; key = value" comment lines in a gcode file, so
 * each setting lookup is a map hit instead of a regex over the whole file.
 * Keys are case-insensitive; when a key repeats, the first non-empty value wins
 * (matching the old first-match regexes).
 */
export class GcodeSettings {
  private constructor(private readonly values: Map<string, string>) {}

  /**
   * The names a file gives for the printer it was sliced for, as candidates to try in order
   * (spec section 8.1): Orca and Prusa families' `printer_model`, then their
   * `printer_settings_id` (the profile name), then Cura's `TARGET_MACHINE.NAME`. All are kept
   * because PrusaSlicer's `printer_model` is a vendor code ("COREONE") the catalog can't match,
   * while its profile name ("Prusa CORE One HF0.4 nozzle") can. Empty and repeated names are
   * dropped; empty when the file names no printer.
   * When the index holds none of them and the raw gcode is given, the header lines are read
   * directly, in the same order.
   */
  static detectedPrinterNames(
    settings: GcodeSettings,
    gcode?: string
  ): string[] {
    const indexed = distinctNames(
      PRINTER_NAME_KEYS.map((key) => settings.get(key))
    );
    if (indexed.length > 0 || !gcode) {
      return indexed;
    }
    return distinctNames(
      PRINTER_NAME_LINES.map((line) => gcode.match(line)?.[1] ?? '')
    );
  }

  static empty(): GcodeSettings {
    return new GcodeSettings(new Map());
  }

  static parse(gcode: string, options: GcodeSettingsOptions): GcodeSettings {
    const values = new Map<string, string>();

    for (const rawLine of gcode.split('\n')) {
      const line = rawLine.trim();
      if (!line.startsWith(';')) {
        continue;
      }

      const body = line.slice(1);
      const split = options.spaced
        ? GcodeSettings.splitSpaced(body, options.separators)
        : GcodeSettings.splitUnspaced(body, options.separators);
      if (!split) {
        continue;
      }

      const [key, value] = split;
      if (key === '' || value === '') {
        continue;
      }

      const normalizedKey = key.toLowerCase();
      if (!values.has(normalizedKey)) {
        values.set(normalizedKey, value);
      }
    }

    return new GcodeSettings(values);
  }

  /** "key SEP value" where SEP has a single space on both sides. */
  private static splitSpaced(
    body: string,
    separators: string
  ): [string, string] | null {
    for (let i = 1; i < body.length - 1; i++) {
      if (
        separators.includes(body[i]) &&
        body[i - 1] === ' ' &&
        body[i + 1] === ' '
      ) {
        return [body.slice(0, i - 1).trim(), body.slice(i + 2).trim()];
      }
    }
    return null;
  }

  /** "keySEPvalue" on the first separator character. */
  private static splitUnspaced(
    body: string,
    separators: string
  ): [string, string] | null {
    for (let i = 0; i < body.length; i++) {
      if (separators.includes(body[i])) {
        return [body.slice(0, i).trim(), body.slice(i + 1).trim()];
      }
    }
    return null;
  }

  get(key: string): string {
    return this.values.get(key.toLowerCase()) ?? '';
  }

  has(key: string): boolean {
    return this.values.has(key.toLowerCase());
  }

  getNumber(key: string): number | undefined {
    const value = this.get(key);
    if (value === '') {
      return undefined;
    }
    const n = +value;
    return Number.isFinite(n) ? n : undefined;
  }

  /** "4.53, x, 2.5" -> [4.53, 0, 2.5]. Malformed entries never throw. */
  getNumberList(key: string): number[] {
    const value = this.get(key);
    if (value === '') {
      return [];
    }
    return value.split(',').map((entry) => {
      const n = +entry.trim();
      return Number.isFinite(n) ? n : 0;
    });
  }

  /** Per-slot string lists are ';' or ',' separated; PrusaSlicer 3 quotes unset entries. */
  getStringList(key: string): string[] {
    const value = this.get(key);
    if (value === '') {
      return [];
    }
    return value
      .split(/[;,]/)
      .map((entry) => entry.trim().replace(/^"|"$/g, ''));
  }

  getBoolean(key: string): boolean {
    const value = this.get(key).toLowerCase();
    return value === '1' || value === 'true';
  }
}
