import { Overlay, OverlayRef } from '@angular/cdk/overlay';
import { ComponentPortal } from '@angular/cdk/portal';
import { inject, Injectable, Injector } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { firstValueFrom } from 'rxjs';

import {
  CelebrationItem,
  CelebrationPresenter,
} from '../../core/services/achievement-celebration.service';

/**
 * Shows celebrations with the toast and dialog components, importing each on first use so the
 * eager bundle carries none of their code or styles.
 */
@Injectable()
export class LazyCelebrationPresenter extends CelebrationPresenter {
  private readonly overlay = inject(Overlay);
  private readonly matDialog = inject(MatDialog);
  private readonly injector = inject(Injector);
  private toastRef: OverlayRef | null = null;

  async toast(
    items: CelebrationItem[],
    options: { quiet: boolean }
  ): Promise<void> {
    await this.whenNoDialogOpen();
    const { AchievementToastComponent } = await import(
      './achievement-toast.component'
    );

    // One toast at a time: a newer celebration replaces the one on screen.
    this.toastRef?.dispose();
    const ref = this.overlay.create({
      positionStrategy: this.overlay
        .position()
        .global()
        .top('72px')
        .right('16px'),
      panelClass: 'achievement-toast-panel',
    });
    this.toastRef = ref;

    const component = ref.attach(
      new ComponentPortal(AchievementToastComponent, null, this.injector)
    );
    component.setInput('items', items);
    component.setInput('quiet', options.quiet);

    // Resolves on close, so its items are marked read only after their full display time.
    await new Promise<void>((resolve) => {
      component.instance.closed.subscribe(() => {
        ref.dispose();
        if (this.toastRef === ref) this.toastRef = null;
        resolve();
      });
    });
  }

  async dialog(item: CelebrationItem): Promise<void> {
    await this.whenNoDialogOpen();
    const { AchievementCelebrationDialogComponent } = await import(
      './achievement-celebration-dialog.component'
    );
    const ref = this.matDialog.open(AchievementCelebrationDialogComponent, {
      data: item,
      width: '380px',
      maxWidth: 'calc(100vw - 32px)',
      autoFocus: 'button.nice',
    });
    await firstValueFrom(ref.afterClosed());
  }

  /**
   * Waits until no other dialog is open (a version release note, a delete confirmation), so a
   * celebration never stacks a second backdrop on one, and a toast never ticks away its display
   * time unseen behind one. The notification stays unread meanwhile, so nothing is lost.
   */
  private async whenNoDialogOpen(): Promise<void> {
    while (this.matDialog.openDialogs.length > 0) {
      await firstValueFrom(this.matDialog.afterAllClosed);
    }
  }
}
