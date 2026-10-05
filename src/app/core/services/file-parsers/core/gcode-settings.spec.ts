import {
  GcodeSettings,
  SPACED_EQUALS,
  SPACED_EQUALS_OR_COLON,
  UNSPACED_COLON,
} from './gcode-settings';

describe('GcodeSettings', () => {
  describe('spaced separators', () => {
    it('indexes "; key = value" lines', () => {
      const s = GcodeSettings.parse(
        '; layer_height = 0.2\nG1 X1\n; wall_loops = 3',
        SPACED_EQUALS
      );
      expect(s.get('layer_height')).toBe('0.2');
      expect(s.getNumber('wall_loops')).toBe(3);
    });

    it('ignores leading whitespace before the semicolon (indented fixtures)', () => {
      const s = GcodeSettings.parse('    ; layer_height = 0.2', SPACED_EQUALS);
      expect(s.get('layer_height')).toBe('0.2');
    });

    it('does not match an unspaced separator', () => {
      const s = GcodeSettings.parse(
        '; total estimated time: 1h 2m',
        SPACED_EQUALS_OR_COLON
      );
      expect(s.has('total estimated time')).toBeFalse();
    });

    it('accepts any separator in the set', () => {
      const s = GcodeSettings.parse('; a = 1\n; b : 2', SPACED_EQUALS_OR_COLON);
      expect(s.get('a')).toBe('1');
      expect(s.get('b')).toBe('2');
    });

    it('keeps the first non-empty value when a key repeats', () => {
      const s = GcodeSettings.parse(
        '; a = \n; a = first\n; a = second',
        SPACED_EQUALS
      );
      expect(s.get('a')).toBe('first');
    });

    it('is case-insensitive on keys and tolerates CRLF', () => {
      const s = GcodeSettings.parse(
        '; Layer_Height = 0.3\r\n; x = 1\r\n',
        SPACED_EQUALS
      );
      expect(s.get('layer_height')).toBe('0.3');
      expect(s.get('x')).toBe('1');
    });

    it('keeps keys that contain brackets and parentheses', () => {
      const s = GcodeSettings.parse(
        '; filament used [mm] = 12.5, 0, 3\n; estimated printing time (normal mode) = 1h',
        SPACED_EQUALS
      );
      expect(s.getNumberList('filament used [mm]')).toEqual([12.5, 0, 3]);
      expect(s.get('estimated printing time (normal mode)')).toBe('1h');
    });
  });

  describe('unspaced colon (Cura / Creality header lines)', () => {
    it('indexes ";KEY:value" and ";Key: value"', () => {
      const s = GcodeSettings.parse(
        ';FLAVOR:Marlin\n;TIME:627.134\n;Filament used: 0.83m',
        UNSPACED_COLON
      );
      expect(s.get('FLAVOR')).toBe('Marlin');
      expect(s.getNumber('time')).toBe(627.134);
      expect(s.get('Filament used')).toBe('0.83m');
    });

    it('skips comment lines with no separator', () => {
      const s = GcodeSettings.parse(
        ';Generated with Cura_SteamEngine 4.9.0',
        UNSPACED_COLON
      );
      expect(s.has('Generated with Cura_SteamEngine 4.9.0')).toBeFalse();
    });
  });

  describe('accessors', () => {
    const s = GcodeSettings.parse(
      '; list = 4.53, x, 2.5\n; colors = #FF0000;#00FF00\n; quoted = "PLA","PETG"\n; on = 1\n; off = 0\n; yes = true',
      SPACED_EQUALS
    );

    it('get returns empty string and getNumber undefined for a missing key', () => {
      expect(s.get('missing')).toBe('');
      expect(s.getNumber('missing')).toBeUndefined();
      expect(s.getNumberList('missing')).toEqual([]);
      expect(s.getStringList('missing')).toEqual([]);
    });

    it('getNumberList turns non-numeric entries into 0', () => {
      expect(s.getNumberList('list')).toEqual([4.53, 0, 2.5]);
    });

    it('getStringList splits on ; or , and strips quotes', () => {
      expect(s.getStringList('colors')).toEqual(['#FF0000', '#00FF00']);
      expect(s.getStringList('quoted')).toEqual(['PLA', 'PETG']);
    });

    it('getBoolean accepts 1 and true', () => {
      expect(s.getBoolean('on')).toBeTrue();
      expect(s.getBoolean('yes')).toBeTrue();
      expect(s.getBoolean('off')).toBeFalse();
      expect(s.getBoolean('missing')).toBeFalse();
    });

    it('empty() has nothing', () => {
      expect(GcodeSettings.empty().has('a')).toBeFalse();
    });
  });
});
