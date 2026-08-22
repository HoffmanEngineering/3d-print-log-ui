import {
  ComponentFixture,
  TestBed,
  fakeAsync,
  tick,
} from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import {
  PrintService,
  PrintStatus,
  PrintSummary,
} from 'src/app/core/services/print.service';
import { FilamentPrintsPanelComponent } from './filament-prints-panel.component';

const FILAMENT_ID = 'aaaaaaaa-0000-0000-0000-000000000001';

function fakePrint(id: number): PrintSummary {
  return {
    id,
    title: 'Print ' + id,
    startDate: new Date('2026-07-30T10:00:00Z'),
    status: PrintStatus.Success,
    defaultPrintImageId: 0,
    filamentUsage: [],
  } as unknown as PrintSummary;
}

describe('FilamentPrintsPanelComponent', () => {
  let fixture: ComponentFixture<FilamentPrintsPanelComponent>;
  let printService: jasmine.SpyObj<PrintService>;

  beforeEach(async () => {
    printService = jasmine.createSpyObj<PrintService>('PrintService', [
      'getPrintSummaries',
      'getPrintImage',
    ]);
    printService.getPrintImage.and.returnValue(of('data:image/png;base64,AAA'));

    await TestBed.configureTestingModule({
      imports: [FilamentPrintsPanelComponent],
      providers: [
        provideRouter([]),
        { provide: PrintService, useValue: printService },
      ],
    }).compileComponents();
  });

  function create(): HTMLElement {
    fixture = TestBed.createComponent(FilamentPrintsPanelComponent);
    fixture.componentRef.setInput('filamentId', FILAMENT_ID);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('lists the returned prints', fakeAsync(() => {
    printService.getPrintSummaries.and.returnValue(
      of({
        items: [fakePrint(1), fakePrint(2)],
        paging: { totalCount: 2 },
      } as never)
    );

    const el = create();
    tick(1000);
    fixture.detectChanges();

    expect(el.querySelectorAll('app-filament-print-row').length).toBe(2);
  }));

  it('filters by this filament', fakeAsync(() => {
    printService.getPrintSummaries.and.returnValue(
      of({ items: [], paging: { totalCount: 0 } } as never)
    );

    create();
    tick(1000);

    const filamentIdsArg =
      printService.getPrintSummaries.calls.mostRecent().args[5];
    expect(filamentIdsArg).toEqual([FILAMENT_ID]);
  }));

  it('shows an empty state when nothing used the spool', fakeAsync(() => {
    printService.getPrintSummaries.and.returnValue(
      of({ items: [], paging: { totalCount: 0 } } as never)
    );

    const el = create();
    tick(1000);
    fixture.detectChanges();

    expect(el.textContent).toContain('No prints have used this material yet');
  }));

  it('shows a scoped error without throwing', fakeAsync(() => {
    printService.getPrintSummaries.and.returnValue(
      throwError(() => new Error('boom'))
    );

    const el = create();
    tick(1000);
    fixture.detectChanges();

    expect(el.textContent).toContain("Couldn't load prints");
  }));

  it('refetches when the error state is retried', fakeAsync(() => {
    printService.getPrintSummaries.and.returnValue(
      throwError(() => new Error('boom'))
    );

    const el = create();
    tick(1000);
    fixture.detectChanges();

    printService.getPrintSummaries.and.returnValue(
      of({ items: [fakePrint(1)], paging: { totalCount: 1 } } as never)
    );
    el.querySelector('button')!.click();
    tick(1000);
    fixture.detectChanges();

    expect(el.querySelectorAll('app-filament-print-row').length).toBe(1);
  }));

  it('links to the filtered print list', fakeAsync(() => {
    printService.getPrintSummaries.and.returnValue(
      of({ items: [fakePrint(1)], paging: { totalCount: 23 } } as never)
    );

    const el = create();
    tick(1000);
    fixture.detectChanges();

    const link = el.querySelector('a.view-all');
    expect(link?.getAttribute('href')).toContain(
      'filterByFilamentId=' + FILAMENT_ID
    );
  }));

  it('does not offer a view-all link when every print is already listed', fakeAsync(() => {
    printService.getPrintSummaries.and.returnValue(
      of({ items: [fakePrint(1)], paging: { totalCount: 1 } } as never)
    );

    const el = create();
    tick(1000);
    fixture.detectChanges();

    expect(el.querySelector('a.view-all')).toBeFalsy();
  }));
});
