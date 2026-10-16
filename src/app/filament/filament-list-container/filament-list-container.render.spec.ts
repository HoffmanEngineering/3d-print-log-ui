import { provideZoneChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { AdsenseModule } from 'ng2-adsense';
import { ToastrService } from 'ngx-toastr';
import { Subject } from 'rxjs';
import {
  FilamentService,
  FilamentSummary,
} from 'src/app/core/services/filament.service';
import { PrinterThumbnailStore } from 'src/app/core/stores/printer-thumbnail-store.service';
import { PagedList } from 'src/app/core/types/paging';
import { FilamentListContainerComponent } from './filament-list-container.component';

const aSpool = (overrides: Partial<FilamentSummary> = {}) =>
  ({
    id: 'spool-1',
    displayName: 'Galaxy Black PLA',
    brand: 'Prusament',
    materialType: 'PLA',
    colorName: 'Galaxy Black',
    colorHex: '000000',
    colors: ['000000'],
    effects: [],
    isActive: true,
    isFavorite: false,
    filamentRemaining: 800_000,
    loadedInPrinter: null,
    storageLocation: '',
    ...overrides,
  }) as FilamentSummary;

const page = (items: FilamentSummary[]): PagedList<FilamentSummary> =>
  ({
    items,
    paging: {
      currentPage: 1,
      pageSize: 10,
      totalCount: items.length,
      totalPages: 1,
    },
  }) as PagedList<FilamentSummary>;

/**
 * Renders the real template on a real route. The service answers only when a test
 * says so, the way HTTP does, and the app's zone change detection runs, so a view
 * that is not repainted after a response shows up as stale.
 */
describe('FilamentListContainerComponent (rendered)', () => {
  let harness: RouterTestingHarness;
  let filamentService: jasmine.SpyObj<FilamentService>;
  let listed: Subject<PagedList<FilamentSummary>>;

  const text = () => (harness.routeNativeElement as HTMLElement).textContent;

  beforeEach(async () => {
    listed = new Subject();
    filamentService = jasmine.createSpyObj<FilamentService>('FilamentService', [
      'getCurrentUserFilamentSummaries',
      'changeFavorite',
    ]);
    filamentService.getCurrentUserFilamentSummaries.and.returnValue(listed);

    TestBed.configureTestingModule({
      imports: [
        NoopAnimationsModule,
        // The template renders app-ad for real, which needs the Adsense config.
        AdsenseModule.forRoot({ adClient: 'ca-pub-test' }),
      ],
      providers: [
        provideZoneChangeDetection(),
        provideRouter([
          {
            path: 'materials',
            component: FilamentListContainerComponent,
            data: {
              filamentList: page([aSpool()]),
              materialCategories: [],
              storageLocations: [],
            },
          },
        ]),
        { provide: FilamentService, useValue: filamentService },
        {
          provide: ToastrService,
          useValue: jasmine.createSpyObj('ToastrService', ['success', 'error']),
        },
        // Stubbed: the real store would issue its own authenticated fetch.
        {
          provide: PrinterThumbnailStore,
          useValue: jasmine.createSpyObj('PrinterThumbnailStore', [
            'thumbnailFor',
            'invalidate',
            'noteLoadFailure',
          ]),
        },
      ],
    });

    harness = await RouterTestingHarness.create('/materials');
    await harness.fixture.whenStable();
    harness.detectChanges();
  });

  it('shows the next page', async () => {
    const component = harness.routeDebugElement!
      .componentInstance as FilamentListContainerComponent;

    await component.pageChange({ pageIndex: 1, pageSize: 10 } as never);
    harness.detectChanges();
    await harness.fixture.whenStable();

    listed.next(
      page([
        aSpool({
          id: 'spool-2',
          displayName: 'Jet Black PETG',
          colorName: 'Jet Black',
          materialType: 'PETG',
        }),
      ])
    );
    harness.detectChanges();

    expect(text()).toContain('Jet Black PETG');
    expect(text()).not.toContain('Galaxy Black');
  });

  describe('an untracked spool (no starting weight)', () => {
    const root = () => harness.routeNativeElement as HTMLElement;

    beforeEach(async () => {
      const component = harness.routeDebugElement!
        .componentInstance as FilamentListContainerComponent;
      await component.pageChange({ pageIndex: 1, pageSize: 10 } as never);
      harness.detectChanges();
      await harness.fixture.whenStable();
      listed.next(page([aSpool({ filamentRemaining: null })]));
      harness.detectChanges();
    });

    it('says Not tracked in the table instead of 0', () => {
      const cell = root().querySelector('td.mat-column-filamentRemaining');
      expect(cell!.textContent!.trim()).toBe('Not tracked');
    });

    it('says Not tracked on the card instead of 0g', () => {
      const weight = root().querySelector('.filament-card .card-weight');
      expect(weight!.textContent!.trim()).toBe('Not tracked');
    });

    it('offers no Mark As Empty in either menu', async () => {
      const triggers = Array.from(
        root().querySelectorAll<HTMLButtonElement>('[aria-haspopup="menu"]')
      );
      expect(triggers.length).toBeGreaterThan(0);
      for (const trigger of triggers) {
        trigger.click();
        harness.detectChanges();
        await harness.fixture.whenStable();
      }
      const overlay = document.querySelector('.cdk-overlay-container');
      expect(overlay!.textContent).toContain('Delete');
      expect(overlay!.textContent).not.toContain('Mark As Empty');
    });
  });

  it('still offers Mark As Empty for a tracked spool', async () => {
    const trigger = (
      harness.routeNativeElement as HTMLElement
    ).querySelector<HTMLButtonElement>('[aria-haspopup="menu"]');
    trigger!.click();
    harness.detectChanges();
    await harness.fixture.whenStable();

    expect(
      document.querySelector('.cdk-overlay-container')!.textContent
    ).toContain('Mark As Empty');
  });

  it('stars a favorite once the server confirms it', () => {
    const favorited = new Subject<unknown>();
    filamentService.changeFavorite.and.returnValue(favorited as never);
    const component = harness.routeDebugElement!
      .componentInstance as FilamentListContainerComponent;
    const stars = () =>
      Array.from(
        (harness.routeNativeElement as HTMLElement).querySelectorAll('mat-icon')
      ).filter((icon) => icon.textContent!.trim() === 'star').length;
    const before = stars();

    component.toggleFavorite(component.filaments()[0]);
    favorited.next(undefined);
    harness.detectChanges();

    expect(stars()).toBeGreaterThan(before);
  });
});
