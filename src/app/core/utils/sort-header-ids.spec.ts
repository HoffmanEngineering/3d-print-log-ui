import { toSortHeaderIds } from './sort-header-ids';

enum TestSortColumns {
  DisplayName = 1,
  MaterialType = 2,
}

describe('toSortHeaderIds', () => {
  it('should map each member name to its numeric value as a string', () => {
    expect(toSortHeaderIds(TestSortColumns)).toEqual({
      DisplayName: '1',
      MaterialType: '2',
    });
  });

  it('should drop the reverse-mapping entries a numeric enum adds', () => {
    const ids = toSortHeaderIds(TestSortColumns);

    expect(Object.keys(ids)).toEqual(['DisplayName', 'MaterialType']);
  });

  it('should round-trip back to the enum value the API expects', () => {
    const ids = toSortHeaderIds(TestSortColumns);

    expect(+ids.MaterialType).toBe(TestSortColumns.MaterialType);
  });
});
