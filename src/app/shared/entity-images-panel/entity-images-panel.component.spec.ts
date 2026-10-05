import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

import { HttpClient } from '@angular/common/http';
import { ImageThumbnailStripComponent } from 'src/app/shared/image-thumbnail-strip/image-thumbnail-strip.component';
import { DeferredSkeletonController } from 'src/app/shared/skeleton/deferred-skeleton';
import { environment } from 'src/environments/environment';
import { EntityImage, EntityImageTarget } from './entity-image-gateway';
import {
  EntityImagesPanelComponent,
  EntityImageValue,
  UploadResult,
} from './entity-images-panel.component';

describe('EntityImagesPanelComponent', () => {
  let component: EntityImagesPanelComponent;
  let fixture: ComponentFixture<EntityImagesPanelComponent>;
  let httpMock: HttpTestingController;

  const api = environment.printLogApiUrl;
  const ENTITY_ID = 'abc-123';

  /**
   * A gateway over a deliberately fictional entity. The panel is shared, so its spec must
   * not depend on any one feature service; the real URL shapes are covered by each
   * service's own gateway spec.
   */
  const testGateway = (http: HttpClient): EntityImageTarget<string> => ({
    id: ENTITY_ID,
    gateway: {
      upload: (entityId, file) => {
        const formData = new FormData();
        formData.append('file', file, file.name);
        return http.post<EntityImage>(
          `${api}/api/TestEntities/${entityId}/images`,
          formData
        );
      },
      delete: (entityId, imageId) =>
        http.delete<void>(
          `${api}/api/TestEntities/${entityId}/images/${imageId}`
        ),
      reorder: (entityId, ids) =>
        http.put<void>(
          `${api}/api/TestEntities/${entityId}/images/reorder`,
          ids
        ),
      setDefault: (entityId, imageId) =>
        http.post<void>(
          `${api}/api/TestEntities/${entityId}/images/${imageId}/set-as-default`,
          {}
        ),
    },
  });

  const aFile = (name = 'spool.png') =>
    new File(['x'], name, { type: 'image/png' });

  const storedImage = (id: number, displayOrder = 0): EntityImageValue => ({
    id,
    url: `https://blob.example.com/${id}.jpg?sig=x`,
    thumbnailUrl: `https://blob.example.com/${id}-thumb.webp?sig=x`,
    isDefault: displayOrder === 0,
    displayOrder,
  });

  /** Reaches past `protected` the way the template does. */
  const inner = () =>
    component as unknown as {
      items: () => EntityImageValue[];
      actionError: () => string | null;
      rejectedCount: () => number;
      precheckRejection: () => string | null;
      permanentFailedFiles: () => File[];
      uploading: () => boolean;
      onFilesSelected: (event: Event) => void;
      onImageDeleted: (image: EntityImageValue) => void;
      onDefaultChanged: (image: EntityImageValue) => void;
      onRetryClick: () => void;
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
      imports: [EntityImagesPanelComponent, NoopAnimationsModule],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);

    fixture = TestBed.createComponent(EntityImagesPanelComponent);
    component = fixture.componentInstance;
    // `target` is required and carries the ID, so it is set before the first render.
    // Tests that need the create-route behavior clear the ID explicitly.
    fixture.componentRef.setInput('target', {
      ...testGateway(TestBed.inject(HttpClient)),
      id: null,
    });
    fixture.detectChanges();
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('add affordances', () => {
    const fileInputs = () =>
      fixture.debugElement
        .queryAll(By.css('input[type="file"]'))
        .map((el) => el.nativeElement as HTMLInputElement);

    const clickAddPhoto = () => {
      const button = fixture.debugElement.query(By.css('button'))
        .nativeElement as HTMLButtonElement;
      button.click();
    };

    const clickStripAdd = () => {
      fixture.debugElement
        .query(By.directive(ImageThumbnailStripComponent))
        .componentInstance.addClicked.emit();
    };

    const setCordova = (value: boolean) => {
      (component as unknown as { isCordova: boolean }).isCordova = value;
      fixture.detectChanges();
    };

    it('offers a camera-capture input alongside the gallery input', () => {
      const [gallery, camera] = fileInputs();

      expect(gallery.hasAttribute('capture')).toBeFalse();
      expect(camera.getAttribute('capture')).toBe('environment');
    });

    it('opens the gallery input from both add affordances in the browser', () => {
      setCordova(false);
      const [gallery, camera] = fileInputs();
      spyOn(gallery, 'click');
      spyOn(camera, 'click');

      clickAddPhoto();
      clickStripAdd();

      expect(gallery.click).toHaveBeenCalledTimes(2);
      expect(camera.click).not.toHaveBeenCalled();
    });

    it('opens the capture input from both add affordances inside the app', () => {
      setCordova(true);
      const [gallery, camera] = fileInputs();
      spyOn(gallery, 'click');
      spyOn(camera, 'click');

      clickAddPhoto();
      clickStripAdd();

      expect(camera.click).toHaveBeenCalledTimes(2);
      expect(gallery.click).not.toHaveBeenCalled();
    });
  });

  it('stages picked files and issues no HTTP request until the target has an id', () => {
    pickFiles(aFile());

    expect(inner().items().length).toBe(1);
    expect(component.hasStagedImages()).toBeTrue();
    httpMock.expectNone(() => true);
  });

  it('clears hasStagedImages after a successful upload', () => {
    pickFiles(aFile());
    expect(component.hasStagedImages()).toBeTrue();

    component.uploadStagedImages(ENTITY_ID).subscribe();
    httpMock.expectOne(`${api}/api/TestEntities/${ENTITY_ID}/images`).flush({
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

    let result: UploadResult | undefined;
    component.uploadStagedImages(ENTITY_ID).subscribe((r) => (result = r));

    const requests = () =>
      httpMock.match(`${api}/api/TestEntities/${ENTITY_ID}/images`);

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

    expect(result!.transientFailures).toEqual([bad]);
    expect(result!.allSucceeded).toBeFalse();
    expect(component.hasStagedImages()).toBeTrue();
  });

  it('retries only the previously failed files', () => {
    const good = aFile('good.png');
    const bad = aFile('bad.png');
    pickFiles(good, bad);

    component.uploadStagedImages(ENTITY_ID).subscribe();
    const url = `${api}/api/TestEntities/${ENTITY_ID}/images`;
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

    let result: UploadResult | undefined;
    component.retryFailedUploads(ENTITY_ID).subscribe((r) => (result = r));

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
    expect(result!.transientFailures).toEqual([]);
    expect(result!.allSucceeded).toBeTrue();
    expect(component.hasStagedImages()).toBeFalse();
  });

  it('deletes a stored image through the API and drops it from the list', () => {
    fixture.componentRef.setInput(
      'target',
      testGateway(TestBed.inject(HttpClient))
    );
    fixture.componentRef.setInput('images', [
      storedImage(1),
      storedImage(2, 1),
    ]);
    fixture.detectChanges();

    inner().onImageDeleted(inner().items()[0]);
    httpMock
      .expectOne(`${api}/api/TestEntities/${ENTITY_ID}/images/1`)
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
    fixture.componentRef.setInput(
      'target',
      testGateway(TestBed.inject(HttpClient))
    );
    fixture.componentRef.setInput('images', [
      storedImage(1),
      storedImage(2, 1),
    ]);
    fixture.detectChanges();
    pickFiles(aFile());

    inner().onImagesReordered({ previousIndex: 1, currentIndex: 0 });

    // A partial list of IDs is a 400 at the endpoint.
    expect(
      httpMock.match(`${api}/api/TestEntities/${ENTITY_ID}/images/reorder`)
        .length
    ).toBe(0);
  });

  it('sends the complete ordered id list once every item is persisted', () => {
    fixture.componentRef.setInput(
      'target',
      testGateway(TestBed.inject(HttpClient))
    );
    fixture.componentRef.setInput('images', [
      storedImage(1),
      storedImage(2, 1),
    ]);
    fixture.detectChanges();

    inner().onImagesReordered({ previousIndex: 1, currentIndex: 0 });

    const req = httpMock.expectOne(
      `${api}/api/TestEntities/${ENTITY_ID}/images/reorder`
    );
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual([2, 1]);
    req.flush({});
  });

  it('still adopts the uploaded image when route data refreshes mid-upload', () => {
    // Creating a material navigates to its new ID, so the resolver can push new
    // `images` while the very first POST is still in flight. That rebuilds every
    // item object, which is why staged items are matched by key, not by `===`.
    pickFiles(aFile('a.png'), aFile('b.png'));
    component.uploadStagedImages(ENTITY_ID).subscribe();

    const url = `${api}/api/TestEntities/${ENTITY_ID}/images`;
    httpMock.match(url)[0].flush({
      id: 1,
      url: 'u1',
      thumbnailUrl: 't1',
      isDefault: true,
      displayOrder: 0,
    });

    // The resolver lands, carrying the image the first POST just created.
    fixture.componentRef.setInput(
      'target',
      testGateway(TestBed.inject(HttpClient))
    );
    fixture.componentRef.setInput('images', [storedImage(1)]);
    fixture.detectChanges();

    httpMock.match(url)[0].flush({
      id: 2,
      url: 'u2',
      thumbnailUrl: 't2',
      isDefault: false,
      displayOrder: 1,
    });

    expect(component.hasStagedImages()).toBeFalse();
    expect(
      inner()
        .items()
        .map((i) => i.id)
    ).toEqual([1, 2]);
  });

  it('sends the default a user picked while the image was still staged', () => {
    pickFiles(aFile('a.png'), aFile('b.png'));
    const second = inner().items()[1];
    inner().onDefaultChanged(second);
    expect(inner().items()[1].isDefault).toBeTrue();

    component.uploadStagedImages(ENTITY_ID).subscribe();
    const url = `${api}/api/TestEntities/${ENTITY_ID}/images`;
    // The API defaults to the first image it stores, which is not the pick.
    httpMock.match(url)[0].flush({
      id: 1,
      url: 'u1',
      thumbnailUrl: 't1',
      isDefault: true,
      displayOrder: 0,
    });
    httpMock.match(url)[0].flush({
      id: 2,
      url: 'u2',
      thumbnailUrl: 't2',
      isDefault: false,
      displayOrder: 1,
    });

    httpMock
      .expectOne(`${api}/api/TestEntities/${ENTITY_ID}/images/2/set-as-default`)
      .flush({});

    expect(
      inner()
        .items()
        .map((i) => i.isDefault)
    ).toEqual([false, true]);
  });

  it('does not re-send a default the API already assigned', () => {
    pickFiles(aFile('a.png'));
    component.uploadStagedImages(ENTITY_ID).subscribe();
    httpMock.expectOne(`${api}/api/TestEntities/${ENTITY_ID}/images`).flush({
      id: 1,
      url: 'u1',
      thumbnailUrl: 't1',
      isDefault: true,
      displayOrder: 0,
    });

    httpMock.expectNone(
      `${api}/api/TestEntities/${ENTITY_ID}/images/1/set-as-default`
    );
  });

  it('ignores a second retry click while the first is still uploading', () => {
    pickFiles(aFile('bad.png'));
    component.uploadStagedImages(ENTITY_ID).subscribe();
    const url = `${api}/api/TestEntities/${ENTITY_ID}/images`;
    httpMock
      .match(url)[0]
      .flush('nope', { status: 500, statusText: 'Server Error' });

    fixture.componentRef.setInput(
      'target',
      testGateway(TestBed.inject(HttpClient))
    );
    fixture.detectChanges();

    inner().onRetryClick();
    // A double-click can land before the disabled attribute is painted; without
    // the guard this POSTs the same file twice and stores a duplicate.
    inner().onRetryClick();

    const retries = httpMock.match(url);
    expect(retries.length).toBe(1);
    retries[0].flush({
      id: 9,
      url: 'u',
      thumbnailUrl: 't',
      isDefault: true,
      displayOrder: 0,
    });
    expect(inner().uploading()).toBeFalse();
  });

  it('rolls back and reports the order when the reorder request fails', () => {
    fixture.componentRef.setInput(
      'target',
      testGateway(TestBed.inject(HttpClient))
    );
    fixture.componentRef.setInput('images', [
      storedImage(1),
      storedImage(2, 1),
    ]);
    fixture.detectChanges();

    inner().onImagesReordered({ previousIndex: 1, currentIndex: 0 });
    expect(
      inner()
        .items()
        .map((i) => i.id)
    ).toEqual([2, 1]);

    httpMock
      .expectOne(`${api}/api/TestEntities/${ENTITY_ID}/images/reorder`)
      .flush('nope', { status: 500, statusText: 'Server Error' });

    expect(
      inner()
        .items()
        .map((i) => i.id)
    ).toEqual([1, 2]);
    expect(inner().actionError()).toContain('order');
  });

  it('reports a failed delete and keeps the image in the list', () => {
    fixture.componentRef.setInput(
      'target',
      testGateway(TestBed.inject(HttpClient))
    );
    fixture.componentRef.setInput('images', [storedImage(1)]);
    fixture.detectChanges();

    inner().onImageDeleted(inner().items()[0]);
    httpMock
      .expectOne(`${api}/api/TestEntities/${ENTITY_ID}/images/1`)
      .flush('nope', { status: 500, statusText: 'Server Error' });

    expect(inner().items().length).toBe(1);
    expect(inner().actionError()).toBeTruthy();
  });

  it('stages no more than maxImages and reports what it dropped', () => {
    fixture.componentRef.setInput('maxImages', 2);
    fixture.detectChanges();

    pickFiles(aFile('a.png'), aFile('b.png'), aFile('c.png'));

    expect(inner().items().length).toBe(2);
    expect(inner().rejectedCount()).toBe(1);
    httpMock.expectNone(() => true);
  });

  it('abandons an in-flight delete when the panel is destroyed', () => {
    fixture.componentRef.setInput(
      'target',
      testGateway(TestBed.inject(HttpClient))
    );
    fixture.componentRef.setInput('images', [storedImage(1)]);
    fixture.detectChanges();

    inner().onImageDeleted(inner().items()[0]);
    const request = httpMock.expectOne(
      `${api}/api/TestEntities/${ENTITY_ID}/images/1`
    );

    fixture.destroy();

    // Without `takeUntilDestroyed` the request keeps the torn-down panel alive
    // and later writes to its signals.
    expect(request.cancelled).toBeTrue();
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

  describe('upload precheck and failure classification', () => {
    const rejectionText = () =>
      fixture.debugElement
        .queryAll(By.css('.upload-failures'))
        .map((el) => (el.nativeElement as HTMLElement).textContent ?? '')
        .join(' ');

    const retryButton = () =>
      fixture.debugElement
        .queryAll(By.css('.upload-failures button'))
        .find((el) =>
          ((el.nativeElement as HTMLElement).textContent ?? '').includes(
            'Retry'
          )
        ) ?? null;

    const flushUpload = (status: number) =>
      httpMock
        .expectOne(`${api}/api/TestEntities/${ENTITY_ID}/images`)
        .flush('nope', { status, statusText: 'Rejected' });

    it('rejects an oversized file before uploading it', () => {
      pickFiles(
        new File([new ArrayBuffer(11 * 1024 * 1024)], 'big.jpg', {
          type: 'image/jpeg',
        })
      );

      expect(inner().items().length).toBe(0);
      httpMock.expectNone(`${api}/api/TestEntities/${ENTITY_ID}/images`);
      expect(rejectionText()).toContain('10MB');
    });

    it('rejects a file whose type the API cannot decode', () => {
      pickFiles(new File(['x'], 'clip.gif', { type: 'image/gif' }));

      expect(inner().items().length).toBe(0);
      expect(rejectionText()).toContain('clip.gif');
    });

    it('reports a 400 as permanent and offers no retry', () => {
      pickFiles(aFile());

      let result: UploadResult | undefined;
      component.uploadStagedImages(ENTITY_ID).subscribe((r) => (result = r));
      flushUpload(400);
      fixture.detectChanges();

      expect(result!.permanentFailures.length).toBe(1);
      expect(result!.transientFailures).toEqual([]);
      expect(result!.allSucceeded).toBeFalse();
      expect(retryButton()).toBeNull();
      expect(rejectionText()).toContain('cannot be uploaded');
    });

    it('reports a 500 as transient and offers retry', () => {
      pickFiles(aFile());

      let result: UploadResult | undefined;
      component.uploadStagedImages(ENTITY_ID).subscribe((r) => (result = r));
      flushUpload(500);
      fixture.detectChanges();

      expect(result!.transientFailures.length).toBe(1);
      expect(result!.permanentFailures).toEqual([]);
      expect(retryButton()).not.toBeNull();
    });

    it('reports allSucceeded when there was nothing staged', () => {
      let result: UploadResult | undefined;
      component.uploadStagedImages(ENTITY_ID).subscribe((r) => (result = r));

      expect(result!.allSucceeded).toBeTrue();
    });
  });

  describe('deferred writes are part of the upload result', () => {
    const url = `${api}/api/TestEntities/${ENTITY_ID}/images`;

    const uploaded = (id: number, isDefault: boolean) => ({
      id,
      url: `u${id}`,
      thumbnailUrl: `t${id}`,
      isDefault,
      displayOrder: id - 1,
    });

    // The caller navigates away the instant this emits. Reported before the set-default
    // landed, that navigation destroyed the panel and cancelled the request, so the photo
    // the user starred silently stayed un-starred.
    it('does not report success until a staged default has been written', () => {
      pickFiles(aFile('one.png'), aFile('two.png'));
      // Star the second, which has no server-side id yet.
      inner().onDefaultChanged(inner().items()[1]);

      let result: UploadResult | undefined;
      component.uploadStagedImages(ENTITY_ID).subscribe((r) => (result = r));

      httpMock.match(url)[0].flush(uploaded(1, true));
      httpMock.match(url)[0].flush(uploaded(2, false));

      // The uploads are done, but the star has not been sent yet.
      expect(result).toBeUndefined();

      httpMock
        .expectOne(
          `${api}/api/TestEntities/${ENTITY_ID}/images/2/set-as-default`
        )
        .flush(null);

      expect(result!.allSucceeded).toBeTrue();
      expect(inner().items()[1].isDefault).toBeTrue();
    });

    it('does not report success until a pending reorder has been written', () => {
      pickFiles(aFile('one.png'), aFile('two.png'));
      // Reordering while items are still staged cannot be sent, so it is held.
      inner().onImagesReordered({ previousIndex: 1, currentIndex: 0 });

      let result: UploadResult | undefined;
      component.uploadStagedImages(ENTITY_ID).subscribe((r) => (result = r));

      // After the drag, two.png uploads first. one.png carries the star, and the server
      // reports it as already default, so no set-default is queued and this test isolates
      // the reorder.
      httpMock.match(url)[0].flush(uploaded(1, false));
      httpMock.match(url)[0].flush(uploaded(2, true));

      expect(result).toBeUndefined();

      httpMock
        .expectOne(`${api}/api/TestEntities/${ENTITY_ID}/images/reorder`)
        .flush(null);

      expect(result!.allSucceeded).toBeTrue();
    });

    it('still reports success when a deferred write fails', () => {
      pickFiles(aFile('one.png'), aFile('two.png'));
      inner().onDefaultChanged(inner().items()[1]);

      let result: UploadResult | undefined;
      component.uploadStagedImages(ENTITY_ID).subscribe((r) => (result = r));

      httpMock.match(url)[0].flush(uploaded(1, true));
      httpMock.match(url)[0].flush(uploaded(2, false));
      httpMock
        .expectOne(
          `${api}/api/TestEntities/${ENTITY_ID}/images/2/set-as-default`
        )
        .flush(null, { status: 500, statusText: 'Server Error' });
      fixture.detectChanges();

      // The photos ARE saved; only the star is not. Blocking the save on that would
      // strand the user on a page whose work is already committed.
      expect(result!.allSucceeded).toBeTrue();
      expect(inner().actionError()).toContain('default');
    });
  });

  describe('permanently rejected files', () => {
    const url = `${api}/api/TestEntities/${ENTITY_ID}/images`;

    // The panel hides its own Retry button for these, but the parent Save button calls
    // uploadStagedImages directly - which used to re-post bytes already known to fail.
    it('does not re-post a file the API already refused', () => {
      pickFiles(aFile());
      component.uploadStagedImages(ENTITY_ID).subscribe();
      httpMock
        .expectOne(url)
        .flush('nope', { status: 400, statusText: 'Bad Request' });

      let result: UploadResult | undefined;
      component.uploadStagedImages(ENTITY_ID).subscribe((r) => (result = r));

      httpMock.expectNone(url);
      // Not re-posted, but still not a success: the caller must not navigate away and
      // leave the user with no way to see what was dropped.
      expect(result!.permanentFailures.length).toBe(1);
      expect(result!.allSucceeded).toBeFalse();
    });

    it('saves cleanly once the rejected file is removed', () => {
      pickFiles(aFile());
      component.uploadStagedImages(ENTITY_ID).subscribe();
      httpMock
        .expectOne(url)
        .flush('nope', { status: 400, statusText: 'Bad Request' });

      inner().onImageDeleted(inner().items()[0]);

      let result: UploadResult | undefined;
      component.uploadStagedImages(ENTITY_ID).subscribe((r) => (result = r));

      httpMock.expectNone(url);
      expect(result!.allSucceeded).toBeTrue();
    });
  });
});
