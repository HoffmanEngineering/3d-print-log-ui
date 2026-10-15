import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { PrintStatus, PrintSummary } from 'src/app/core/services/print.service';
import { PrintGalleryComponent } from './print-gallery.component';

const printFor = (overrides: Partial<PrintSummary> = {}): PrintSummary => ({
  id: 42,
  title: 'Benchy',
  printer: { id: 1, name: 'Voron', make: 'Voron Design', model: '2.4' } as any,
  startDate: new Date('2026-04-01T12:00:00Z'),
  status: PrintStatus.Success,
  defaultPrintImageId: 7,
  createdByUserId: 1,
  estimatedPrintTimeInSeconds: 3600,
  printTimeInSeconds: 3500,
  sumActualFilamentWeightMg: 0,
  sumEstimatedFilamentWeightMg: 0,
  totalFilamentWeightMg: 0,
  filamentUsage: [],
  commentCount: 0,
  ...overrides,
});

describe('PrintGalleryComponent', () => {
  let fixture: ComponentFixture<PrintGalleryComponent>;

  const tiles = () =>
    fixture.debugElement.queryAll(By.css('[data-testid="print-gallery-tile"]'));

  const render = (
    prints: PrintSummary[],
    selectedIds: ReadonlySet<number> = new Set()
  ) => {
    fixture.componentRef.setInput('prints', prints);
    fixture.componentRef.setInput('selectedIds', selectedIds);
    fixture.detectChanges();
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PrintGalleryComponent],
      providers: [
        provideRouter([]),
        // The real PrintService behind app-print-image, so the first paint
        // exercises the same image pipeline the list uses.
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PrintGalleryComponent);
  });

  afterEach(() => {
    TestBed.inject(HttpTestingController)
      .match(() => true)
      .forEach((request) => request.flush(new Blob()));
  });

  it('renders one tile per print, in order', () => {
    render([
      printFor({ id: 1, title: 'One' }),
      printFor({ id: 2, title: 'Two' }),
    ]);

    expect(tiles().length).toBe(2);
    expect(tiles()[0].nativeElement.textContent).toContain('One');
    expect(tiles()[1].nativeElement.textContent).toContain('Two');
  });

  it('links each tile to its print', () => {
    render([printFor({ id: 42 })]);

    const link = tiles()[0].query(By.css('a'))
      .nativeElement as HTMLAnchorElement;
    expect(link.getAttribute('href')).toBe('/prints/42');
  });

  it('names the link after the print, so a screen reader hears the title once', () => {
    render([printFor({ title: 'Benchy' })]);

    // Without aria-labelledby the link's name would be computed from everything
    // inside it: "Photo of Benchy Benchy Success 01/04/2026 Voron".
    const link = tiles()[0].query(By.css('a'))
      .nativeElement as HTMLAnchorElement;
    const labelledBy = link.getAttribute('aria-labelledby');
    expect(labelledBy).toBeTruthy();
    expect(
      (fixture.nativeElement as HTMLElement)
        .querySelector(`#${labelledBy}`)
        ?.textContent?.trim()
    ).toBe('Benchy');
  });

  it('shows the status, start date and printer', () => {
    render([printFor({ status: PrintStatus.Failed })]);

    const tile = tiles()[0];
    expect(tile.query(By.css('app-print-status-badge'))).toBeTruthy();
    expect(tile.nativeElement.textContent).toContain('Failed');
    expect(tile.nativeElement.textContent).toContain('Voron');
    expect(
      tile
        .query(By.css('[data-testid="print-gallery-date"]'))
        .nativeElement.textContent.trim().length
    ).toBeGreaterThan(0);
  });

  it('falls back to make and model when the printer has no name', () => {
    render([
      printFor({
        printer: { id: 1, name: '', make: 'Prusa', model: 'MK4' } as any,
      }),
    ]);

    expect(tiles()[0].nativeElement.textContent).toContain('Prusa MK4');
  });

  it('renders the default image with alt text naming the print', () => {
    render([printFor({ id: 42, defaultPrintImageId: 7, title: 'Benchy' })]);

    const image = tiles()[0].query(By.css('app-print-image'));
    expect(image).toBeTruthy();
    expect(image.componentInstance.alt()).toBe('Photo of Benchy');
    expect(image.componentInstance.fit()).toBe('cover');
    TestBed.inject(HttpTestingController).expectOne((request) =>
      request.url.endsWith('/api/Prints/42/image/7')
    );
  });

  it('draws a placeholder instead of fetching when the print has no image', () => {
    render([printFor({ defaultPrintImageId: 0 })]);

    const tile = tiles()[0];
    expect(tile.query(By.css('app-print-image'))).toBeNull();
    expect(
      tile.query(By.css('[data-testid="print-gallery-placeholder"]'))
    ).toBeTruthy();
    TestBed.inject(HttpTestingController).expectNone(() => true);
  });

  describe('selection', () => {
    const checkbox = (index = 0) =>
      tiles()[index].query(By.css('mat-checkbox'));

    it('keeps the checkbox outside the link, so it is its own focus stop', () => {
      render([printFor()]);

      expect(checkbox()).toBeTruthy();
      expect(checkbox().nativeElement.closest('a')).toBeNull();
    });

    it('labels each checkbox after its print', () => {
      render([printFor({ title: 'Benchy' })]);

      const input = checkbox().query(By.css('input'))
        .nativeElement as HTMLInputElement;
      expect(input.getAttribute('aria-label')).toBe('Select print Benchy');
    });

    it('reflects the selection it is given', () => {
      render([printFor({ id: 1 }), printFor({ id: 2 })], new Set([2]));

      expect(tiles()[0].nativeElement.classList).not.toContain(
        'print-gallery__tile--selected'
      );
      expect(tiles()[1].nativeElement.classList).toContain(
        'print-gallery__tile--selected'
      );
      expect(checkbox(1).componentInstance.checked).toBeTrue();
    });

    it('asks the list to toggle the print rather than holding state itself', () => {
      const print = printFor({ id: 9 });
      render([print]);
      const toggled = jasmine.createSpy('selectionToggled');
      fixture.componentInstance.selectionToggled.subscribe(toggled);

      (
        checkbox().query(By.css('input')).nativeElement as HTMLInputElement
      ).click();
      fixture.detectChanges();

      expect(toggled).toHaveBeenCalledOnceWith(print);
      expect(tiles()[0].nativeElement.classList).not.toContain(
        'print-gallery__tile--selected'
      );
    });

    it('disables the checkboxes while a batch is running', () => {
      fixture.componentRef.setInput('selectionDisabled', true);
      render([printFor()]);

      expect(checkbox().componentInstance.disabled).toBeTrue();
    });
  });
});
