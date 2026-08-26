import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

import { FilamentService } from 'src/app/core/services/filament.service';
import { DeferredSkeletonController } from 'src/app/shared/skeleton/deferred-skeleton';
import { environment } from 'src/environments/environment';
import {
  FilamentImagesPanelComponent,
  FilamentImageValue,
} from './filament-images-panel.component';

describe('FilamentImagesPanelComponent', () => {
  let component: FilamentImagesPanelComponent;
  let fixture: ComponentFixture<FilamentImagesPanelComponent>;
  let httpMock: HttpTestingController;

  const api = environment.printLogApiUrl;
  const FILAMENT_ID = 'abc-123';

  const aFile = (name = 'spool.png') =>
    new File(['x'], name, { type: 'image/png' });

  const storedImage = (id: number, displayOrder = 0): FilamentImageValue => ({
    id,
    url: `https://blob.example.com/${id}.jpg?sig=x`,
    thumbnailUrl: `https://blob.example.com/${id}-thumb.webp?sig=x`,
    isDefault: displayOrder === 0,
    displayOrder,
  });

  /** Reaches past `protected` the way the template does. */
  const inner = () =>
    component as unknown as {
      items: () => FilamentImageValue[];
      onFilesSelected: (event: Event) => void;
      onImageDeleted: (image: FilamentImageValue) => void;
      onImagesReordered: (change: {
        previousIndex: number;
        currentIndex: number;
      }) => void;
    };

  const pickFiles = (...files: File[]) => {
    const dataTransfer = new DataTransfer();
    files.forEach((file) => dataTransfer.items.add(file));
    const input = document.createElement('input');
    input.type = 'file';
    input.files = dataTransfer.files;
    inner().onFilesSelected({ target: input } as unknown as Event);
    fixture.detectChanges();
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FilamentImagesPanelComponent, NoopAnimationsModule],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        FilamentService,
      ],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);

    fixture = TestBed.createComponent(FilamentImagesPanelComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('stages picked files and issues no HTTP request when there is no filamentId', () => {
    pickFiles(aFile());

    expect(inner().items().length).toBe(1);
    expect(component.hasStagedImages()).toBeTrue();
    httpMock.expectNone(() => true);
  });

  it('clears hasStagedImages after a successful upload', () => {
    pickFiles(aFile());
    expect(component.hasStagedImages()).toBeTrue();

    component.uploadStagedImages(FILAMENT_ID).subscribe();
    httpMock
      .expectOne(`${api}/api/Filaments/${FILAMENT_ID}/images`)
      .flush({
        id: 7,
        url: 'u',
        thumbnailUrl: 't',
        isDefault: true,
        displayOrder: 0,
      });

    expect(component.hasStagedImages()).toBeFalse();
    expect(inner().items()[0].id).toBe(7);
  });

  it('posts one request per staged file and reports the failures', () => {
    const good = aFile('good.png');
    const bad = aFile('bad.png');
    pickFiles(good, bad);

    let result: { failed: File[] } | undefined;
    component.uploadStagedImages(FILAMENT_ID).subscribe((r) => (result = r));

    const requests = () =>
      httpMock.match(`${api}/api/Filaments/${FILAMENT_ID}/images`);

    // Uploads run in sequence, so the second is issued only after the first
    // settles.
    requests()[0].flush({
      id: 1,
      url: 'u',
      thumbnailUrl: 't',
      isDefault: true,
      displayOrder: 0,
    });
    requests()[0].flush('nope', { status: 500, statusText: 'Server Error' });

    expect(result!.failed).toEqual([bad]);
    expect(component.hasStagedImages()).toBeTrue();
  });

  it('retries only the previously failed files', () => {
    const good = aFile('good.png');
    const bad = aFile('bad.png');
    pickFiles(good, bad);

    component.uploadStagedImages(FILAMENT_ID).subscribe();
    const url = `${api}/api/Filaments/${FILAMENT_ID}/images`;
    httpMock.match(url)[0].flush({
      id: 1,
      url: 'u',
      thumbnailUrl: 't',
      isDefault: true,
      displayOrder: 0,
    });
    httpMock
      .match(url)[0]
      .flush('nope', { status: 500, statusText: 'Server Error' });

    let result: { failed: File[] } | undefined;
    component.retryFailedUploads(FILAMENT_ID).subscribe((r) => (result = r));

    const retried = httpMock.match(url);
    expect(retried.length).toBe(1);
    expect(
      ((retried[0].request.body as FormData).get('file') as File).name
    ).toBe(bad.name);

    retried[0].flush({
      id: 2,
      url: 'u2',
      thumbnailUrl: 't2',
      isDefault: false,
      displayOrder: 1,
    });
    expect(result!.failed).toEqual([]);
    expect(component.hasStagedImages()).toBeFalse();
  });

  it('deletes a stored image through the API and drops it from the list', () => {
    fixture.componentRef.setInput('filamentId', FILAMENT_ID);
    fixture.componentRef.setInput('images', [
      storedImage(1),
      storedImage(2, 1),
    ]);
    fixture.detectChanges();

    inner().onImageDeleted(inner().items()[0]);
    httpMock
      .expectOne(`${api}/api/Filaments/${FILAMENT_ID}/images/1`)
      .flush(null);
    fixture.detectChanges();

    expect(
      inner()
        .items()
        .map((i) => i.id)
    ).toEqual([2]);
  });

  it('revokes the object URL when a staged image is deleted', () => {
    const revoke = spyOn(URL, 'revokeObjectURL');
    pickFiles(aFile());
    const staged = inner().items()[0];

    inner().onImageDeleted(staged);

    expect(revoke).toHaveBeenCalledWith(staged.url!);
    expect(inner().items().length).toBe(0);
    httpMock.expectNone(() => true);
  });

  it('sends no reorder request while any item is still staged', () => {
    fixture.componentRef.setInput('filamentId', FILAMENT_ID);
    fixture.componentRef.setInput('images', [
      storedImage(1),
      storedImage(2, 1),
    ]);
    fixture.detectChanges();
    pickFiles(aFile());

    inner().onImagesReordered({ previousIndex: 1, currentIndex: 0 });

    // A partial list of IDs is a 400 at the endpoint.
    expect(
      httpMock.match(`${api}/api/Filaments/${FILAMENT_ID}/images/reorder`)
        .length
    ).toBe(0);
  });

  it('sends the complete ordered id list once every item is persisted', () => {
    fixture.componentRef.setInput('filamentId', FILAMENT_ID);
    fixture.componentRef.setInput('images', [
      storedImage(1),
      storedImage(2, 1),
    ]);
    fixture.detectChanges();

    inner().onImagesReordered({ previousIndex: 1, currentIndex: 0 });

    const req = httpMock.expectOne(
      `${api}/api/Filaments/${FILAMENT_ID}/images/reorder`
    );
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual([2, 1]);
    req.flush({});
  });

  it('revokes every outstanding object URL on destroy', () => {
    pickFiles(aFile('a.png'), aFile('b.png'));
    const urls = inner()
      .items()
      .map((i) => i.url!);
    const revoke = spyOn(URL, 'revokeObjectURL');
    // Its contract requires teardown; without it the show/hide timers outlive
    // the component.
    const destroy = spyOn(
      DeferredSkeletonController.prototype,
      'destroy'
    ).and.callThrough();

    fixture.destroy();

    expect(revoke).toHaveBeenCalledWith(urls[0]);
    expect(revoke).toHaveBeenCalledWith(urls[1]);
    expect(destroy).toHaveBeenCalled();
  });
});
