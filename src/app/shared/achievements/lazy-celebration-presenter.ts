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

  async toast(items: CelebrationItem[]): Promise<void> {
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
    component.instance.closed.subscribe(() => {
      ref.dispose();
      if (this.toastRef === ref) this.toastRef = null;
    });
  }

  async dialog(item: CelebrationItem): Promise<void> {
    const { AchievementCelebrationDialogComponent } = await import(
      './achievement-celebration-dialog.component'
    );
    const ref = this.matDialog.open(AchievementCelebrationDialogComponent, {
      data: item,
      width: '420px',
      maxWidth: 'calc(100vw - 32px)',
      autoFocus: 'button.nice',
    });
    await firstValueFrom(ref.afterClosed());
  }
}
