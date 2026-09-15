import { GCODE_WINDOW_SIZE, trimGcodeWindow } from './gcode-window';

describe('trimGcodeWindow', () => {
  it('returns small input unchanged', () => {
    const gcode = '; a = 1\nG1 X1\n; b = 2';
    expect(trimGcodeWindow(gcode)).toBe(gcode);
  });

  it('returns input at exactly two windows unchanged', () => {
    const gcode = 'x'.repeat(GCODE_WINDOW_SIZE * 2);
    expect(trimGcodeWindow(gcode)).toBe(gcode);
  });

  it('keeps the head and tail, in order, joined by a newline', () => {
    const head = 'H'.repeat(GCODE_WINDOW_SIZE);
    const middle = 'M'.repeat(10);
    const tail = 'T'.repeat(GCODE_WINDOW_SIZE);
    const result = trimGcodeWindow(head + middle + tail);
    expect(result.length).toBe(GCODE_WINDOW_SIZE * 2 + 1);
    expect(result.startsWith(head)).toBeTrue();
    expect(result.endsWith(tail)).toBeTrue();
    expect(result[GCODE_WINDOW_SIZE]).toBe('\n');
    expect(result).not.toContain('M');
  });
});
