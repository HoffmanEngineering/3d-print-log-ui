import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FileAttachmentSectionComponent } from './file-attachment-section.component';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { RouterTestingModule } from '@angular/router/testing';
import { SubscriptionService } from 'src/app/core/services/subscription.service';
import { PrintFileService } from 'src/app/core/services/print-file.service';
import { ToastrService } from 'ngx-toastr';
import { signal } from '@angular/core';
import { of } from 'rxjs';
import { LoggingService } from 'src/app/core/services/logging.service';
import { FileAttachmentItem } from '../file-attachment-list/file-attachment-list.component';

describe('FileAttachmentSectionComponent', () => {
  let component: FileAttachmentSectionComponent;
  let fixture: ComponentFixture<FileAttachmentSectionComponent>;

  const mockSubscriptionService = jasmine.createSpyObj(
    'SubscriptionService',
    [],
    {
      isPro: signal(true),
      maxFilesPerPrint: signal(5),
      maxFileStorageBytes: signal(53687091200),
      usedFileStorageBytes: signal(5368709120),
    }
  );

  const mockPrintFileService = jasmine.createSpyObj('PrintFileService', [
    'getFiles',
    'getUploadUrl',
    'uploadToSasUrl',
    'confirmUpload',
    'deleteFile',
    'getDownloadUrl',
    'validateFile',
  ]);
  mockPrintFileService.getFiles.and.returnValue(of([]));
  mockPrintFileService.validateFile.and.returnValue({ valid: true });

  const mockToastrService = jasmine.createSpyObj<ToastrService>(
    'ToastrService',
    ['success', 'error', 'warning', 'info']
  );

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        FileAttachmentSectionComponent,
        NoopAnimationsModule,
        RouterTestingModule,
      ],
      providers: [
        { provide: SubscriptionService, useValue: mockSubscriptionService },
        { provide: PrintFileService, useValue: mockPrintFileService },
        { provide: ToastrService, useValue: mockToastrService },
        {
          provide: LoggingService,
          useValue: jasmine.createSpyObj('LoggingService', [
            'logEvent',
            'logException',
          ]),
        },
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

  it('should display quota usage', () => {
    fixture.componentRef.setInput('editable', true);
    fixture.detectChanges();
    expect(component.formattedQuotaUsage()).toContain('5.0 GB');
    expect(component.formattedQuotaUsage()).toContain('50.0 GB');
  });

  it('should show toastr warning for invalid file', () => {
    const mockToastr = TestBed.inject(
      ToastrService
    ) as jasmine.SpyObj<ToastrService>;
    mockPrintFileService.validateFile.and.returnValue({
      valid: false,
      error: 'Bad file type',
    });
    fixture.componentRef.setInput('editable', true);
    fixture.detectChanges();
    component.onFilesSelected([new File([''], 'test.xyz')]);
    expect(mockToastr.warning).toHaveBeenCalledWith(
      'Bad file type',
      'Invalid File'
    );
  });

  it('should emit allowFileDownloadsChange when toggle changes', () => {
    fixture.detectChanges();
    const spy = spyOn(component.allowFileDownloadsChange, 'emit');
    component.onAllowDownloadsToggle(true);
    expect(spy).toHaveBeenCalledWith(true);
  });

  it('should remove file from list when deleting unsaved file', () => {
    fixture.detectChanges();
    const pendingFile: FileAttachmentItem = {
      originalFileName: 'test.gcode',
      sizeBytes: 1024,
      contentType: 'application/octet-stream',
      status: 'error',
    };
    component.files.set([pendingFile]);
    component.onDeleteFile(pendingFile);
    expect(component.files()).toEqual([]);
  });
});

describe('FileAttachmentSectionComponent (free user)', () => {
  let fixture: ComponentFixture<FileAttachmentSectionComponent>;

  const mockFreeSubscriptionService = jasmine.createSpyObj(
    'SubscriptionService',
    [],
    {
      isPro: signal(false),
      maxFilesPerPrint: signal(0),
      maxFileStorageBytes: signal(0),
      usedFileStorageBytes: signal(0),
    }
  );

  const mockPrintFileService = jasmine.createSpyObj('PrintFileService', [
    'getFiles',
    'getUploadUrl',
    'uploadToSasUrl',
    'confirmUpload',
    'deleteFile',
    'getDownloadUrl',
    'validateFile',
  ]);
  mockPrintFileService.getFiles.and.returnValue(of([]));

  const mockToastrService = jasmine.createSpyObj<ToastrService>(
    'ToastrService',
    ['success', 'error', 'warning', 'info']
  );

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        FileAttachmentSectionComponent,
        NoopAnimationsModule,
        RouterTestingModule,
      ],
      providers: [
        { provide: SubscriptionService, useValue: mockFreeSubscriptionService },
        { provide: PrintFileService, useValue: mockPrintFileService },
        { provide: ToastrService, useValue: mockToastrService },
        {
          provide: LoggingService,
          useValue: jasmine.createSpyObj('LoggingService', [
            'logEvent',
            'logException',
          ]),
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(FileAttachmentSectionComponent);
    fixture.componentRef.setInput('printId', 1);
  });

  it('should show upgrade teaser for free users', () => {
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Pro');
  });
});
