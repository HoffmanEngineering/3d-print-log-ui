import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ToastrService } from 'ngx-toastr';
import { LoggingService } from 'src/app/core/services/logging.service';
import {
  MAX_TAGS_PER_PRINT,
  PrintTag,
} from 'src/app/core/services/print-tag.service';
import { environment } from 'src/environments/environment';
import { PrintTagEditorComponent } from './print-tag-editor.component';

describe('PrintTagEditorComponent', () => {
  let fixture: ComponentFixture<PrintTagEditorComponent>;
  let component: PrintTagEditorComponent;
  let httpMock: HttpTestingController;
  let toastr: jasmine.SpyObj<ToastrService>;
  let logging: jasmine.SpyObj<LoggingService>;
  let emitted: PrintTag[][];

  const api = environment.printLogApiUrl;
  const gifts: PrintTag = { id: 'g', name: 'Gifts', color: '#ff0000' };
  const cosplay: PrintTag = { id: 'c', name: 'Cosplay', color: null };
  const functional: PrintTag = { id: 'f', name: 'Functional', color: null };

  /** The real PrintTagService over HttpTestingController: the editor's contract is its HTTP. */
  async function create(printId: number | null, tags: PrintTag[] = []) {
    toastr = jasmine.createSpyObj<ToastrService>('ToastrService', [
      'error',
      'success',
    ]);
    logging = jasmine.createSpyObj<LoggingService>('LoggingService', [
      'logEvent',
      'logException',
    ]);
    await TestBed.configureTestingModule({
      imports: [PrintTagEditorComponent, NoopAnimationsModule],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ToastrService, useValue: toastr },
        { provide: LoggingService, useValue: logging },
      ],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(PrintTagEditorComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('printId', printId);
    fixture.componentRef.setInput('tags', tags);
    emitted = [];
    component.tagsChange.subscribe((t) => emitted.push(t));
    fixture.detectChanges();

    httpMock.expectOne(`${api}/api/Tags`).flush([cosplay, functional, gifts]);
    fixture.detectChanges();
  }

  afterEach(() => httpMock.verify());

  it('renders the print’s tags as removable chips', async () => {
    await create(1, [gifts]);

    const chips = fixture.nativeElement.querySelectorAll('mat-chip-row');
    expect(chips.length).toBe(1);
    expect(chips[0].textContent).toContain('Gifts');
  });

  it('suggests the user’s other tags matching what was typed, ignoring case', async () => {
    await create(1, [gifts]);

    component.query.set('FUN');

    expect(component.suggestions().map((t) => t.id)).toEqual(['f']);
    expect(component.canCreate()).toBeTrue();
  });

  it('does not offer to create a name the user already has', async () => {
    await create(1);

    component.query.set('  gifts ');

    expect(component.canCreate()).toBeFalse();
  });

  it('saves the whole set when a tag is added to a saved print', async () => {
    await create(7, [gifts]);

    component.add(cosplay);
    const put = httpMock.expectOne(`${api}/api/Prints/7/tags`);
    expect(put.request.body).toEqual({ tagIds: ['g', 'c'] });
    put.flush([cosplay, gifts]);

    expect(component.selected()).toEqual([cosplay, gifts]);
    expect(emitted).toEqual([[cosplay, gifts]]);
    expect(logging.logEvent).toHaveBeenCalledWith(
      'PrintTagEditor_TagsSaved',
      jasmine.objectContaining({ printId: 7, count: 2 })
    );
  });

  it('saves without the tag when one is removed', async () => {
    await create(7, [gifts, cosplay]);

    component.remove(gifts);
    const put = httpMock.expectOne(`${api}/api/Prints/7/tags`);
    expect(put.request.body).toEqual({ tagIds: ['c'] });
    put.flush([cosplay]);

    expect(component.selected()).toEqual([cosplay]);
  });

  it('creates a new tag and then adds it', async () => {
    await create(7);

    component.createAndAdd('  Spare parts ');
    const post = httpMock.expectOne(`${api}/api/Tags`);
    expect(post.request.method).toBe('POST');
    expect(post.request.body).toEqual({ name: 'Spare parts', color: null });
    const spare: PrintTag = { id: 's', name: 'Spare parts', color: null };
    post.flush(spare);

    httpMock.expectOne(`${api}/api/Prints/7/tags`).flush([spare]);

    expect(component.selected()).toEqual([spare]);
    expect(component.allTags()).toContain(spare);
    expect(logging.logEvent).toHaveBeenCalledWith(
      'PrintTagEditor_TagCreated',
      jasmine.any(Object)
    );
  });

  it('sends one save at a time, and then only the latest set', async () => {
    await create(7);

    component.add(gifts);
    component.add(cosplay);
    component.add(functional);

    // One request in flight; the two later changes wait and are coalesced.
    const first = httpMock.match(`${api}/api/Prints/7/tags`);
    expect(first.length).toBe(1);
    expect(first[0].request.body).toEqual({ tagIds: ['g'] });
    expect(component.selected().map((t) => t.id)).toEqual(['g', 'c', 'f']);
    first[0].flush([gifts]);

    const second = httpMock.expectOne(`${api}/api/Prints/7/tags`);
    expect(second.request.body).toEqual({ tagIds: ['g', 'c', 'f'] });
    // The first response must not have overwritten the newer selection.
    expect(component.selected().map((t) => t.id)).toEqual(['g', 'c', 'f']);
    second.flush([cosplay, functional, gifts]);

    expect(component.selected()).toEqual([cosplay, functional, gifts]);
    expect(emitted).toEqual([[cosplay, functional, gifts]]);
  });

  it('keeps the input usable while a save is in flight', async () => {
    await create(7);

    component.add(gifts);
    fixture.detectChanges();

    const input: HTMLInputElement =
      fixture.nativeElement.querySelector('input');
    expect(input.disabled).toBeFalse();
    httpMock.expectOne(`${api}/api/Prints/7/tags`).flush([gifts]);
  });

  it('goes back to the last saved tags when a queued save fails', async () => {
    await create(7, [gifts]);

    component.add(cosplay);
    component.remove(gifts);
    httpMock.expectOne(`${api}/api/Prints/7/tags`).flush([cosplay, gifts]);
    httpMock
      .expectOne(`${api}/api/Prints/7/tags`)
      .flush('nope', { status: 500, statusText: 'Server Error' });

    expect(component.selected()).toEqual([cosplay, gifts]);
    expect(toastr.error).toHaveBeenCalled();
  });

  it('puts the old tags back and says so when the save fails', async () => {
    await create(7, [gifts]);

    component.add(cosplay);
    httpMock
      .expectOne(`${api}/api/Prints/7/tags`)
      .flush('nope', { status: 500, statusText: 'Server Error' });

    expect(component.selected()).toEqual([gifts]);
    expect(toastr.error).toHaveBeenCalled();
    expect(emitted).toEqual([]);
  });

  it('only reports the selection for a print that is not saved yet', async () => {
    await create(null);

    component.add(gifts);

    httpMock.expectNone(`${api}/api/Prints/null/tags`);
    expect(component.selected()).toEqual([gifts]);
    expect(emitted).toEqual([[gifts]]);
  });

  it('stops offering tags at the per-print limit', async () => {
    const many = Array.from({ length: MAX_TAGS_PER_PRINT }, (_, i) => ({
      id: `t${i}`,
      name: `Tag ${i}`,
      color: null,
    }));
    await create(null, many);

    expect(component.atLimit()).toBeTrue();
    const input: HTMLInputElement =
      fixture.nativeElement.querySelector('input');
    expect(input.disabled).toBeTrue();
  });
});
