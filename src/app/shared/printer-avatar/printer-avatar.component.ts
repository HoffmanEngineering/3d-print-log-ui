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
   * The URL that failed, not a boolean. A latched flag would make `noteLoadFailure`
   * pointless: the store refreshes the map, and the component would never read the new URL.
   */
  private readonly failedUrl = signal<string | null>(null);

  protected readonly src = computed(() => {
    const url = this.store.thumbnailFor(this.printerId());
    return url && url !== this.failedUrl() ? url : null;
  });

  protected onError(): void {
    this.failedUrl.set(this.store.thumbnailFor(this.printerId()));
    this.store.noteLoadFailure(this.printerId());
  }
}
