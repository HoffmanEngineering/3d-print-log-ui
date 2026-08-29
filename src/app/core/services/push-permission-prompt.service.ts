import { inject, Injectable } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { firstValueFrom } from 'rxjs';
import { SimpleDialogComponent } from '../../shared/simple-dialog/simple-dialog.component';
import { NativeBridgeService } from './native-bridge.service';
import { PushPermissionState } from '../types/native-bridge';

/**
 * Asks for the Android notification permission, in context and behind an explainer.
 *
 * Never at launch. On Android 13+ a denial is effectively permanent — the OS stops showing
 * the dialog — so the one request this app gets has to be spent at a moment when the user
 * already understands why notifications are useful.
 */
@Injectable({ providedIn: 'root' })
export class PushPermissionPromptService {
  private readonly bridge = inject(NativeBridgeService);
  private readonly dialog = inject(MatDialog);

  /**
   * Shows the explainer and, if the user agrees, requests the permission.
   *
   * A no-op outside the app shell and when the permission is already granted, so callers
   * can invoke it from a shared flow without branching on platform.
   *
   * @param reason one sentence on what just happened that makes notifications useful.
   * @returns the resulting permission state.
   */
  async promptInContext(reason: string): Promise<PushPermissionState> {
    if (!this.bridge.isAvailable()) {
      return 'default';
    }

    const current = this.bridge.permission;
    if (current === 'granted') {
      return current;
    }

    const dialogRef = this.dialog.open(SimpleDialogComponent, { data: {} });
    dialogRef.componentInstance.title = 'Get notified about your prints?';
    dialogRef.componentInstance.body = `<p>${reason}</p>
      <p>3D Print Log can notify you when a print finishes or fails, so you do not
      have to keep checking. You can change this any time in Settings.</p>`;
    dialogRef.componentInstance.yesText = 'Enable notifications';
    dialogRef.componentInstance.noText = 'Not now';

    const accepted = await firstValueFrom(dialogRef.afterClosed());
    if (!accepted) {
      // "Not now" must not reach the OS prompt: spending the single system dialog on a user
      // who just declined the explainer is how the permission gets permanently denied.
      return current;
    }

    return this.bridge.requestPushPermission();
  }
}
