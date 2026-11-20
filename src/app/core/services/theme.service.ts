import {
  DestroyRef,
  inject,
  Injectable,
  PLATFORM_ID,
  signal,
} from '@angular/core';
import { DOCUMENT, isPlatformBrowser } from '@angular/common';

export type ThemeMode = 'light' | 'system' | 'dark';

// The app toolbar's color in each theme. index.html and index.prod.html set
// the same values before first paint; keep them in sync.
const THEME_COLOR_LIGHT = '#3F50B5';
const THEME_COLOR_DARK = '#283593';

@Injectable({
  providedIn: 'root',
})
export class ThemeService {
  private readonly STORAGE_KEY = 'theme-mode';
  private readonly VALID_MODES: readonly ThemeMode[] = [
    'light',
    'system',
    'dark',
  ];
  private readonly document = inject(DOCUMENT);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly destroyRef = inject(DestroyRef);
  private initialized = false;

  private get mediaQuery(): MediaQueryList | null {
    return this.isBrowser
      ? window.matchMedia('(prefers-color-scheme: dark)')
      : null;
  }

  readonly mode = signal<ThemeMode>(this.loadSavedMode());
  readonly isDark = signal<boolean>(false);

  private loadSavedMode(): ThemeMode {
    if (!this.isBrowser) return 'system';
    return this.parseMode(localStorage.getItem(this.STORAGE_KEY));
  }

  private parseMode(value: string | null): ThemeMode {
    return this.VALID_MODES.includes(value as ThemeMode)
      ? (value as ThemeMode)
      : 'system';
  }

  initialize(): void {
    if (this.initialized || !this.isBrowser) return;
    this.initialized = true;
    this.applyTheme(this.mode());
    this.mediaQuery!.addEventListener('change', () => {
      if (this.mode() === 'system') {
        this.applyTheme('system');
      }
    });

    // Another tab changed the theme: follow it, without writing it back.
    const onStorage = (event: StorageEvent) => {
      if (event.key !== this.STORAGE_KEY) return;
      const mode = this.parseMode(event.newValue);
      this.mode.set(mode);
      this.applyTheme(mode);
    };
    window.addEventListener('storage', onStorage);
    this.destroyRef.onDestroy(() =>
      window.removeEventListener('storage', onStorage)
    );
  }

  setMode(mode: ThemeMode): void {
    this.mode.set(mode);
    if (this.isBrowser) {
      localStorage.setItem(this.STORAGE_KEY, mode);
    }
    this.applyTheme(mode);
  }

  private applyTheme(mode: ThemeMode): void {
    const isDark =
      mode === 'dark' ||
      (mode === 'system' && !!this.mediaQuery && this.mediaQuery.matches);
    this.isDark.set(isDark);
    this.document.documentElement.classList.toggle('dark-theme', isDark);
    // Both mirror the pre-paint script in index.html, which sets them before
    // the app loads; these keep them right after a theme change.
    //  - color-scheme: the browser's own surfaces (the canvas before the
    //    stylesheet arrives, scrollbars, form controls). The CSS keys off
    //    `.dark-theme`; this is the hint for what the CSS doesn't declare.
    //  - theme-color: the browser/OS toolbar, matched to the app toolbar.
    this.setMeta('color-scheme', mode === 'system' ? 'light dark' : mode);
    this.setMeta('theme-color', isDark ? THEME_COLOR_DARK : THEME_COLOR_LIGHT);
  }

  private setMeta(name: string, content: string): void {
    let meta = this.document.head.querySelector<HTMLMetaElement>(
      `meta[name="${name}"]`
    );
    if (!meta) {
      meta = this.document.createElement('meta');
      meta.name = name;
      this.document.head.appendChild(meta);
    }
    meta.content = content;
  }
}
