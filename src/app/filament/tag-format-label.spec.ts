import { formatLabel } from './tag-format-label';

describe('formatLabel', () => {
  it('names the known formats in plain text', () => {
    expect(formatLabel('snapmaker')).toBe('Snapmaker tag');
    expect(formatLabel('anycubic-ace')).toBe('Anycubic ACE tag');
    expect(formatLabel('openspool')).toBe('OpenSpool tag');
    expect(formatLabel('bambu')).toBe('Bambu Lab tag');
  });

  it('falls back to Spool tag for anything else', () => {
    expect(formatLabel('creality')).toBe('Spool tag');
    expect(formatLabel('')).toBe('Spool tag');
    expect(formatLabel(null)).toBe('Spool tag');
    expect(formatLabel(undefined)).toBe('Spool tag');
  });
});
