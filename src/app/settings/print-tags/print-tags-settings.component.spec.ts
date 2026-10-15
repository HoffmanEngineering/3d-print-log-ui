import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { of } from 'rxjs';
import { LoggingService } from 'src/app/core/services/logging.service';
import { SimpleDialogData } from 'src/app/shared/simple-dialog/simple-dialog.component';
import { environment } from 'src/environments/environment';
import { PrintTagsSettingsComponent } from './print-tags-settings.component';

describe('PrintTagsSettingsComponent', () => {
  let fixture: ComponentFixture<PrintTagsSettingsComponent>;
  let httpMock: HttpTestingController;
  let dialog: jasmine.SpyObj<MatDialog>;
  let confirm: boolean;
  let toastr: jasmine.SpyObj<ToastrService>;
  let logging: jasmine.SpyObj<LoggingService>;

  const api = environment.printLogApiUrl;
  const statsUrl = `${api}/api/Tags/stats`;

  const tag = (overrides: Record<string, unknown> = {}) => ({
    id: 't1',
    name: 'Gifts',
    color: '#ff0000',
    printCount: 3,
    totalPrintTimeInSeconds: 5400,
    totalFilamentWeightMg: 125_500,
    totalCost: 4.5,
    costedPrintCount: 3,
    ...overrides,
  });

  beforeEach(async () => {
    confirm = true;
    dialog = jasmine.createSpyObj<MatDialog>('MatDialog', ['open']);
    dialog.open.and.callFake(() => ({ afterClosed: () => of(confirm) }) as any);
    toastr = jasmine.createSpyObj<ToastrService>('ToastrService', [
      'success',
      'error',
    ]);
    logging = jasmine.createSpyObj<LoggingService>('LoggingService', [
      'logEvent',
      'logException',
    ]);

    // The real PrintTagService, over HttpTestingController.
    await TestBed.configureTestingModule({
      imports: [PrintTagsSettingsComponent, NoopAnimationsModule],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: MatDialog, useValue: dialog },
        { provide: ToastrService, useValue: toastr },
        { provide: LoggingService, useValue: logging },
      ],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(PrintTagsSettingsComponent);
  });

  afterEach(() => httpMock.verify());

  const el = () => fixture.nativeElement as HTMLElement;
  const rows = () =>
    Array.from(el().querySelectorAll('[data-testid="print-tag-row"]'));
  const squash = (e: Element | null | undefined) =>
    e?.textContent?.replace(/\s+/g, ' ').trim() ?? '';
  const button = (root: Element, testId: string) =>
    root.querySelector<HTMLButtonElement>(`[data-testid="${testId}"]`)!;
  const type = (root: Element, testId: string, value: string) => {
    const input = root.querySelector<HTMLInputElement>(
      `[data-testid="${testId}"]`
    )!;
    input.value = value;
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  };

  const render = (tags: unknown[], currency: string | null = 'USD') => {
    expect(() => fixture.detectChanges()).not.toThrow();
    httpMock
      .expectOne(statsUrl)
      .flush({ currency, costUnavailable: false, tags });
    fixture.detectChanges();
  };

  it('lists each tag with its print count, time, filament and cost', () => {
    render([tag()]);

    expect(rows().length).toBe(1);
    const text = squash(rows()[0]);
    expect(text).toContain('Gifts');
    expect(text).toContain('3 prints');
    expect(text).toContain('1h 30m');
    expect(text).toContain('125.5 g');
    expect(text).toContain('$4.50');
    expect(
      rows()[0].querySelector('a[href="/prints?filterByTagId=t1"]')
    ).not.toBeNull();
  });

  it('says how many prints a partial cost covers, and shows no cost when none could be costed', () => {
    render([
      tag({ costedPrintCount: 2 }),
      tag({ id: 't2', name: 'Empty', printCount: 0, totalCost: null }),
    ]);

    expect(squash(rows()[0])).toContain('2 of 3 prints costed');
    expect(squash(rows()[1])).not.toContain('$');
  });

  it('explains when there are no tags yet', () => {
    render([]);
    expect(rows().length).toBe(0);
    expect(squash(el())).toContain('No tags yet');
  });

  it('creates a tag and reloads the list', () => {
    render([]);

    type(el(), 'print-tag-new-name', '  Cosplay ');
    button(el(), 'print-tag-create').click();

    const post = httpMock.expectOne(`${api}/api/Tags`);
    expect(post.request.method).toBe('POST');
    expect(post.request.body).toEqual({ name: 'Cosplay', color: null });
    post.flush({ id: 'c', name: 'Cosplay', color: null });

    httpMock
      .expectOne(statsUrl)
      .flush({ currency: 'USD', costUnavailable: false, tags: [tag()] });
    fixture.detectChanges();

    expect(logging.logEvent).toHaveBeenCalledWith(
      'PrintTagsSettings_Created',
      jasmine.anything()
    );
  });

  it('shows the API’s message when the name is taken', () => {
    render([tag()]);

    type(el(), 'print-tag-new-name', 'gifts');
    button(el(), 'print-tag-create').click();
    httpMock
      .expectOne(`${api}/api/Tags`)
      .flush('You already have a tag named "gifts".', {
        status: 409,
        statusText: 'Conflict',
      });

    expect(toastr.error).toHaveBeenCalledWith(
      'You already have a tag named "gifts".'
    );
  });

  it('renames and recolours a tag', () => {
    render([tag()]);

    button(rows()[0], 'print-tag-edit').click();
    fixture.detectChanges();
    type(rows()[0], 'print-tag-edit-name', 'Presents');
    button(rows()[0], 'print-tag-save').click();

    const put = httpMock.expectOne(`${api}/api/Tags/t1`);
    expect(put.request.method).toBe('PUT');
    expect(put.request.body).toEqual({ name: 'Presents', color: '#ff0000' });
    put.flush({ id: 't1', name: 'Presents', color: '#ff0000' });

    httpMock.expectOne(statsUrl).flush({
      currency: 'USD',
      costUnavailable: false,
      tags: [tag({ name: 'Presents' })],
    });
    fixture.detectChanges();

    expect(squash(rows()[0])).toContain('Presents');
  });

  it('asks before deleting, and does nothing when cancelled', () => {
    render([tag()]);
    confirm = false;

    button(rows()[0], 'print-tag-delete').click();

    expect(dialog.open).toHaveBeenCalledTimes(1);
    httpMock.expectNone(`${api}/api/Tags/t1`);
  });

  it('deletes after confirmation and reloads', () => {
    render([tag()]);

    button(rows()[0], 'print-tag-delete').click();

    expect(
      (dialog.open.calls.mostRecent().args[1]?.data as SimpleDialogData).yesText
    ).toBe('Delete');
    const del = httpMock.expectOne(`${api}/api/Tags/t1`);
    expect(del.request.method).toBe('DELETE');
    del.flush(null, { status: 204, statusText: 'No Content' });

    httpMock
      .expectOne(statsUrl)
      .flush({ currency: 'USD', costUnavailable: false, tags: [] });
    fixture.detectChanges();

    expect(rows().length).toBe(0);
    expect(logging.logEvent).toHaveBeenCalledWith(
      'PrintTagsSettings_Deleted',
      jasmine.anything()
    );
  });

  it('offers a retry when the tags cannot load', () => {
    fixture.detectChanges();
    httpMock
      .expectOne(statsUrl)
      .flush(null, { status: 500, statusText: 'Server Error' });
    fixture.detectChanges();

    button(el(), 'print-tag-retry').click();
    httpMock
      .expectOne(statsUrl)
      .flush({ currency: 'USD', costUnavailable: false, tags: [tag()] });
    fixture.detectChanges();

    expect(rows().length).toBe(1);
  });
});
