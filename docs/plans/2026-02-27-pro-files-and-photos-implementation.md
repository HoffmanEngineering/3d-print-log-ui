# Pro File Attachments & Photo Limit Increase — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Allow Pro subscribers to upload up to 20 images per print (up from 5) and attach 3D printing files (.gcode, .stl, .3mf, .obj) using Azure SAS presigned URLs for direct-to-blob upload.

**Architecture:** Frontend gets dynamic limits from SubscriptionDto. File uploads use a two-step SAS URL flow: request a presigned URL from the API, upload directly to Azure Blob Storage, then confirm. Files are stored in Azure Cool tier. A per-user 50GB quota bounds storage costs.

**Tech Stack:** Angular 20, Angular Material, Azure Blob Storage SAS URLs, .NET 9 API, Jasmine/Karma tests

**Design doc:** `docs/plans/2026-02-27-pro-files-and-photos-design.md`

---

## Task 1: Extend SubscriptionDto with Limit Fields

**Files:**

- Modify: `src/app/core/services/subscription.service.ts:6-12`

**Step 1: Update the SubscriptionDto interface**

Add the new limit and usage fields to the existing interface:

```typescript
export interface SubscriptionDto {
  status: 'none' | 'active' | 'past_due' | 'canceled';
  plan: 'free' | 'pro_monthly' | 'pro_annual';
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  isPro: boolean;
  maxImagesPerPrint: number;
  maxFilesPerPrint: number;
  maxFileStorageBytes: number;
  usedFileStorageBytes: number;
}
```

**Step 2: Add computed signals for the new fields**

In `SubscriptionService` class, add after existing computed signals (after line 31):

```typescript
readonly maxImagesPerPrint = computed(() => this._subscription()?.maxImagesPerPrint ?? 5);
readonly maxFilesPerPrint = computed(() => this._subscription()?.maxFilesPerPrint ?? 0);
readonly maxFileStorageBytes = computed(() => this._subscription()?.maxFileStorageBytes ?? 0);
readonly usedFileStorageBytes = computed(() => this._subscription()?.usedFileStorageBytes ?? 0);
```

**Step 3: Run lint**

Run: `npm run lint:brief`
Expected: No new errors

**Step 4: Commit**

```bash
git add src/app/core/services/subscription.service.ts
git commit -m "feat: add file and image limit fields to SubscriptionDto"
```

---

## Task 2: Dynamic Image Limit in Edit Print Component

**Files:**

- Modify: `src/app/print/edit-print-detail/edit-print-detail.component.ts:189` (MAX_IMAGES)
- Modify: `src/app/print/edit-print-detail/edit-print-detail.component.ts` (inject SubscriptionService)
- Test: `src/app/print/edit-print-detail/edit-print-detail.component.spec.ts`

**Step 1: Write the failing test**

Add a test that verifies the image limit comes from the subscription service. In the spec file, add `SubscriptionService` to the test providers as a mock, and test that `maxImages` reflects the subscription value:

```typescript
// Add to existing test setup providers:
const mockSubscriptionService = jasmine.createSpyObj('SubscriptionService', [], {
  isPro: signal(true),
  maxImagesPerPrint: signal(20),
  maxFilesPerPrint: signal(5),
  maxFileStorageBytes: signal(53687091200),
  usedFileStorageBytes: signal(0),
});

// Add provider:
{ provide: SubscriptionService, useValue: mockSubscriptionService }

// Add test:
it('should use maxImagesPerPrint from subscription service', () => {
  expect(component.maxImages()).toBe(20);
});
```

**Step 2: Run test to verify it fails**

Run: `npm run test:brief`
Expected: FAIL — `maxImages` doesn't exist yet

**Step 3: Implement the change**

In `edit-print-detail.component.ts`:

1. Add import for `SubscriptionService`:

   ```typescript
   import { SubscriptionService } from 'src/app/core/services/subscription.service';
   ```

2. Inject the service (add near other `inject()` calls):

   ```typescript
   private readonly subscriptionService = inject(SubscriptionService);
   ```

3. Replace the hardcoded constant (line 189):

   ```typescript
   // Replace: public readonly MAX_IMAGES = 5;
   // With:
   public readonly maxImages = this.subscriptionService.maxImagesPerPrint;
   ```

4. Update all references from `this.MAX_IMAGES` to `this.maxImages()` throughout the component:

   - `detectFiles` method (~line 1036): `this.MAX_IMAGES - currentCount` → `this.maxImages() - currentCount`
   - `detectFiles` warning (~line 1039): `` `Maximum ${this.MAX_IMAGES} images allowed` `` → `` `Maximum ${this.maxImages()} images allowed` ``
   - `onDragOver` method (~line 1180): `this.images.length < this.MAX_IMAGES` → `this.images.length < this.maxImages()`
   - `processDroppedFiles` method (~line 1213): same pattern as detectFiles

5. Pass dynamic value to the thumbnail strip in the HTML template. Find the `<app-image-thumbnail-strip>` tag (~line 81) and update:
   ```html
   [maxImages]="maxImages()"
   ```

**Step 4: Run tests to verify they pass**

Run: `npm run test:brief`
Expected: All tests pass

**Step 5: Commit**

```bash
git add src/app/print/edit-print-detail/
git commit -m "feat: use dynamic image limit from subscription service"
```

---

## Task 3: Pro Upgrade Prompt on Image Limit

**Files:**

- Modify: `src/app/print/edit-print-detail/edit-print-detail.component.ts` (detectFiles, processDroppedFiles)

**Step 1: Add upgrade prompt logic**

In the `detectFiles` and `processDroppedFiles` methods, when the limit is reached and the user is NOT Pro, change the toast to include an upgrade mention:

```typescript
if (maxAllowed <= 0) {
  if (this.subscriptionService.isPro()) {
    this.toastr.warning(`Maximum ${this.maxImages()} images allowed`, 'Limit Reached');
  } else {
    this.toastr.info(`Free accounts allow ${this.maxImages()} images. Upgrade to Pro for up to 20.`, 'Image Limit Reached');
  }
  return;
}
```

Apply the same pattern in both `detectFiles` (~line 1036) and `processDroppedFiles` (~line 1213).

**Step 2: Run tests**

Run: `npm run test:brief`
Expected: All tests pass

**Step 3: Commit**

```bash
git add src/app/print/edit-print-detail/
git commit -m "feat: show Pro upgrade prompt when free user hits image limit"
```

---

## Task 4: Create Print File Service

**Files:**

- Create: `src/app/core/services/print-file.service.ts`
- Create: `src/app/core/services/print-file.service.spec.ts`

**Step 1: Write the failing test**

```typescript
import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { PrintFileService, PrintFileAttachment } from './print-file.service';
import { environment } from 'src/environments/environment';

describe('PrintFileService', () => {
  let service: PrintFileService;
  let httpMock: HttpTestingController;
  const baseUrl = `${environment.printLogApiUrl}/api/Prints`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(PrintFileService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('should request an upload URL', () => {
    service.getUploadUrl(1, 'benchy.gcode', 'application/octet-stream', 1024).subscribe((res) => {
      expect(res.sasUrl).toBe('https://blob.example.com/sas');
      expect(res.blobPath).toBe('1/1/abc.gcode');
    });

    const req = httpMock.expectOne(`${baseUrl}/1/files/upload-url`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      fileName: 'benchy.gcode',
      contentType: 'application/octet-stream',
      sizeBytes: 1024,
    });
    req.flush({ sasUrl: 'https://blob.example.com/sas', blobPath: '1/1/abc.gcode' });
  });

  it('should confirm an upload', () => {
    const body = { blobPath: '1/1/abc.gcode', fileName: 'benchy.gcode', sizeBytes: 1024, contentType: 'application/octet-stream' };
    service.confirmUpload(1, body).subscribe();

    const req = httpMock.expectOne(`${baseUrl}/1/files/confirm`);
    expect(req.request.method).toBe('POST');
    req.flush({});
  });

  it('should list files for a print', () => {
    service.getFiles(1).subscribe((files) => {
      expect(files.length).toBe(1);
      expect(files[0].originalFileName).toBe('benchy.gcode');
    });

    const req = httpMock.expectOne(`${baseUrl}/1/files`);
    expect(req.request.method).toBe('GET');
    req.flush([{ id: 1, originalFileName: 'benchy.gcode', sizeBytes: 1024, contentType: 'application/octet-stream' }]);
  });

  it('should get a download URL', () => {
    service.getDownloadUrl(1, 1).subscribe((res) => {
      expect(res.url).toBe('https://blob.example.com/download-sas');
    });

    const req = httpMock.expectOne(`${baseUrl}/1/files/1/download-url`);
    expect(req.request.method).toBe('GET');
    req.flush({ url: 'https://blob.example.com/download-sas', expiresAt: '2026-03-01T00:00:00Z' });
  });

  it('should delete a file', () => {
    service.deleteFile(1, 1).subscribe();

    const req = httpMock.expectOne(`${baseUrl}/1/files/1`);
    expect(req.request.method).toBe('DELETE');
    req.flush({});
  });

  it('should upload a file to a SAS URL with progress', () => {
    const file = new File(['content'], 'test.gcode', { type: 'application/octet-stream' });
    const progressValues: number[] = [];

    service.uploadToSasUrl('https://blob.example.com/sas', file).subscribe({
      next: (progress) => progressValues.push(progress.percent),
    });

    // XMLHttpRequest-based, verify the observable is created
    expect(progressValues).toBeDefined();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm run test:brief`
Expected: FAIL — module not found

**Step 3: Implement the service**

```typescript
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

export interface PrintFileAttachment {
  id: number;
  originalFileName: string;
  sizeBytes: number;
  contentType: string;
  displayOrder: number;
}

export interface UploadUrlResponse {
  sasUrl: string;
  blobPath: string;
}

export interface DownloadUrlResponse {
  url: string;
  expiresAt: string;
}

export interface ConfirmUploadRequest {
  blobPath: string;
  fileName: string;
  sizeBytes: number;
  contentType: string;
}

export interface UploadProgress {
  percent: number;
  loaded: number;
  total: number;
}

@Injectable({
  providedIn: 'root',
})
export class PrintFileService {
  private readonly http = inject(HttpClient);
  private readonly baseApi = environment.printLogApiUrl;

  private static readonly ALLOWED_EXTENSIONS = ['.gcode', '.stl', '.3mf', '.obj'];
  private static readonly MAX_FILE_SIZE_BYTES = 200 * 1024 * 1024; // 200MB

  getUploadUrl(printId: number, fileName: string, contentType: string, sizeBytes: number): Observable<UploadUrlResponse> {
    return this.http.post<UploadUrlResponse>(`${this.baseApi}/api/Prints/${printId}/files/upload-url`, { fileName, contentType, sizeBytes });
  }

  confirmUpload(printId: number, request: ConfirmUploadRequest): Observable<PrintFileAttachment> {
    return this.http.post<PrintFileAttachment>(`${this.baseApi}/api/Prints/${printId}/files/confirm`, request);
  }

  getFiles(printId: number): Observable<PrintFileAttachment[]> {
    const headers = new HttpHeaders().set('allow-anonymous-request', 'true');
    return this.http.get<PrintFileAttachment[]>(`${this.baseApi}/api/Prints/${printId}/files`, { headers });
  }

  getDownloadUrl(printId: number, fileId: number): Observable<DownloadUrlResponse> {
    const headers = new HttpHeaders().set('allow-anonymous-request', 'true');
    return this.http.get<DownloadUrlResponse>(`${this.baseApi}/api/Prints/${printId}/files/${fileId}/download-url`, { headers });
  }

  deleteFile(printId: number, fileId: number): Observable<void> {
    return this.http.delete<void>(`${this.baseApi}/api/Prints/${printId}/files/${fileId}`);
  }

  /**
   * Upload a file directly to Azure Blob Storage via SAS URL.
   * Uses XMLHttpRequest for upload progress tracking.
   */
  uploadToSasUrl(sasUrl: string, file: File): Observable<UploadProgress> {
    return new Observable<UploadProgress>((observer) => {
      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          observer.next({
            percent: Math.round((event.loaded / event.total) * 100),
            loaded: event.loaded,
            total: event.total,
          });
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          observer.next({ percent: 100, loaded: file.size, total: file.size });
          observer.complete();
        } else {
          observer.error(new Error(`Upload failed with status ${xhr.status}`));
        }
      });

      xhr.addEventListener('error', () => {
        observer.error(new Error('Upload failed'));
      });

      xhr.open('PUT', sasUrl);
      xhr.setRequestHeader('x-ms-blob-type', 'BlockBlob');
      xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
      xhr.send(file);

      return () => xhr.abort();
    });
  }

  /**
   * Validates a file is an allowed type and within size limit.
   */
  validateFile(file: File): { valid: boolean; error?: string } {
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!PrintFileService.ALLOWED_EXTENSIONS.includes(ext)) {
      return {
        valid: false,
        error: `File type ${ext} is not supported. Allowed: ${PrintFileService.ALLOWED_EXTENSIONS.join(', ')}`,
      };
    }
    if (file.size > PrintFileService.MAX_FILE_SIZE_BYTES) {
      return {
        valid: false,
        error: `File exceeds 200MB limit (${(file.size / 1024 / 1024).toFixed(1)}MB)`,
      };
    }
    return { valid: true };
  }

  static getAllowedExtensions(): string[] {
    return [...PrintFileService.ALLOWED_EXTENSIONS];
  }

  static getMaxFileSizeBytes(): number {
    return PrintFileService.MAX_FILE_SIZE_BYTES;
  }
}
```

**Step 4: Run tests to verify they pass**

Run: `npm run test:brief`
Expected: All tests pass

**Step 5: Commit**

```bash
git add src/app/core/services/print-file.service.ts src/app/core/services/print-file.service.spec.ts
git commit -m "feat: add PrintFileService for file attachment API and SAS uploads"
```

---

## Task 5: Create FileDropZoneComponent

**Files:**

- Create: `src/app/shared/file-drop-zone/file-drop-zone.component.ts`
- Create: `src/app/shared/file-drop-zone/file-drop-zone.component.html`
- Create: `src/app/shared/file-drop-zone/file-drop-zone.component.scss`
- Create: `src/app/shared/file-drop-zone/file-drop-zone.component.spec.ts`

**Step 1: Write the failing test**

```typescript
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FileDropZoneComponent } from './file-drop-zone.component';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

describe('FileDropZoneComponent', () => {
  let component: FileDropZoneComponent;
  let fixture: ComponentFixture<FileDropZoneComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FileDropZoneComponent, NoopAnimationsModule],
    }).compileComponents();

    fixture = TestBed.createComponent(FileDropZoneComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should emit filesSelected when valid files are dropped', () => {
    const file = new File(['content'], 'test.gcode', { type: 'application/octet-stream' });
    const spy = spyOn(component.filesSelected, 'emit');

    const event = new DragEvent('drop', { dataTransfer: new DataTransfer() });
    event.dataTransfer!.items.add(file);

    component.onDrop(event);
    expect(spy).toHaveBeenCalled();
  });

  it('should show drag-over state', () => {
    const event = new DragEvent('dragover');
    Object.defineProperty(event, 'preventDefault', { value: jasmine.createSpy() });
    component.onDragOver(event);
    expect(component.isDragOver()).toBe(true);
  });

  it('should clear drag-over state on drag leave', () => {
    component.onDragLeave();
    expect(component.isDragOver()).toBe(false);
  });

  it('should accept configured file extensions', () => {
    fixture.componentRef.setInput('acceptExtensions', ['.gcode', '.stl']);
    fixture.detectChanges();
    expect(component.acceptExtensions()).toEqual(['.gcode', '.stl']);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm run test:brief`
Expected: FAIL — module not found

**Step 3: Implement the component**

**file-drop-zone.component.ts:**

```typescript
import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-file-drop-zone',
  templateUrl: './file-drop-zone.component.html',
  styleUrls: ['./file-drop-zone.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatIconModule],
})
export class FileDropZoneComponent {
  acceptExtensions = input<string[]>(['.gcode', '.stl', '.3mf', '.obj']);
  disabled = input(false);

  filesSelected = output<File[]>();

  isDragOver = signal(false);

  get acceptString(): string {
    return this.acceptExtensions().join(',');
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    if (!this.disabled()) {
      this.isDragOver.set(true);
    }
  }

  onDragLeave(): void {
    this.isDragOver.set(false);
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver.set(false);

    if (this.disabled()) return;

    const files = Array.from(event.dataTransfer?.files ?? []);
    if (files.length > 0) {
      this.filesSelected.emit(files);
    }
  }

  onFileInputChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    if (files.length > 0) {
      this.filesSelected.emit(files);
    }
    input.value = '';
  }
}
```

**file-drop-zone.component.html:**

```html
<div class="drop-zone" [class.drag-over]="isDragOver()" [class.disabled]="disabled()" (dragover)="onDragOver($event)" (dragleave)="onDragLeave()" (drop)="onDrop($event)">
  @if (isDragOver()) {
  <div class="drop-overlay">
    <mat-icon>cloud_upload</mat-icon>
    <span>Drop files here</span>
  </div>
  } @else {
  <div class="drop-content">
    <mat-icon>attach_file</mat-icon>
    <span>Drop files here or <label class="file-input-label" for="fileInput">browse</label></span>
    <span class="hint">{{ acceptExtensions().join(', ') }} · Max 200MB per file</span>
  </div>
  }
  <input id="fileInput" type="file" hidden [accept]="acceptString" multiple (change)="onFileInputChange($event)" />
</div>
```

**file-drop-zone.component.scss:**

```scss
.drop-zone {
  border: 2px dashed rgba(255, 255, 255, 0.3);
  border-radius: 8px;
  padding: 24px;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s ease;

  &.drag-over {
    border-color: #69f0ae;
    background: rgba(105, 240, 174, 0.08);
  }

  &.disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

.drop-overlay,
.drop-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;

  mat-icon {
    font-size: 36px;
    width: 36px;
    height: 36px;
    opacity: 0.6;
  }
}

.hint {
  font-size: 12px;
  opacity: 0.5;
}

.file-input-label {
  color: #69f0ae;
  cursor: pointer;
  text-decoration: underline;
}
```

**Step 4: Run tests to verify they pass**

Run: `npm run test:brief`
Expected: All tests pass

**Step 5: Commit**

```bash
git add src/app/shared/file-drop-zone/
git commit -m "feat: add FileDropZoneComponent for drag-and-drop file uploads"
```

---

## Task 6: Create FileAttachmentListComponent

**Files:**

- Create: `src/app/shared/file-attachment-list/file-attachment-list.component.ts`
- Create: `src/app/shared/file-attachment-list/file-attachment-list.component.html`
- Create: `src/app/shared/file-attachment-list/file-attachment-list.component.scss`
- Create: `src/app/shared/file-attachment-list/file-attachment-list.component.spec.ts`

**Step 1: Write the failing test**

```typescript
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FileAttachmentListComponent, FileAttachmentItem } from './file-attachment-list.component';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

describe('FileAttachmentListComponent', () => {
  let component: FileAttachmentListComponent;
  let fixture: ComponentFixture<FileAttachmentListComponent>;

  const mockFiles: FileAttachmentItem[] = [
    { id: 1, originalFileName: 'benchy.gcode', sizeBytes: 52428800, contentType: 'application/octet-stream', status: 'uploaded' },
    { id: 2, originalFileName: 'benchy.stl', sizeBytes: 1048576, contentType: 'application/octet-stream', status: 'uploaded' },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FileAttachmentListComponent, NoopAnimationsModule],
    }).compileComponents();

    fixture = TestBed.createComponent(FileAttachmentListComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('should display file names and formatted sizes', () => {
    fixture.componentRef.setInput('files', mockFiles);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('benchy.gcode');
    expect(el.textContent).toContain('50'); // 50 MB
  });

  it('should emit download when download button clicked', () => {
    fixture.componentRef.setInput('files', mockFiles);
    fixture.componentRef.setInput('editable', false);
    fixture.componentRef.setInput('canDownload', true);
    fixture.detectChanges();
    const spy = spyOn(component.download, 'emit');
    component.onDownload(mockFiles[0]);
    expect(spy).toHaveBeenCalledWith(mockFiles[0]);
  });

  it('should emit delete when delete button clicked', () => {
    fixture.componentRef.setInput('files', mockFiles);
    fixture.componentRef.setInput('editable', true);
    fixture.detectChanges();
    const spy = spyOn(component.delete, 'emit');
    component.onDelete(mockFiles[0]);
    expect(spy).toHaveBeenCalledWith(mockFiles[0]);
  });

  it('should show progress bar for uploading files', () => {
    const uploadingFiles: FileAttachmentItem[] = [{ originalFileName: 'test.gcode', sizeBytes: 1024, contentType: 'application/octet-stream', status: 'uploading', uploadPercent: 45 }];
    fixture.componentRef.setInput('files', uploadingFiles);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('mat-progress-bar')).toBeTruthy();
  });

  it('should format file sizes correctly', () => {
    expect(component.formatSize(1024)).toBe('1.0 KB');
    expect(component.formatSize(1048576)).toBe('1.0 MB');
    expect(component.formatSize(52428800)).toBe('50.0 MB');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm run test:brief`
Expected: FAIL — module not found

**Step 3: Implement the component**

**file-attachment-list.component.ts:**

```typescript
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';

export interface FileAttachmentItem {
  id?: number;
  originalFileName: string;
  sizeBytes: number;
  contentType: string;
  status: 'pending' | 'uploading' | 'uploaded' | 'error';
  uploadPercent?: number;
  errorMessage?: string;
}

@Component({
  selector: 'app-file-attachment-list',
  templateUrl: './file-attachment-list.component.html',
  styleUrls: ['./file-attachment-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatIconModule, MatButtonModule, MatProgressBarModule],
})
export class FileAttachmentListComponent {
  files = input<FileAttachmentItem[]>([]);
  editable = input(false);
  canDownload = input(false);

  download = output<FileAttachmentItem>();
  delete = output<FileAttachmentItem>();

  onDownload(file: FileAttachmentItem): void {
    this.download.emit(file);
  }

  onDelete(file: FileAttachmentItem): void {
    this.delete.emit(file);
  }

  getFileIcon(fileName: string): string {
    const ext = fileName.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'gcode':
        return 'code';
      case 'stl':
      case '3mf':
      case 'obj':
        return 'view_in_ar';
      default:
        return 'insert_drive_file';
    }
  }

  formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1073741824) return `${(bytes / 1048576).toFixed(1)} MB`;
    return `${(bytes / 1073741824).toFixed(1)} GB`;
  }
}
```

**file-attachment-list.component.html:**

```html
@for (file of files(); track file.originalFileName) {
<div class="file-item" [class.error]="file.status === 'error'">
  <mat-icon class="file-icon">{{ getFileIcon(file.originalFileName) }}</mat-icon>
  <div class="file-info">
    <span class="file-name">{{ file.originalFileName }}</span>
    <span class="file-size">{{ formatSize(file.sizeBytes) }}</span>
    @if (file.status === 'uploading') {
    <mat-progress-bar mode="determinate" [value]="file.uploadPercent ?? 0"></mat-progress-bar>
    } @if (file.status === 'error') {
    <span class="error-message">{{ file.errorMessage ?? 'Upload failed' }}</span>
    }
  </div>
  <div class="file-actions">
    @if (file.status === 'uploaded' && canDownload()) {
    <button mat-icon-button (click)="onDownload(file)" title="Download">
      <mat-icon>download</mat-icon>
    </button>
    } @if (editable() && file.status !== 'uploading') {
    <button mat-icon-button (click)="onDelete(file)" title="Remove">
      <mat-icon>delete</mat-icon>
    </button>
    }
  </div>
</div>
} @empty {
<p class="no-files">No files attached</p>
}
```

**file-attachment-list.component.scss:**

```scss
:host {
  display: block;
}

.file-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 4px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);

  &:last-child {
    border-bottom: none;
  }

  &.error {
    opacity: 0.7;
  }
}

.file-icon {
  opacity: 0.6;
}

.file-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.file-name {
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.file-size {
  font-size: 12px;
  opacity: 0.5;
}

.error-message {
  font-size: 12px;
  color: #ef5350;
}

.no-files {
  text-align: center;
  opacity: 0.4;
  padding: 12px;
}

mat-progress-bar {
  margin-top: 4px;
}
```

**Step 4: Run tests to verify they pass**

Run: `npm run test:brief`
Expected: All tests pass

**Step 5: Commit**

```bash
git add src/app/shared/file-attachment-list/
git commit -m "feat: add FileAttachmentListComponent for displaying file attachments"
```

---

## Task 7: Create FileAttachmentSectionComponent

**Files:**

- Create: `src/app/shared/file-attachment-section/file-attachment-section.component.ts`
- Create: `src/app/shared/file-attachment-section/file-attachment-section.component.html`
- Create: `src/app/shared/file-attachment-section/file-attachment-section.component.scss`
- Create: `src/app/shared/file-attachment-section/file-attachment-section.component.spec.ts`

This is the main orchestrator component. It:

- Shows a Pro teaser for free users
- Shows the drop zone + file list for Pro users in edit mode
- Shows the file list (read-only) with download buttons in view mode
- Handles upload orchestration (get SAS URL → upload → confirm)
- Shows quota usage

**Step 1: Write the failing test**

```typescript
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FileAttachmentSectionComponent } from './file-attachment-section.component';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { SubscriptionService } from 'src/app/core/services/subscription.service';
import { PrintFileService } from 'src/app/core/services/print-file.service';
import { signal } from '@angular/core';
import { of } from 'rxjs';

describe('FileAttachmentSectionComponent', () => {
  let component: FileAttachmentSectionComponent;
  let fixture: ComponentFixture<FileAttachmentSectionComponent>;

  const mockSubscriptionService = jasmine.createSpyObj('SubscriptionService', [], {
    isPro: signal(true),
    maxFilesPerPrint: signal(5),
    maxFileStorageBytes: signal(53687091200),
    usedFileStorageBytes: signal(5368709120),
  });

  const mockPrintFileService = jasmine.createSpyObj('PrintFileService', ['getFiles', 'getUploadUrl', 'uploadToSasUrl', 'confirmUpload', 'deleteFile', 'getDownloadUrl', 'validateFile']);
  mockPrintFileService.getFiles.and.returnValue(of([]));
  mockPrintFileService.validateFile.and.returnValue({ valid: true });

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FileAttachmentSectionComponent, NoopAnimationsModule],
      providers: [
        { provide: SubscriptionService, useValue: mockSubscriptionService },
        { provide: PrintFileService, useValue: mockPrintFileService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(FileAttachmentSectionComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('printId', 1);
  });

  it('should create', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('should show drop zone for Pro users in edit mode', () => {
    fixture.componentRef.setInput('editable', true);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('app-file-drop-zone')).toBeTruthy();
  });

  it('should show upgrade teaser for free users', () => {
    // Override isPro to false
    Object.defineProperty(mockSubscriptionService, 'isPro', { value: signal(false) });
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Pro');
  });

  it('should display quota usage', () => {
    fixture.componentRef.setInput('editable', true);
    fixture.detectChanges();
    expect(component.formattedQuotaUsage()).toContain('5.0 GB');
    expect(component.formattedQuotaUsage()).toContain('50.0 GB');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm run test:brief`
Expected: FAIL — module not found

**Step 3: Implement the component**

**file-attachment-section.component.ts:**

```typescript
import { ChangeDetectionStrategy, Component, computed, inject, input, OnInit, signal } from '@angular/core';
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
import { FileAttachmentListComponent, FileAttachmentItem } from '../file-attachment-list/file-attachment-list.component';

@Component({
  selector: 'app-file-attachment-section',
  templateUrl: './file-attachment-section.component.html',
  styleUrls: ['./file-attachment-section.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatIconModule, MatButtonModule, MatSlideToggleModule, RouterLink, FileDropZoneComponent, FileAttachmentListComponent],
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

  readonly isPro = this.subscriptionService.isPro;
  readonly maxFiles = this.subscriptionService.maxFilesPerPrint;

  readonly files = signal<FileAttachmentItem[]>([]);

  readonly uploadedFileCount = computed(() => this.files().filter((f) => f.status === 'uploaded').length);

  readonly canAddMore = computed(() => this.uploadedFileCount() < this.maxFiles());

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

  readonly canDownload = computed(() => this.isOwner() || this.allowFileDownloads());

  ngOnInit(): void {
    if (this.printId()) {
      this.loadFiles();
    }
  }

  loadFiles(): void {
    this.printFileService.getFiles(this.printId()).subscribe((files) => {
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
        this.toastr.warning(validation.error!, 'Invalid File');
        continue;
      }

      if (!this.canAddMore()) {
        this.toastr.warning(`Maximum ${this.maxFiles()} files per print`, 'File Limit Reached');
        break;
      }

      this.uploadFile(file);
    }
  }

  private uploadFile(file: File): void {
    const item: FileAttachmentItem = {
      originalFileName: file.name,
      sizeBytes: file.size,
      contentType: file.type || 'application/octet-stream',
      status: 'uploading',
      uploadPercent: 0,
    };

    this.files.update((list) => [...list, item]);
    const index = this.files().length - 1;

    this.printFileService
      .getUploadUrl(this.printId(), file.name, item.contentType, file.size)
      .pipe(
        switchMap((urlResponse) =>
          this.printFileService.uploadToSasUrl(urlResponse.sasUrl, file).pipe(
            switchMap((progress) => {
              this.updateFileAtIndex(index, { uploadPercent: progress.percent });
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
        )
      )
      .subscribe({
        next: (confirmed) => {
          if (confirmed) {
            this.updateFileAtIndex(index, {
              id: confirmed.id,
              status: 'uploaded',
              uploadPercent: 100,
            });
            this.loggingService.logEvent('FileAttachment_Uploaded', {
              extension: file.name.split('.').pop(),
              sizeBytes: file.size,
            });
          }
        },
        error: (err) => {
          this.updateFileAtIndex(index, {
            status: 'error',
            errorMessage: 'Upload failed. Please try again.',
          });
          this.loggingService.logException(err);
        },
      });
  }

  onDownloadFile(file: FileAttachmentItem): void {
    if (!file.id) return;
    this.printFileService.getDownloadUrl(this.printId(), file.id).subscribe({
      next: (res) => {
        window.open(res.url, '_blank');
        this.loggingService.logEvent('FileAttachment_Downloaded', {
          fileId: file.id,
        });
      },
      error: () => this.toastr.error('Failed to get download link', 'Error'),
    });
  }

  onDeleteFile(file: FileAttachmentItem): void {
    if (file.id) {
      this.printFileService.deleteFile(this.printId(), file.id).subscribe({
        next: () => {
          this.files.update((list) => list.filter((f) => f !== file));
          this.loggingService.logEvent('FileAttachment_Deleted', {
            fileId: file.id,
          });
        },
        error: () => this.toastr.error('Failed to delete file', 'Error'),
      });
    } else {
      // Remove pending/error files that haven't been saved
      this.files.update((list) => list.filter((f) => f !== file));
    }
  }

  onAllowDownloadsToggle(checked: boolean): void {
    this.allowFileDownloadsChange.emit(checked);
  }

  private updateFileAtIndex(index: number, updates: Partial<FileAttachmentItem>): void {
    this.files.update((list) => list.map((f, i) => (i === index ? { ...f, ...updates } : f)));
  }

  private formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1073741824) return `${(bytes / 1048576).toFixed(1)} MB`;
    return `${(bytes / 1073741824).toFixed(1)} GB`;
  }
}
```

Note: `output` import must come from `@angular/core`. Add it to the existing import:

```typescript
import { ..., output } from '@angular/core';
```

**file-attachment-section.component.html:**

```html
<section class="file-attachment-section">
  @if (isPro()) {
  <div class="section-header">
    <h3>
      <mat-icon>attach_file</mat-icon>
      File Attachments
      <span class="file-count">{{ uploadedFileCount() }} / {{ maxFiles() }}</span>
    </h3>
    @if (editable()) {
    <span class="quota" [class.warning]="quotaWarning() === 'warning'" [class.full]="quotaWarning() === 'full'"> {{ formattedQuotaUsage() }} </span>
    }
  </div>

  @if (editable()) {
  <mat-slide-toggle [checked]="allowFileDownloads()" (change)="onAllowDownloadsToggle($event.checked)" class="downloads-toggle"> Allow others to download files </mat-slide-toggle>

  @if (canAddMore() && quotaWarning() !== 'full') {
  <app-file-drop-zone (filesSelected)="onFilesSelected($event)"></app-file-drop-zone>
  } @else if (quotaWarning() === 'full') {
  <p class="storage-full">Storage full. Delete files to free up space.</p>
  } }

  <app-file-attachment-list [files]="files()" [editable]="editable()" [canDownload]="canDownload()" (download)="onDownloadFile($event)" (delete)="onDeleteFile($event)"></app-file-attachment-list>
  } @else {
  <!-- Free user teaser -->
  <div class="pro-teaser">
    <mat-icon>attach_file</mat-icon>
    <span>Attach gcode, STL, and 3MF files</span>
    <a [routerLink]="['/subscription']" class="pro-badge"> <mat-icon>star</mat-icon> Pro </a>
  </div>
  }
</section>
```

**file-attachment-section.component.scss:**

```scss
.file-attachment-section {
  padding: 16px 0;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;

  h3 {
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 0;

    mat-icon {
      font-size: 20px;
      width: 20px;
      height: 20px;
    }
  }

  .file-count {
    font-size: 14px;
    font-weight: 400;
    opacity: 0.6;
  }
}

.quota {
  font-size: 12px;
  opacity: 0.5;

  &.warning {
    color: #ffb74d;
    opacity: 1;
  }

  &.full {
    color: #ef5350;
    opacity: 1;
  }
}

.downloads-toggle {
  margin-bottom: 12px;
  display: block;
}

.storage-full {
  text-align: center;
  color: #ef5350;
  padding: 16px;
}

.pro-teaser {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  opacity: 0.6;

  mat-icon {
    opacity: 0.5;
  }

  .pro-badge {
    display: flex;
    align-items: center;
    gap: 4px;
    color: #ffd740;
    text-decoration: none;
    font-weight: 500;
    font-size: 13px;
    margin-left: auto;

    mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
      opacity: 1;
    }
  }
}
```

**Step 4: Run tests to verify they pass**

Run: `npm run test:brief`
Expected: All tests pass

**Step 5: Commit**

```bash
git add src/app/shared/file-attachment-section/
git commit -m "feat: add FileAttachmentSectionComponent with upload orchestration"
```

---

## Task 8: Integrate File Section into Edit Print View

**Files:**

- Modify: `src/app/print/edit-print-detail/edit-print-detail.component.ts`
- Modify: `src/app/print/edit-print-detail/edit-print-detail.component.html:~1010-1016`

**Step 1: Add import and form control**

In `edit-print-detail.component.ts`:

1. Add import for `FileAttachmentSectionComponent`:

   ```typescript
   import { FileAttachmentSectionComponent } from 'src/app/shared/file-attachment-section/file-attachment-section.component';
   ```

2. Add `FileAttachmentSectionComponent` to the component's `imports` array (if standalone) or the module's `imports`.

3. Add `allowFileDownloads` to the form group type and initialization:
   ```typescript
   allowFileDownloads: FormControl<boolean>;
   ```
   Initialize with `false`, patch from the print data when loaded.

**Step 2: Add the component to the template**

In `edit-print-detail.component.html`, insert the file attachment section between the `allowComments` checkbox (~line 1016) and the `mat-card-actions` (~line 1018):

```html
        >Allow Comments</mat-checkbox
        >

        <!-- File Attachments Section -->
        @if (printForm.get('id').value) {
          <app-file-attachment-section
            [printId]="printForm.get('id').value"
            [editable]="true"
            [isOwner]="true"
            [allowFileDownloads]="printForm.get('allowFileDownloads').value"
            (allowFileDownloadsChange)="printForm.get('allowFileDownloads').setValue($event); printForm.get('allowFileDownloads').markAsDirty()"
          ></app-file-attachment-section>
        } @else {
          <p style="opacity: 0.5; font-size: 13px; margin-top: 8px;">
            <mat-icon style="font-size: 16px; vertical-align: middle;">attach_file</mat-icon>
            Save the print first to attach files.
          </p>
        }

      </mat-card-content>
```

**Step 3: Run tests**

Run: `npm run test:brief`
Expected: All tests pass (may need to add mock providers for new services in existing spec)

**Step 4: Commit**

```bash
git add src/app/print/edit-print-detail/
git commit -m "feat: integrate file attachment section into edit print view"
```

---

## Task 9: Integrate File Section into View Print Detail

**Files:**

- Modify: `src/app/print/view-print-detail/view-print-detail.component.ts`
- Modify: `src/app/print/view-print-detail/view-print-detail.component.html:~230-232`

**Step 1: Add import**

In `view-print-detail.component.ts`, this component is NOT standalone (`standalone: false` at line 34). So the `FileAttachmentSectionComponent` must be added to the print module's imports, or the view component must be converted. Since it's module-based, add `FileAttachmentSectionComponent` to the `PrintModule` imports.

Check `src/app/print/print.module.ts` and add:

```typescript
import { FileAttachmentSectionComponent } from '../shared/file-attachment-section/file-attachment-section.component';
// Add to imports array
```

**Step 2: Add to template**

In `view-print-detail.component.html`, insert before the comments section (before line 231 `<mat-card-content style="width: 100%">`):

```html
<!-- File Attachments -->
<mat-card-content>
  <app-file-attachment-section [printId]="print.id" [editable]="false" [isOwner]="currentUser && currentUser.id === user.id" [allowFileDownloads]="print.allowFileDownloads"></app-file-attachment-section>
</mat-card-content>

<mat-card-content style="width: 100%"></mat-card-content>
```

**Step 3: Handle allowFileDownloads in print model**

Add `allowFileDownloads` to the `PrintDetail` interface in `print.service.ts` if not already present:

```typescript
allowFileDownloads?: boolean;
```

**Step 4: Run tests**

Run: `npm run test:brief`
Expected: All tests pass

**Step 5: Commit**

```bash
git add src/app/print/
git commit -m "feat: integrate file attachment section into print detail view"
```

---

## Task 10: Add AllowFileDownloads to Print Form Save

**Files:**

- Modify: `src/app/print/edit-print-detail/edit-print-detail.component.ts` (save method)
- Modify: `src/app/core/services/print.service.ts` (PutPrintDetailDto)

**Step 1: Add allowFileDownloads to the print DTO**

In `print.service.ts`, find the `PutPrintDetailDto` or equivalent interface and add:

```typescript
allowFileDownloads?: boolean;
```

**Step 2: Include in save payload**

In `edit-print-detail.component.ts`, in the save/submit method, include `allowFileDownloads` from the form in the DTO sent to the API.

**Step 3: Patch form value on load**

When loading an existing print for editing, patch `allowFileDownloads` from the print data into the form.

**Step 4: Run tests**

Run: `npm run test:brief`
Expected: All tests pass

**Step 5: Commit**

```bash
git add src/app/print/ src/app/core/services/print.service.ts
git commit -m "feat: persist allowFileDownloads toggle in print save"
```

---

## Task 11: Analytics Events

**Files:**

- Already handled in `FileAttachmentSectionComponent` (Task 7)
- Modify: `src/app/print/edit-print-detail/edit-print-detail.component.ts` (image limit prompt)

**Step 1: Add analytics for image limit upgrade prompt**

In the upgrade prompt added in Task 3, add a logging event:

```typescript
this.loggingService.logEvent('EditPrint_ImageLimitUpgradePrompt', {
  currentCount: this.images.length,
  maxImages: this.maxImages(),
});
```

**Step 2: Run tests**

Run: `npm run test:brief`
Expected: All tests pass

**Step 3: Commit**

```bash
git add src/app/print/edit-print-detail/
git commit -m "feat: add analytics events for file and image limit interactions"
```

---

## Task 12: Final Integration Test

**Step 1: Run all tests**

Run: `npm run test:brief`
Expected: All tests pass

**Step 2: Run lint**

Run: `npm run lint:brief`
Expected: No errors

**Step 3: Run formatting check**

Run: `npm run prettier`
Expected: No formatting issues (or run `npm run prettier:fix`)

**Step 4: Build**

Run: `npm run build:dev`
Expected: Build succeeds with no errors

**Step 5: Commit any remaining fixes**

```bash
git add -A
git commit -m "chore: fix lint and formatting issues"
```

---

## Summary of Files Created/Modified

### New Files

| File                                                                               | Purpose                                     |
| ---------------------------------------------------------------------------------- | ------------------------------------------- |
| `src/app/core/services/print-file.service.ts`                                      | API calls for file attachments + SAS upload |
| `src/app/core/services/print-file.service.spec.ts`                                 | Tests for PrintFileService                  |
| `src/app/shared/file-drop-zone/file-drop-zone.component.*`                         | Drag-and-drop file input                    |
| `src/app/shared/file-drop-zone/file-drop-zone.component.spec.ts`                   | Tests                                       |
| `src/app/shared/file-attachment-list/file-attachment-list.component.*`             | File list display with actions              |
| `src/app/shared/file-attachment-list/file-attachment-list.component.spec.ts`       | Tests                                       |
| `src/app/shared/file-attachment-section/file-attachment-section.component.*`       | Orchestrator with Pro gating                |
| `src/app/shared/file-attachment-section/file-attachment-section.component.spec.ts` | Tests                                       |

### Modified Files

| File                                                               | Change                                                        |
| ------------------------------------------------------------------ | ------------------------------------------------------------- |
| `src/app/core/services/subscription.service.ts`                    | Add limit fields to SubscriptionDto + computed signals        |
| `src/app/core/services/print.service.ts`                           | Add allowFileDownloads to PrintDetail/DTO                     |
| `src/app/print/edit-print-detail/edit-print-detail.component.ts`   | Dynamic MAX_IMAGES, file section integration, upgrade prompts |
| `src/app/print/edit-print-detail/edit-print-detail.component.html` | File attachment section in template                           |
| `src/app/print/view-print-detail/view-print-detail.component.html` | File attachment section (read-only)                           |
| `src/app/print/print.module.ts`                                    | Import FileAttachmentSectionComponent                         |
