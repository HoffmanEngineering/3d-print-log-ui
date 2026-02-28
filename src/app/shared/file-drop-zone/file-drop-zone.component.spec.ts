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
    const file = new File(['content'], 'test.gcode', {
      type: 'application/octet-stream',
    });
    const spy = spyOn(component.filesSelected, 'emit');

    const mockFileList = {
      0: file,
      length: 1,
      item: (index: number) => (index === 0 ? file : null),
      [Symbol.iterator]: function* () {
        yield file;
      },
    } as unknown as FileList;

    const event = new DragEvent('drop');
    Object.defineProperty(event, 'preventDefault', {
      value: jasmine.createSpy(),
    });
    Object.defineProperty(event, 'stopPropagation', {
      value: jasmine.createSpy(),
    });
    Object.defineProperty(event, 'dataTransfer', {
      value: { files: mockFileList },
    });

    component.onDrop(event);
    expect(spy).toHaveBeenCalledWith([file]);
  });

  it('should show drag-over state', () => {
    const event = new DragEvent('dragover');
    Object.defineProperty(event, 'preventDefault', {
      value: jasmine.createSpy(),
    });
    Object.defineProperty(event, 'stopPropagation', {
      value: jasmine.createSpy(),
    });
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

  it('should NOT set drag-over state when disabled', () => {
    fixture.componentRef.setInput('disabled', true);
    fixture.detectChanges();

    const event = new DragEvent('dragover');
    Object.defineProperty(event, 'preventDefault', {
      value: jasmine.createSpy(),
    });
    Object.defineProperty(event, 'stopPropagation', {
      value: jasmine.createSpy(),
    });
    component.onDragOver(event);
    expect(component.isDragOver()).toBe(false);
  });

  it('should NOT emit when disabled and files are dropped', () => {
    fixture.componentRef.setInput('disabled', true);
    fixture.detectChanges();

    const file = new File(['content'], 'test.gcode', {
      type: 'application/octet-stream',
    });
    const spy = spyOn(component.filesSelected, 'emit');

    const mockFileList = {
      0: file,
      length: 1,
      item: (index: number) => (index === 0 ? file : null),
      [Symbol.iterator]: function* () {
        yield file;
      },
    } as unknown as FileList;

    const event = new DragEvent('drop');
    Object.defineProperty(event, 'preventDefault', {
      value: jasmine.createSpy(),
    });
    Object.defineProperty(event, 'stopPropagation', {
      value: jasmine.createSpy(),
    });
    Object.defineProperty(event, 'dataTransfer', {
      value: { files: mockFileList },
    });

    component.onDrop(event);
    expect(spy).not.toHaveBeenCalled();
  });

  it('should emit files via onFileInputChange', () => {
    const file = new File(['content'], 'model.stl', {
      type: 'application/octet-stream',
    });
    const spy = spyOn(component.filesSelected, 'emit');

    const mockFileList = {
      0: file,
      length: 1,
      item: (index: number) => (index === 0 ? file : null),
      [Symbol.iterator]: function* () {
        yield file;
      },
    } as unknown as FileList;

    const mockInput = {
      files: mockFileList,
      value: '',
    } as unknown as HTMLInputElement;

    const event = { target: mockInput } as unknown as Event;
    component.onFileInputChange(event);
    expect(spy).toHaveBeenCalledWith([file]);
  });

  it('should NOT emit via onFileInputChange when no files selected', () => {
    const spy = spyOn(component.filesSelected, 'emit');

    const mockInput = {
      files: null,
      value: '',
    } as unknown as HTMLInputElement;

    const event = { target: mockInput } as unknown as Event;
    component.onFileInputChange(event);
    expect(spy).not.toHaveBeenCalled();
  });

  it('should NOT emit when drop has no files', () => {
    const spy = spyOn(component.filesSelected, 'emit');

    const mockFileList = {
      length: 0,
      item: () => null,
      [Symbol.iterator]: function* () {},
    } as unknown as FileList;

    const event = new DragEvent('drop');
    Object.defineProperty(event, 'preventDefault', {
      value: jasmine.createSpy(),
    });
    Object.defineProperty(event, 'stopPropagation', {
      value: jasmine.createSpy(),
    });
    Object.defineProperty(event, 'dataTransfer', {
      value: { files: mockFileList },
    });

    component.onDrop(event);
    expect(spy).not.toHaveBeenCalled();
  });

  it('should keep isDragOver true after entering a child element (dragenter twice, dragleave once)', () => {
    const enterEvent = new DragEvent('dragenter');
    Object.defineProperty(enterEvent, 'preventDefault', {
      value: jasmine.createSpy(),
    });

    component.onDragEnter(enterEvent);
    component.onDragEnter(enterEvent);
    component.onDragLeave();

    expect(component.isDragOver()).toBe(true);
  });

  it('should NOT emit when a file with a disallowed extension is dropped', () => {
    fixture.componentRef.setInput('acceptExtensions', ['.gcode', '.stl']);
    fixture.detectChanges();

    const spy = spyOn(component.filesSelected, 'emit');

    const file = new File(['content'], 'document.pdf', {
      type: 'application/pdf',
    });
    const mockFileList = {
      0: file,
      length: 1,
      item: (index: number) => (index === 0 ? file : null),
      [Symbol.iterator]: function* () {
        yield file;
      },
    } as unknown as FileList;

    const event = new DragEvent('drop');
    Object.defineProperty(event, 'preventDefault', {
      value: jasmine.createSpy(),
    });
    Object.defineProperty(event, 'stopPropagation', {
      value: jasmine.createSpy(),
    });
    Object.defineProperty(event, 'dataTransfer', {
      value: { files: mockFileList },
    });

    component.onDrop(event);
    expect(spy).not.toHaveBeenCalled();
  });
});
