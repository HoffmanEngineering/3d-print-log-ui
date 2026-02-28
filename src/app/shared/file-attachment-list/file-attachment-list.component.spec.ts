import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  FileAttachmentListComponent,
  FileAttachmentItem,
} from './file-attachment-list.component';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

describe('FileAttachmentListComponent', () => {
  let component: FileAttachmentListComponent;
  let fixture: ComponentFixture<FileAttachmentListComponent>;

  const mockFiles: FileAttachmentItem[] = [
    {
      id: 1,
      originalFileName: 'test-model.stl',
      sizeBytes: 1048576,
      contentType: 'model/stl',
      status: 'uploaded',
    },
    {
      id: 2,
      originalFileName: 'print.gcode',
      sizeBytes: 512,
      contentType: 'text/plain',
      status: 'uploading',
      uploadPercent: 45,
    },
    {
      id: 3,
      originalFileName: 'failed.obj',
      sizeBytes: 2048,
      contentType: 'model/obj',
      status: 'error',
      errorMessage: 'Upload failed',
    },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FileAttachmentListComponent, NoopAnimationsModule],
    }).compileComponents();

    fixture = TestBed.createComponent(FileAttachmentListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display file names and formatted sizes', () => {
    fixture.componentRef.setInput('files', mockFiles);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('test-model.stl');
    expect(compiled.textContent).toContain('print.gcode');
    expect(compiled.textContent).toContain('failed.obj');
    expect(compiled.textContent).toContain('1.0 MB');
    expect(compiled.textContent).toContain('512 B');
    expect(compiled.textContent).toContain('2.0 KB');
  });

  it('should emit download when download button clicked', () => {
    const uploadedFile: FileAttachmentItem = {
      id: 1,
      originalFileName: 'test.stl',
      sizeBytes: 100,
      contentType: 'model/stl',
      status: 'uploaded',
    };
    fixture.componentRef.setInput('files', [uploadedFile]);
    fixture.componentRef.setInput('canDownload', true);
    fixture.detectChanges();

    const spy = spyOn(component.download, 'emit');
    component.onDownload(uploadedFile);
    expect(spy).toHaveBeenCalledWith(uploadedFile);
  });

  it('should emit delete when delete button clicked', () => {
    const uploadedFile: FileAttachmentItem = {
      id: 1,
      originalFileName: 'test.stl',
      sizeBytes: 100,
      contentType: 'model/stl',
      status: 'uploaded',
    };
    fixture.componentRef.setInput('files', [uploadedFile]);
    fixture.componentRef.setInput('editable', true);
    fixture.detectChanges();

    const spy = spyOn(component.delete, 'emit');
    component.onDelete(uploadedFile);
    expect(spy).toHaveBeenCalledWith(uploadedFile);
  });

  it('should show progress bar for uploading files', () => {
    const uploadingFile: FileAttachmentItem = {
      originalFileName: 'uploading.gcode',
      sizeBytes: 1024,
      contentType: 'text/plain',
      status: 'uploading',
      uploadPercent: 60,
    };
    fixture.componentRef.setInput('files', [uploadingFile]);
    fixture.detectChanges();

    const progressBar = fixture.nativeElement.querySelector('mat-progress-bar');
    expect(progressBar).toBeTruthy();
  });

  it('should format file sizes correctly', () => {
    expect(component.formatSize(500)).toBe('500 B');
    expect(component.formatSize(1024)).toBe('1.0 KB');
    expect(component.formatSize(1048576)).toBe('1.0 MB');
    expect(component.formatSize(1073741824)).toBe('1.0 GB');
    expect(component.formatSize(2097152)).toBe('2.0 MB');
  });

  it('should show "No files attached" when files list is empty', () => {
    fixture.componentRef.setInput('files', []);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('No files attached');
  });

  it('should return correct icon for file types', () => {
    expect(component.getFileIcon('model.gcode')).toBe('code');
    expect(component.getFileIcon('model.stl')).toBe('view_in_ar');
    expect(component.getFileIcon('model.3mf')).toBe('view_in_ar');
    expect(component.getFileIcon('model.obj')).toBe('view_in_ar');
    expect(component.getFileIcon('document.pdf')).toBe('insert_drive_file');
  });
});
