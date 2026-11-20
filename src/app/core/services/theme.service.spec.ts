import type { Mock } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { DOCUMENT } from '@angular/common';
import { ThemeService, ThemeMode } from './theme.service';

describe('ThemeService', () => {
  let service: ThemeService;
  let mockDocument: Document;
  let mockMediaQuery: {
    matches: boolean;
    addEventListener: Mock;
  };

  function buildService(
    savedMode: string | null = null,
    osPrefersDark = false
  ) {
    localStorage.clear();
    if (savedMode) localStorage.setItem('theme-mode', savedMode);

    mockMediaQuery = {
      matches: osPrefersDark,
      addEventListener: vi.fn(),
    };
    vi.spyOn(window, 'matchMedia').mockReturnValue(mockMediaQuery as any);

    mockDocument = document;
    mockDocument.documentElement.className = '';

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [ThemeService, { provide: DOCUMENT, useValue: mockDocument }],
    });
    service = TestBed.inject(ThemeService);
  }

  // These specs toggle the real <html> class, and every spec file runs against
  // the same document: a run that ends in dark mode leaves `dark-theme` set for
  // whichever spec happens to come next under random ordering. That is not
  // hypothetical — it silently hid the light variant in the doc-figure layout
  // specs, which measure a screenshot the theme decides to lay out.
  afterEach(() => {
    document.documentElement.classList.remove('dark-theme');
    document.querySelector('meta[name="color-scheme"]')?.remove();
    document.querySelector('meta[name="theme-color"]')?.remove();
  });

  function metaContent(name: string): string | null | undefined {
    return document
      .querySelector(`meta[name="${name}"]`)
      ?.getAttribute('content');
  }

  function colorSchemeMeta(): string | null | undefined {
    return metaContent('color-scheme');
  }

  it('defaults to system mode when localStorage is empty', () => {
    buildService(null);
    expect(service.mode()).toBe('system');
  });

  it('loads saved mode from localStorage', () => {
    buildService('dark');
    expect(service.mode()).toBe('dark');
  });

  it('defaults to system when localStorage contains an invalid value', () => {
    buildService('invalid-value');
    expect(service.mode()).toBe('system');
  });

  it('setMode(dark) adds dark-theme class to body', () => {
    buildService();
    service.setMode('dark');
    expect(mockDocument.documentElement.classList.contains('dark-theme')).toBe(
      true
    );
  });

  it('setMode(dark) writes to localStorage', () => {
    buildService();
    service.setMode('dark');
    expect(localStorage.getItem('theme-mode')).toBe('dark');
  });

  it('setMode(light) removes dark-theme class from body', () => {
    buildService('dark');
    mockDocument.documentElement.classList.add('dark-theme');
    service.setMode('light');
    expect(mockDocument.documentElement.classList.contains('dark-theme')).toBe(
      false
    );
  });

  it('setMode(system) adds dark-theme when OS prefers dark', () => {
    buildService(null, true /* osPrefersDark */);
    service.setMode('system');
    expect(mockDocument.documentElement.classList.contains('dark-theme')).toBe(
      true
    );
  });

  it('setMode(system) removes dark-theme when OS prefers light', () => {
    buildService(null, false /* osPrefersDark */);
    mockDocument.documentElement.classList.add('dark-theme');
    service.setMode('system');
    expect(mockDocument.documentElement.classList.contains('dark-theme')).toBe(
      false
    );
  });

  it('initialize() registers media query change listener', () => {
    buildService();
    service.initialize();
    expect(mockMediaQuery.addEventListener).toHaveBeenCalledWith(
      'change',
      expect.any(Function)
    );
  });

  it('initialize() called twice only registers one listener', () => {
    buildService();
    service.initialize();
    service.initialize();
    expect(mockMediaQuery.addEventListener).toHaveBeenCalledTimes(1);
  });

  it('media query change re-applies theme only when mode is system', () => {
    buildService('dark', false);
    service.initialize();
    const [, listener] = vi.mocked(mockMediaQuery.addEventListener).mock
      .calls[0];

    // OS switches to dark — should NOT change class since mode is 'dark', not 'system'
    mockDocument.documentElement.classList.remove('dark-theme');
    mockMediaQuery.matches = true;
    listener();
    expect(mockDocument.documentElement.classList.contains('dark-theme')).toBe(
      false
    );
  });

  it('media query change applies dark-theme when mode is system and OS switches to dark', () => {
    buildService('system', false);
    service.initialize();
    const [, listener] = vi.mocked(mockMediaQuery.addEventListener).mock
      .calls[0];

    mockMediaQuery.matches = true;
    listener();
    expect(mockDocument.documentElement.classList.contains('dark-theme')).toBe(
      true
    );
  });

  describe('color-scheme meta', () => {
    it.each<[ThemeMode, string]>([
      ['light', 'light'],
      ['dark', 'dark'],
      ['system', 'light dark'],
    ])('setMode(%s) sets the meta to "%s"', (mode, expected) => {
      buildService();
      service.setMode(mode);
      expect(colorSchemeMeta()).toBe(expected);
    });

    it('updates the meta the pre-paint script left in the head', () => {
      const meta = document.createElement('meta');
      meta.name = 'color-scheme';
      meta.content = 'light dark';
      document.head.appendChild(meta);

      buildService('dark');
      service.initialize();

      expect(
        document.querySelectorAll('meta[name="color-scheme"]').length
      ).toBe(1);
      expect(meta.content).toBe('dark');
    });
  });

  // The browser chrome color. index.html sets it before first paint; after
  // that, a theme change must update it or the toolbar stays the old color.
  describe('theme-color meta', () => {
    it('setMode(dark) switches it to the dark toolbar color', () => {
      buildService('light');
      service.setMode('dark');
      expect(metaContent('theme-color')).toBe('#283593');
    });

    it('setMode(light) switches it back to the light toolbar color', () => {
      buildService('dark');
      service.setMode('dark');
      service.setMode('light');
      expect(metaContent('theme-color')).toBe('#3F50B5');
    });

    it('follows the OS in system mode', () => {
      buildService('system', false);
      service.initialize();
      expect(metaContent('theme-color')).toBe('#3F50B5');

      const [, listener] = vi.mocked(mockMediaQuery.addEventListener).mock
        .calls[0];
      mockMediaQuery.matches = true;
      listener();
      expect(metaContent('theme-color')).toBe('#283593');
    });

    it('updates the meta index.html already has', () => {
      const meta = document.createElement('meta');
      meta.name = 'theme-color';
      meta.content = '#3F50B5';
      document.head.appendChild(meta);

      buildService('light');
      service.setMode('dark');

      expect(document.querySelectorAll('meta[name="theme-color"]').length).toBe(
        1
      );
      expect(meta.content).toBe('#283593');
    });
  });

  describe('theme changed in another tab', () => {
    function storageEvent(newValue: string | null): StorageEvent {
      return new StorageEvent('storage', { key: 'theme-mode', newValue });
    }

    it('follows the new mode', () => {
      buildService('light');
      service.initialize();

      window.dispatchEvent(storageEvent('dark'));

      expect(service.mode()).toBe('dark');
      expect(
        mockDocument.documentElement.classList.contains('dark-theme')
      ).toBe(true);
      expect(colorSchemeMeta()).toBe('dark');
    });

    it('falls back to system when the key is removed or invalid', () => {
      buildService('dark');
      service.initialize();

      window.dispatchEvent(storageEvent(null));
      expect(service.mode()).toBe('system');

      service.setMode('dark');
      window.dispatchEvent(storageEvent('sepia'));
      expect(service.mode()).toBe('system');
    });

    it('ignores other keys', () => {
      buildService('light');
      service.initialize();

      window.dispatchEvent(
        new StorageEvent('storage', { key: 'other', newValue: 'dark' })
      );

      expect(service.mode()).toBe('light');
    });

    it('stops listening once the service is destroyed', () => {
      buildService('light');
      service.initialize();
      const destroyed = service;

      TestBed.resetTestingModule();
      window.dispatchEvent(storageEvent('dark'));

      expect(destroyed.mode()).toBe('light');
    });
  });
});
