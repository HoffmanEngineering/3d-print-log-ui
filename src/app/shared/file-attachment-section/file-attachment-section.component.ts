import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  input,
  OnInit,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { RouterLink } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { switchMap } from 'rxjs';
import { SubscriptionService } from 'src/app/core/services/subscription.service';
import { PrintFileService } from 'src/app/core/services/print-file.service';
import { LoggingService } from 'src/app/core/services/logging.service';
import { FileDropZoneComponent } from '../file-drop-zone/file-drop-zone.component';
import {
  FileAttachmentListComponent,
  FileAttachmentItem,
} from '../file-attachment-list/file-attachment-list.component';

type TrackedFileItem = FileAttachmentItem & { trackingId?: string };

@Component({
  selector: 'app-file-attachment-section',
  templateUrl: './file-attachment-section.component.html',
  styleUrls: ['./file-attachment-section.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatIconModule,
    MatButtonModule,
    MatSlideToggleModule,
    RouterLink,
    FileDropZoneComponent,
    FileAttachmentListComponent,
  ],
})
export class FileAttachmentSectionComponent implements OnInit {
  printId = input.required<number>();
  editable = input(false);
  allowFileDownloads = input(false);
  isOwner = input(false);

  allowFileDownloadsChange = output<boolean>();

  private readonly subscriptionService = inject(SubscriptionService);
  private readonly printFileService = inject(PrintFileService);
  private readonly toastr = inject(ToastrService);
  private readonly loggingService = inject(LoggingService);
  private readonly destroyRef = inject(DestroyRef);

  readonly isPro = this.subscriptionService.isPro;
  readonly maxFiles = this.subscriptionService.maxFilesPerPrint;

  readonly files = signal<TrackedFileItem[]>([]);

  // Shown in the header ("N / max"): only fully-uploaded files.
  readonly uploadedFileCount = computed(
    () => this.files().filter((f) => f.status === 'uploaded').length
  );

  // Slot enforcement: any tracked file that is not in a terminal error state
  // occupies a slot, so an in-progress upload reserves capacity and closes the
  // batch-selection race. Errored uploads free their slot for a retry.
  readonly activeFileCount = computed(
    () => this.files().filter((f) => f.status !== 'error').length
  );

  readonly canAddMore = computed(
    () => this.activeFileCount() < this.maxFiles()
  );

  readonly formattedQuotaUsage = computed(() => {
    const used = this.subscriptionService.usedFileStorageBytes();
    const max = this.subscriptionService.maxFileStorageBytes();
    return `${this.formatBytes(used)} of ${this.formatBytes(max)} used`;
  });

  readonly quotaWarning = computed(() => {
    const used = this.subscriptionService.usedFileStorageBytes();
    const max = this.subscriptionService.maxFileStorageBytes();
    if (max === 0) return 'none';
    const ratio = used / max;
    if (ratio >= 1) return 'full';
    if (ratio >= 0.8) return 'warning';
    return 'none';
  });

  readonly canDownload = computed(
    () => this.isOwner() || this.allowFileDownloads()
  );

  ngOnInit(): void {
    if (this.printId()) {
      this.loadFiles();
    }
  }

  loadFiles(): void {
    this.printFileService
      .getFiles(this.printId())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((files) => {
        this.files.set(
          files.map((f) => ({
            ...f,
            status: 'uploaded' as const,
          }))
        );
      });
  }

  onFilesSelected(selectedFiles: File[]): void {
    for (const file of selectedFiles) {
      const validation = this.printFileService.validateFile(file);
      if (!validation.valid) {
        this.toastr.warning(validation.error ?? 'Invalid file', 'Invalid File');
        continue;
      }

      if (!this.canAddMore()) {
        this.toastr.warning(
          `Maximum ${this.maxFiles()} files per print`,
          'File Limit Reached'
        );
        break;
      }

      this.uploadFile(file);
    }
  }

  private uploadFile(file: File): void {
    const trackingId = crypto.randomUUID();
    const item: TrackedFileItem = {
      originalFileName: file.name,
      sizeBytes: file.size,
      contentType: file.type || 'application/octet-stream',
      status: 'uploading',
      uploadPercent: 0,
      trackingId,
    };

    this.files.update((list) => [...list, item]);

    this.printFileService
      .getUploadUrl(this.printId(), file.name, item.contentType, file.size)
      .pipe(
        switchMap((urlResponse) =>
          this.printFileService.uploadToSasUrl(urlResponse.sasUrl, file).pipe(
            switchMap((progress) => {
              this.updateFileByTrackingId(trackingId, {
                uploadPercent: progress.percent,
              });
              if (progress.percent === 100) {
                return this.printFileService.confirmUpload(this.printId(), {
                  blobPath: urlResponse.blobPath,
                  fileName: file.name,
                  sizeBytes: file.size,
                  contentType: item.contentType,
                });
              }
              return [];
            })
          )
        ),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (confirmed) => {
          if (confirmed) {
            this.updateFileByTrackingId(trackingId, {
              id: (confirmed as { id: number }).id,
              status: 'uploaded',
              uploadPercent: 100,
            });
            this.subscriptionService.incrementUsedStorage(file.size);
            this.loggingService.logEvent('FileAttachment_Uploaded', {
              extension: file.name.split('.').pop(),
              sizeBytes: file.size,
            });
          }
        },
        error: (err) => {
          this.updateFileByTrackingId(trackingId, {
            status: 'error',
            errorMessage: 'Upload failed. Please try again.',
          });
          this.loggingService.logException(err);
        },
      });
  }

  onDownloadFile(file: FileAttachmentItem): void {
    if (!file.id) return;
    this.printFileService
      .getDownloadUrl(this.printId(), file.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          window.open(res.url, '_blank');
          this.loggingService.logEvent('FileAttachment_Downloaded', {
            fileId: file.id,
          });
        },
        error: (err) => {
          this.toastr.error('Failed to get download link', 'Error');
          this.loggingService.logException(err);
        },
      });
  }

  onDeleteFile(file: FileAttachmentItem): void {
    if (file.id) {
      this.printFileService
        .deleteFile(this.printId(), file.id)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: () => {
            this.files.update((list) => list.filter((f) => f !== file));
            this.subscriptionService.decrementUsedStorage(file.sizeBytes);
            this.loggingService.logEvent('FileAttachment_Deleted', {
              fileId: file.id,
            });
          },
          error: (err) => {
            this.toastr.error('Failed to delete file', 'Error');
            this.loggingService.logException(err);
          },
        });
    } else {
      // Remove pending/error files that haven't been saved
      this.files.update((list) => list.filter((f) => f !== file));
    }
  }

  onAllowDownloadsToggle(checked: boolean): void {
    this.allowFileDownloadsChange.emit(checked);
  }

  private updateFileByTrackingId(
    trackingId: string,
    updates: Partial<TrackedFileItem>
  ): void {
    this.files.update((list) =>
      list.map((f) => (f.trackingId === trackingId ? { ...f, ...updates } : f))
    );
  }

  private formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1073741824) return `${(bytes / 1048576).toFixed(1)} MB`;
    return `${(bytes / 1073741824).toFixed(1)} GB`;
  }
}
