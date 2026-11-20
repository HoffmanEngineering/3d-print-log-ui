import {
  DestroyRef,
  inject,
  Injectable,
  PLATFORM_ID,
  signal,
} from '@angular/core';
import { DOCUMENT, isPlatformBrowser } from '@angular/common';

export type ThemeMode = 'light' | 'system' | 'dark';

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
    this.setColorSchemeMeta(mode === 'system' ? 'light dark' : mode);
  }

  /**
   * Keeps `<meta name="color-scheme">` in step with the mode, as the pre-paint
   * script in index.html does, so the browser's own surfaces (the canvas before
   * the stylesheet arrives, scrollbars, form controls) match the theme. The CSS
   * keys off `.dark-theme`; this is the hint for what the CSS doesn't declare.
   */
  private setColorSchemeMeta(content: string): void {
    let meta = this.document.head.querySelector<HTMLMetaElement>(
      'meta[name="color-scheme"]'
    );
    if (!meta) {
      meta = this.document.createElement('meta');
      meta.name = 'color-scheme';
      this.document.head.appendChild(meta);
    }
    meta.content = content;
  }
}
