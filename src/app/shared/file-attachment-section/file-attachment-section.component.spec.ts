import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FileAttachmentSectionComponent } from './file-attachment-section.component';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { RouterTestingModule } from '@angular/router/testing';
import { SubscriptionService } from 'src/app/core/services/subscription.service';
import { PrintFileService } from 'src/app/core/services/print-file.service';
import { ToastrService } from 'ngx-toastr';
import { signal } from '@angular/core';
import { of } from 'rxjs';

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
