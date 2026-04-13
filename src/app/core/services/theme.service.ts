import { inject, Injectable, signal } from '@angular/core';
import { DOCUMENT } from '@angular/common';

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
  private initialized = false;

  private get mediaQuery(): MediaQueryList {
    return window.matchMedia('(prefers-color-scheme: dark)');
  }

  readonly mode = signal<ThemeMode>(this.loadSavedMode());

  private loadSavedMode(): ThemeMode {
    const saved = localStorage.getItem(this.STORAGE_KEY);
    return this.VALID_MODES.includes(saved as ThemeMode)
      ? (saved as ThemeMode)
      : 'system';
  }

  initialize(): void {
    if (this.initialized) return;
    this.initialized = true;
    this.applyTheme(this.mode());
    this.mediaQuery.addEventListener('change', () => {
      if (this.mode() === 'system') {
        this.applyTheme('system');
      }
    });
  }

  setMode(mode: ThemeMode): void {
    this.mode.set(mode);
    localStorage.setItem(this.STORAGE_KEY, mode);
    this.applyTheme(mode);
  }

  private applyTheme(mode: ThemeMode): void {
    const isDark =
      mode === 'dark' || (mode === 'system' && this.mediaQuery.matches);
    this.document.body.classList.toggle('dark-theme', isDark);
  }
}
