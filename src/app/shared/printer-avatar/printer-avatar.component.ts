import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';

import { PrinterThumbnailStore } from 'src/app/core/stores/printer-thumbnail-store.service';

/**
 * The printer's default photo, wherever a printer is named.
 *
 * Every cross-cutting surface goes through this one component, so the anonymous, no-photo
 * and failed-load cases each have exactly one implementation. It reads a map the store has
 * already fetched, so there is deliberately no busy affordance: the avatar simply is not
 * there until there is something to show.
 */
@Component({
  selector: 'app-printer-avatar',
  templateUrl: './printer-avatar.component.html',
  styleUrls: ['./printer-avatar.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PrinterAvatarComponent {
  private readonly store = inject(PrinterThumbnailStore);

  printerId = input.required<number>();

  /**
   * The only place the printer name reaches the accessibility tree, so every caller that
   * has a name passes it.
   */
  printerName = input('');

  size = input<'sm' | 'md'>('sm');

  /**
   * The URL that failed, and the store generation it failed in.
   *
   * Not a latched boolean: that would make `noteLoadFailure` pointless, because the
   * component would never read the refreshed map. But not the URL alone either - signing
   * is bucketed to six hours server-side, so a refetch inside the bucket returns the SAME
   * URL, and matching on the URL would keep a transiently-failed photo hidden forever.
   * Pairing it with the generation gives every completed refetch exactly one fresh attempt,
   * while a genuinely dead blob simply fails again and re-suppresses.
   */
  private readonly failed = signal<{ url: string; generation: number } | null>(
    null
  );

  protected readonly src = computed(() => {
    const url = this.store.thumbnailFor(this.printerId());
    if (!url) return null;
    const failed = this.failed();
    const suppressed =
      failed !== null &&
      failed.url === url &&
      failed.generation === this.store.generation();
    return suppressed ? null : url;
  });

  protected onError(): void {
    const url = this.store.thumbnailFor(this.printerId());
    if (url) {
      this.failed.set({ url, generation: this.store.generation() });
    }
    this.store.noteLoadFailure(this.printerId());
  }
}
