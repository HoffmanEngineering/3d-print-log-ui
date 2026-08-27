import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  input,
  signal,
  untracked,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { Observable, concat, of } from 'rxjs';
import { catchError, finalize, map, tap, toArray } from 'rxjs/operators';
import {
  FilamentImage,
  FilamentService,
} from 'src/app/core/services/filament.service';
import { isCordova } from 'src/app/core/utils/platform';
import { FilamentImageComponent } from 'src/app/shared/filament-image/filament-image.component';
import { ImageCarouselComponent } from 'src/app/shared/image-carousel/image-carousel.component';
import { ImageThumbnailStripComponent } from 'src/app/shared/image-thumbnail-strip/image-thumbnail-strip.component';
import { DeferredSkeletonController } from 'src/app/shared/skeleton/deferred-skeleton';

export interface FilamentImageValue {
  /** Absent while the image is staged and not yet uploaded. */
  id?: number;
  /**
   * Client-side identity for a staged item. Every mutation here crosses an
   * async boundary, and `syncStoredImages` copies each item, so `===` cannot be
   * used to find the object a request started from.
   */
  stagedKey?: number;
  /** SAS URL once stored, or an object URL while staged. */
  url?: string;
  thumbnailUrl?: string;
  /** Present only while staged. */
  file?: File | null;
  isDefault: boolean;
  displayOrder: number;
}

let nextStagedKey = 1;

@Component({
  selector: 'app-filament-images-panel',
  templateUrl: './filament-images-panel.component.html',
  styleUrls: ['./filament-images-panel.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    ImageCarouselComponent,
    ImageThumbnailStripComponent,
    FilamentImageComponent,
  ],
})
export class FilamentImagesPanelComponent {
  private readonly filamentService = inject(FilamentService);
  /** Picks which hidden file input the add affordances open. */
  protected readonly isCordova = isCordova;
  private readonly destroyRef = inject(DestroyRef);

  filamentId = input<string | null>(null);
  images = input<FilamentImageValue[]>([]);
  /**
   * The API enforces the real per-tier cap (3 free, 10 pro) and exposes no
   * client-visible field for it, so the add affordance is capped at the highest
   * tier and an over-quota upload surfaces the API's own rejection.
   */
  maxImages = input(10);

  protected readonly items = signal<FilamentImageValue[]>([]);
  protected readonly selectedIndex = signal(0);
  protected readonly isDragOver = signal(false);
  protected readonly failedFiles = signal<File[]>([]);
  /** Files dropped on the floor because they would exceed `maxImages`. */
  protected readonly rejectedCount = signal(0);
  /** A failed delete / reorder / set-default, surfaced next to the images. */
  protected readonly actionError = signal<string | null>(null);
  /** True for the whole upload, unlike `busy`, which is deferred by 200ms. */
  protected readonly uploading = signal(false);

  /** True while any picked file has not yet been stored by the API. */
  readonly hasStagedImages = computed(() => this.items().some((i) => !!i.file));

  protected readonly selected = computed(() => {
    const items = this.items();
    if (items.length === 0) return null;
    const index = Math.min(this.selectedIndex(), items.length - 1);
    return items[index];
  });

  /** Object URLs handed to `<img>`; every one must be revoked exactly once. */
  private readonly objectUrls = new Set<string>();
  /**
   * A reorder made while something was still staged. The API validates the
   * complete, duplicate-free set of stored IDs, so it cannot be sent until every
   * item has one.
   */
  private pendingReorder = false;
  /** The ID uploads last ran against, so retry works after a create. */
  private lastUploadFilamentId: string | null = null;

  private readonly skeleton = new DeferredSkeletonController();
  protected readonly busy = this.skeleton.visible;

  constructor() {
    effect(() => {
      const incoming = this.images();
      untracked(() => this.syncStoredImages(incoming));
    });

    this.destroyRef.onDestroy(() => {
      this.objectUrls.forEach((url) => URL.revokeObjectURL(url));
      this.objectUrls.clear();
      this.skeleton.destroy();
    });
  }

  /** Uploads everything currently staged, resolving with the files that failed. */
  uploadStagedImages(filamentId: string): Observable<{ failed: File[] }> {
    return this.uploadItems(
      filamentId,
      this.items().filter((item) => !!item.file)
    );
  }

  /** Re-posts only the files that failed last time, leaving newer picks alone. */
  retryFailedUploads(filamentId: string): Observable<{ failed: File[] }> {
    const failed = this.failedFiles();
    return this.uploadItems(
      filamentId,
      this.items().filter((item) => !!item.file && failed.includes(item.file))
    );
  }

  protected onRetryClick(): void {
    // The button is disabled while uploading, but a double-click can land two
    // events before the disabled attribute is painted, and each subscription
    // would POST the same file again.
    if (this.uploading()) return;
    const filamentId = this.filamentId() ?? this.lastUploadFilamentId;
    if (!filamentId) return;
    this.retryFailedUploads(filamentId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe();
  }

  protected onFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.addFiles(Array.from(input.files ?? []));
    // Clear it, or picking the same file twice in a row fires no change event.
    input.value = '';
  }

  protected onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.isDragOver.set(true);
  }

  protected onDragLeave(event: DragEvent): void {
    event.preventDefault();
    this.isDragOver.set(false);
  }

  protected onFileDrop(event: DragEvent): void {
    event.preventDefault();
    this.isDragOver.set(false);
    this.addFiles(Array.from(event.dataTransfer?.files ?? []));
  }

  protected onCarouselIndexChange(index: number): void {
    this.selectedIndex.set(index);
  }

  protected onThumbnailSelected(image: FilamentImageValue): void {
    const index = this.items().findIndex((item) => this.isSame(item, image));
    if (index >= 0) this.selectedIndex.set(index);
  }

  protected onImageDeleted(image: FilamentImageValue): void {
    if (image.file) {
      this.releaseObjectUrl(image.url);
      this.failedFiles.update((files) => files.filter((f) => f !== image.file));
      this.removeItem(image);
      return;
    }

    const filamentId = this.filamentId() ?? this.lastUploadFilamentId;
    if (!filamentId || image.id === undefined) return;

    this.actionError.set(null);
    this.skeleton.start();
    this.filamentService
      .deleteFilamentImage(filamentId, image.id)
      .pipe(
        finalize(() => this.skeleton.stop()),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: () => this.removeItem(image),
        error: () =>
          this.actionError.set(
            'That photo could not be deleted. Please try again.'
          ),
      });
  }

  protected onDefaultChanged(image: FilamentImageValue): void {
    const filamentId = this.filamentId() ?? this.lastUploadFilamentId;
    if (image.id === undefined || !filamentId) {
      // Staged images have no server-side identity yet; `uploadItems` replays
      // the choice once the upload assigns an ID.
      this.markDefaultLocally(image);
      return;
    }

    this.actionError.set(null);
    this.filamentService
      .setFilamentImageAsDefault(filamentId, image.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => this.markDefaultLocally(image),
        error: () =>
          this.actionError.set(
            'That photo could not be set as the default. Please try again.'
          ),
      });
  }

  protected onImagesReordered(change: {
    previousIndex: number;
    currentIndex: number;
  }): void {
    const previous = this.items();
    const reordered = [...previous];
    const [moved] = reordered.splice(change.previousIndex, 1);
    if (!moved) return;
    reordered.splice(change.currentIndex, 0, moved);
    this.items.set(
      reordered.map((item, index) => ({ ...item, displayOrder: index }))
    );

    this.flushReorder(previous);
  }

  /** `rollbackTo` is the order to restore if the API rejects the new one. */
  private flushReorder(rollbackTo?: FilamentImageValue[]): void {
    const items = this.items();
    const filamentId = this.filamentId() ?? this.lastUploadFilamentId;

    // A partial list is a 400: the endpoint validates the exact set of stored
    // IDs, so hold the order locally until every item has one.
    if (!filamentId || items.some((item) => item.id === undefined)) {
      this.pendingReorder = true;
      return;
    }

    this.actionError.set(null);
    this.filamentService
      .reorderFilamentImages(
        filamentId,
        items.map((item) => item.id as number)
      )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        // Only a confirmed write clears the pending flag, or a failed reorder
        // would never be retried when the staged items finish uploading.
        next: () => (this.pendingReorder = false),
        error: () => {
          if (rollbackTo) this.items.set(rollbackTo);
          this.actionError.set(
            'That new photo order could not be saved. Please try again.'
          );
        },
      });
  }

  private uploadItems(
    filamentId: string,
    targets: FilamentImageValue[]
  ): Observable<{ failed: File[] }> {
    this.lastUploadFilamentId = filamentId;

    if (targets.length === 0) {
      this.failedFiles.set([]);
      return of({ failed: [] });
    }

    const failed: File[] = [];
    // The user may have starred a staged photo. That choice cannot be sent
    // until the upload assigns it an ID, so remember which one it was.
    const desiredDefaultKey = this.items().find(
      (item) => item.isDefault && !!item.file
    )?.stagedKey;
    const assignedIds = new Map<number, number>();

    this.uploading.set(true);
    this.skeleton.start();

    return concat(
      ...targets.map((item) =>
        this.filamentService.uploadFilamentImage(filamentId, item.file!).pipe(
          tap((uploaded) => {
            if (item.stagedKey !== undefined) {
              assignedIds.set(item.stagedKey, uploaded.id);
            }
            this.replaceStaged(item, uploaded);
          }),
          catchError(() => {
            failed.push(item.file!);
            return of(null);
          })
        )
      )
    ).pipe(
      toArray(),
      map(() => ({ failed })),
      tap(() => {
        this.failedFiles.set(failed);
        const defaultId =
          desiredDefaultKey === undefined
            ? undefined
            : assignedIds.get(desiredDefaultKey);
        if (defaultId !== undefined) this.persistDefault(filamentId, defaultId);
        if (failed.length === 0 && this.pendingReorder) this.flushReorder();
      }),
      finalize(() => {
        this.uploading.set(false);
        this.skeleton.stop();
      })
    );
  }

  /** Sends a default the user picked before the image had a server-side ID. */
  private persistDefault(filamentId: string, imageId: number): void {
    const stored = this.items().find((item) => item.id === imageId);
    // The API picks the first image as the default on its own; if that is
    // already this one, there is nothing to send.
    if (!stored || stored.isDefault) return;

    this.filamentService
      .setFilamentImageAsDefault(filamentId, imageId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () =>
          this.items.update((items) =>
            items.map((item) => ({ ...item, isDefault: item.id === imageId }))
          ),
        error: () =>
          this.actionError.set(
            'That photo could not be set as the default. Please try again.'
          ),
      });
  }

  private replaceStaged(
    staged: FilamentImageValue,
    uploaded: FilamentImage
  ): void {
    this.releaseObjectUrl(staged.url);
    this.items.update((items) =>
      items.map((item) =>
        this.isSame(item, staged)
          ? {
              id: uploaded.id,
              url: uploaded.url ?? undefined,
              thumbnailUrl: uploaded.thumbnailUrl ?? undefined,
              isDefault: uploaded.isDefault,
              displayOrder: uploaded.displayOrder,
            }
          : item
      )
    );
  }

  private addFiles(files: File[]): void {
    const images = files.filter((file) => file.type.startsWith('image/'));
    if (images.length === 0) return;

    this.items.update((items) => {
      // The strip's add button already hides at the cap, but the empty-state
      // button, a multi-select, and drag/drop all reach here directly. Staging
      // past the cap only buys a wall of API rejections.
      const room = Math.max(0, this.maxImages() - items.length);
      const accepted = images.slice(0, room);
      this.rejectedCount.set(images.length - accepted.length);
      if (accepted.length === 0) return items;

      const added = accepted.map((file, offset) => {
        const url = URL.createObjectURL(file);
        this.objectUrls.add(url);
        return {
          stagedKey: nextStagedKey++,
          url,
          file,
          isDefault: items.length === 0 && offset === 0,
          displayOrder: items.length + offset,
        } satisfies FilamentImageValue;
      });
      return [...items, ...added];
    });
  }

  private markDefaultLocally(image: FilamentImageValue): void {
    this.items.update((items) =>
      items.map((item) => ({ ...item, isDefault: this.isSame(item, image) }))
    );
  }

  private removeItem(image: FilamentImageValue): void {
    // Room has been freed, so the over-cap notice no longer describes anything.
    this.rejectedCount.set(0);
    this.items.update((items) =>
      items
        .filter((item) => !this.isSame(item, image))
        .map((item, index) => ({ ...item, displayOrder: index }))
    );
    this.selectedIndex.update((index) =>
      Math.max(0, Math.min(index, this.items().length - 1))
    );
  }

  /**
   * Identity that survives the object copies `syncStoredImages` and every
   * `items.update` make: the stored ID once there is one, the staged key before.
   */
  private isSame(a: FilamentImageValue, b: FilamentImageValue): boolean {
    if (a.id !== undefined || b.id !== undefined) return a.id === b.id;
    return a.stagedKey !== undefined && a.stagedKey === b.stagedKey;
  }

  private releaseObjectUrl(url: string | undefined): void {
    if (!url || !this.objectUrls.has(url)) return;
    URL.revokeObjectURL(url);
    this.objectUrls.delete(url);
  }

  /**
   * Replaces the stored images while keeping anything the user has staged.
   * Staged items always sort after stored ones so a reorder never sends a
   * partial ID set.
   */
  private syncStoredImages(incoming: FilamentImageValue[]): void {
    const staged = this.items().filter((item) => !!item.file);
    const stored = [...incoming].sort(
      (a, b) => a.displayOrder - b.displayOrder
    );
    this.items.set(
      [...stored, ...staged].map((item, index) => ({
        ...item,
        displayOrder: index,
      }))
    );
  }
}
