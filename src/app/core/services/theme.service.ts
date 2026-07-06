import { inject, Injectable, PLATFORM_ID, signal } from '@angular/core';
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
    const saved = localStorage.getItem(this.STORAGE_KEY);
    return this.VALID_MODES.includes(saved as ThemeMode)
      ? (saved as ThemeMode)
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
    this.document.body.classList.toggle('dark-theme', isDark);
  }
}
