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

  /** Per-device, matching the scope of the permission it is about. */
  private static readonly DECLINED_AT_KEY = 'printlog.pushPromptDeclinedAt';

  /**
   * How long "Not now" is honoured. Long enough that the ask does not become nagging,
   * short enough that someone who declined reflexively gets another chance without having
   * to find this in Settings.
   */
  private static readonly COOLDOWN_MS = 30 * 24 * 60 * 60 * 1000;

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

    // Suppresses OUR explainer only, never the OS prompt, which is still reached solely via
    // an explicit "Enable notifications". Checked across all triggers rather than per
    // trigger: someone who just declined on one screen should not be asked again from
    // another a few minutes later.
    if (this.declinedRecently()) {
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
      this.rememberDecline();
      return current;
    }

    return this.bridge.requestPushPermission();
  }

  private declinedRecently(): boolean {
    const declinedAt = Number(
      this.read(PushPermissionPromptService.DECLINED_AT_KEY)
    );
    if (!Number.isFinite(declinedAt) || declinedAt <= 0) {
      return false;
    }

    return Date.now() - declinedAt < PushPermissionPromptService.COOLDOWN_MS;
  }

  private rememberDecline(): void {
    this.write(PushPermissionPromptService.DECLINED_AT_KEY, String(Date.now()));
  }

  /*
   * Both accessors throw outright in private browsing and when site data is blocked, so
   * neither is allowed to break the prompt. Failing to read means we ask — the worse
   * outcome is a user who can never be asked at all.
   */
  private read(key: string): string | null {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  }

  private write(key: string, value: string): void {
    try {
      localStorage.setItem(key, value);
    } catch {
      // Nothing to do: the prompt simply is not suppressed on this device.
    }
  }
}
