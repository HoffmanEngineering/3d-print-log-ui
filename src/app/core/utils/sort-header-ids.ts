/**
 * Sort columns are numeric enums because the API expects the number, but
 * `matSortHeader` types its id as a `string` and the DOM stringifies the value
 * regardless. Exposing this map to a template keeps the binding type-correct
 * while `sortData`'s `+sort.active` still recovers the original enum value.
 */
export function toSortHeaderIds<T extends object>(
  sortEnum: T
): Record<keyof T, string> {
  const ids = {} as Record<keyof T, string>;

  for (const key of Object.keys(sortEnum) as (keyof T & string)[]) {
    const value = sortEnum[key];

    // A numeric enum also holds reverse mappings (1 -> 'DisplayName'); those
    // have string values and are not sort columns.
    if (typeof value === 'number') {
      ids[key] = String(value);
    }
  }

  return ids;
}
