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
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { Observable, concat, of } from 'rxjs';
import { catchError, finalize, map, tap, toArray } from 'rxjs/operators';
import {
  FilamentImage,
  FilamentService,
} from 'src/app/core/services/filament.service';
import { FilamentImageComponent } from 'src/app/shared/filament-image/filament-image.component';
import { ImageCarouselComponent } from 'src/app/shared/image-carousel/image-carousel.component';
import { ImageThumbnailStripComponent } from 'src/app/shared/image-thumbnail-strip/image-thumbnail-strip.component';
import { DeferredSkeletonController } from 'src/app/shared/skeleton/deferred-skeleton';

export interface FilamentImageValue {
  /** Absent while the image is staged and not yet uploaded. */
  id?: number;
  /** SAS URL once stored, or an object URL while staged. */
  url?: string;
  thumbnailUrl?: string;
  /** Present only while staged. */
  file?: File | null;
  isDefault: boolean;
  displayOrder: number;
}

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
    const filamentId = this.filamentId() ?? this.lastUploadFilamentId;
    if (!filamentId) return;
    this.retryFailedUploads(filamentId).subscribe();
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
    const index = this.items().indexOf(image);
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

    this.skeleton.start();
    this.filamentService
      .deleteFilamentImage(filamentId, image.id)
      .pipe(finalize(() => this.skeleton.stop()))
      .subscribe(() => this.removeItem(image));
  }

  protected onDefaultChanged(image: FilamentImageValue): void {
    const applyLocally = () =>
      this.items.update((items) =>
        items.map((item) => ({ ...item, isDefault: item === image }))
      );

    const filamentId = this.filamentId() ?? this.lastUploadFilamentId;
    if (image.id === undefined || !filamentId) {
      // Staged images have no server-side identity yet; the choice is applied
      // when they upload.
      applyLocally();
      return;
    }

    this.filamentService
      .setFilamentImageAsDefault(filamentId, image.id)
      .subscribe(() => applyLocally());
  }

  protected onImagesReordered(change: {
    previousIndex: number;
    currentIndex: number;
  }): void {
    const reordered = [...this.items()];
    const [moved] = reordered.splice(change.previousIndex, 1);
    if (!moved) return;
    reordered.splice(change.currentIndex, 0, moved);
    this.items.set(
      reordered.map((item, index) => ({ ...item, displayOrder: index }))
    );

    this.flushReorder();
  }

  private flushReorder(): void {
    const items = this.items();
    const filamentId = this.filamentId() ?? this.lastUploadFilamentId;

    // A partial list is a 400: the endpoint validates the exact set of stored
    // IDs, so hold the order locally until every item has one.
    if (!filamentId || items.some((item) => item.id === undefined)) {
      this.pendingReorder = true;
      return;
    }

    this.pendingReorder = false;
    this.filamentService
      .reorderFilamentImages(
        filamentId,
        items.map((item) => item.id as number)
      )
      .subscribe();
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
    this.skeleton.start();

    return concat(
      ...targets.map((item) =>
        this.filamentService.uploadFilamentImage(filamentId, item.file!).pipe(
          tap((uploaded) => this.replaceStaged(item, uploaded)),
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
        if (failed.length === 0 && this.pendingReorder) {
          this.flushReorder();
        }
      }),
      finalize(() => this.skeleton.stop())
    );
  }

  private replaceStaged(
    staged: FilamentImageValue,
    uploaded: FilamentImage
  ): void {
    this.releaseObjectUrl(staged.url);
    this.items.update((items) =>
      items.map((item) =>
        item === staged
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
      const added = images.map((file, offset) => {
        const url = URL.createObjectURL(file);
        this.objectUrls.add(url);
        return {
          url,
          file,
          isDefault: items.length === 0 && offset === 0,
          displayOrder: items.length + offset,
        } satisfies FilamentImageValue;
      });
      return [...items, ...added];
    });
  }

  private removeItem(image: FilamentImageValue): void {
    this.items.update((items) =>
      items
        .filter((item) => item !== image)
        .map((item, index) => ({ ...item, displayOrder: index }))
    );
    this.selectedIndex.update((index) =>
      Math.max(0, Math.min(index, this.items().length - 1))
    );
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
