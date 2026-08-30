import {
  isApplePlatform,
  isSearchShortcut,
  shortcutLabel,
} from './keyboard-shortcut';

describe('docs search keyboard shortcut', () => {
  const chord = (over: Partial<KeyboardEvent> = {}) => ({
    key: 'k',
    metaKey: false,
    ctrlKey: true,
    shiftKey: false,
    altKey: false,
    ...over,
  });

  describe('isApplePlatform', () => {
    it('recognizes the platforms that expect Cmd', () => {
      for (const platform of ['MacIntel', 'iPhone', 'iPad', 'iPod touch']) {
        expect(isApplePlatform(platform)).withContext(platform).toBe(true);
      }
    });

    it('treats everything else as a Ctrl platform', () => {
      for (const platform of ['Win32', 'Linux x86_64', '']) {
        expect(isApplePlatform(platform)).withContext(platform).toBe(false);
      }
    });

    it('handles an absent platform string', () => {
      // navigator.platform is deprecated and may be missing entirely.
      expect(isApplePlatform(undefined)).toBe(false);
    });
  });

  describe('shortcutLabel', () => {
    it('uses the modifier the reader expects', () => {
      expect(shortcutLabel(true)).toBe('⌘K');
      expect(shortcutLabel(false)).toBe('Ctrl K');
    });
  });

  describe('isSearchShortcut', () => {
    it('accepts Ctrl+K and Cmd+K', () => {
      expect(isSearchShortcut(chord())).toBe(true);
      expect(isSearchShortcut(chord({ ctrlKey: false, metaKey: true }))).toBe(
        true
      );
    });

    it('accepts a capital K, as Caps Lock produces', () => {
      expect(isSearchShortcut(chord({ key: 'K' }))).toBe(true);
    });

    it('ignores K with no modifier, which is just typing', () => {
      expect(isSearchShortcut(chord({ ctrlKey: false }))).toBe(false);
    });

    it('leaves the browser its own Ctrl+Shift+K and Alt+K', () => {
      expect(isSearchShortcut(chord({ shiftKey: true }))).toBe(false);
      expect(isSearchShortcut(chord({ altKey: true }))).toBe(false);
    });

    it('does not bind slash', () => {
      // Readers type slashes into the search box and into the code samples on
      // the integration pages.
      expect(isSearchShortcut(chord({ key: '/', ctrlKey: false }))).toBe(false);
    });
  });
});
