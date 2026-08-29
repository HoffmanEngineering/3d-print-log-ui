import { inject, Injectable } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { firstValueFrom } from 'rxjs';
import { SimpleDialogComponent } from '../../shared/simple-dialog/simple-dialog.component';
import { NativeBridgeService } from './native-bridge.service';
import { PushPermissionState } from '../types/native-bridge';

/**
 * What actually happened, as distinct from the resulting permission.
 *
 * A caller that only offers opportunistically has to tell "the user has now decided" from
 * "nothing was asked at all", so it does not spend a one-per-view offer on a no-op.
 */
export type PushPromptOutcome =
  | 'shown'
  | 'suppressed'
  | 'unavailable'
  | 'already-granted';

export interface PushPromptResult {
  permission: PushPermissionState;
  outcome: PushPromptOutcome;
}

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
   * How long "Not now" is honoured for offers the user did not ask for. Long enough that the
   * ask does not become nagging, short enough that someone who declined reflexively gets
   * another chance without having to find this in Settings.
   */
  private static readonly COOLDOWN_MS = 30 * 24 * 60 * 60 * 1000;

  /**
   * Tolerance for a device clock that is slightly ahead. Past this, a stored timestamp is
   * treated as corrupt rather than as the future: a future value would otherwise suppress
   * prompting until the clock caught up to it, which for a badly wrong clock is forever.
   */
  private static readonly MAX_CLOCK_SKEW_MS = 24 * 60 * 60 * 1000;

  /**
   * The prompt currently on screen, if any. Two triggers can fire close together — an
   * API-key creation response landing after the user has navigated to a running print — and
   * without this both would open an explainer and both would reach the OS request.
   */
  private inFlight: Promise<PushPromptResult> | null = null;

  /**
   * Offers notifications at a moment that makes them meaningful. The user did not ask for
   * this, so a recent "Not now" is honoured.
   *
   * A no-op outside the app shell and when the permission is already granted, so callers can
   * invoke it from a shared flow without branching on platform.
   *
   * @param reason one sentence on what just happened that makes notifications useful.
   */
  promptInContext(reason: string): Promise<PushPromptResult> {
    return this.run(reason, { honourCooldown: true });
  }

  /**
   * Requests notifications because the user explicitly asked — the Settings button.
   *
   * Deliberately ignores the cooldown. That button is the documented second chance for
   * someone who declined earlier, and suppressing it would leave a user who changed their
   * mind with no route to enabling notifications inside the app at all.
   */
  promptOnUserRequest(reason: string): Promise<PushPromptResult> {
    return this.run(reason, { honourCooldown: false });
  }

  private run(
    reason: string,
    options: { honourCooldown: boolean }
  ): Promise<PushPromptResult> {
    if (this.inFlight) {
      return this.inFlight;
    }

    const attempt = this.ask(reason, options).finally(() => {
      this.inFlight = null;
    });
    this.inFlight = attempt;
    return attempt;
  }

  private async ask(
    reason: string,
    options: { honourCooldown: boolean }
  ): Promise<PushPromptResult> {
    if (!this.bridge.isAvailable()) {
      return { permission: 'default', outcome: 'unavailable' };
    }

    const current = this.bridge.permission;
    if (current === 'granted') {
      return { permission: current, outcome: 'already-granted' };
    }

    // Suppresses OUR explainer only, never the OS prompt, which is still reached solely via
    // an explicit "Enable notifications". Checked across all triggers rather than per
    // trigger: someone who just declined on one screen should not be asked again from
    // another a few minutes later.
    if (options.honourCooldown && this.declinedRecently()) {
      return { permission: current, outcome: 'suppressed' };
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
      return { permission: current, outcome: 'shown' };
    }

    // Re-read rather than trusting the value captured before the dialog opened: the
    // permission can have been granted while it was up, and asking the OS again would spend
    // a second irreversible request on a grant we already hold.
    if (this.bridge.permission === 'granted') {
      return { permission: 'granted', outcome: 'already-granted' };
    }

    return {
      permission: await this.bridge.requestPushPermission(),
      outcome: 'shown',
    };
  }

  private declinedRecently(): boolean {
    const declinedAt = Number(
      this.read(PushPermissionPromptService.DECLINED_AT_KEY)
    );
    if (!Number.isFinite(declinedAt) || declinedAt <= 0) {
      return false;
    }

    const age = Date.now() - declinedAt;
    if (age < -PushPermissionPromptService.MAX_CLOCK_SKEW_MS) {
      // Recorded materially in the future: a clock that was ahead and has since been
      // corrected, or a corrupt value. Treating it as recent would suppress the prompt until
      // the clock caught back up to it, so drop it instead.
      this.remove(PushPermissionPromptService.DECLINED_AT_KEY);
      return false;
    }

    return age < PushPermissionPromptService.COOLDOWN_MS;
  }

  private rememberDecline(): void {
    this.write(PushPermissionPromptService.DECLINED_AT_KEY, String(Date.now()));
  }

  /*
   * Every accessor below throws outright in private browsing and when site data is blocked,
   * so none of them may break the prompt. Failing to read means we ask: the worse outcome is
   * a user who can never be asked at all.
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

  private remove(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch {
      // As above.
    }
  }
}
