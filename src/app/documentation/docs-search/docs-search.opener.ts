import { Injectable, inject } from '@angular/core';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';

import { DocsSearchDialogComponent } from './docs-search-dialog.component';

/**
 * Opens the search palette, from wherever asked.
 *
 * There are three entry points — the toolbar button, the sidebar box, and the
 * keyboard shortcut — and they must not be able to stack three dialogs on top of
 * each other. The single open ref lives here rather than in any one of them.
 */
@Injectable()
export class DocsSearchOpener {
  private readonly dialog = inject(MatDialog);
  private ref: MatDialogRef<DocsSearchDialogComponent> | null = null;

  /**
   * @param query text already typed elsewhere, carried into the palette so the
   *   reader never types the same word twice
   */
  open(query?: string): void {
    if (this.ref) {
      // Already open: give it what was typed and put the caret back in it.
      this.ref.componentInstance?.focusInput();
      return;
    }

    this.ref = this.dialog.open(DocsSearchDialogComponent, {
      data: query ? { query } : null,
      width: 'min(40rem, 100vw - 2rem)',
      maxWidth: '100vw',
      // Top-anchored, the way every command palette is: centring it makes the
      // results list move up the screen as it grows.
      position: { top: '10vh' },
      panelClass: 'docs-search-panel',
      autoFocus: false,
      restoreFocus: true,
      ariaLabel: 'Search documentation',
    });

    this.ref.afterClosed().subscribe(() => {
      this.ref = null;
    });
  }

  get isOpen(): boolean {
    return this.ref !== null;
  }
}
