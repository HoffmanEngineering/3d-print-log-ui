import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { By } from '@angular/platform-browser';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ActivatedRoute } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { AdsenseModule } from 'ng2-adsense';
import { ToastrService } from 'ngx-toastr';
import { of } from 'rxjs';

import { SharedModule } from 'src/app/shared/shared.module';
import { EmptyStateComponent } from 'src/app/shared/empty-state/empty-state.component';
import {
  PrinterService,
  PrinterSummarySimple,
} from 'src/app/core/services/printer.service';
import { PagedList } from 'src/app/core/types/paging';
import { SignedImageComponent } from 'src/app/shared/signed-image/signed-image.component';
import { PrinterListComponent } from './printer-list.component';

/**
 * The component reads its first page from the route resolver, so every test supplies one.
 * `page()` builds the whole PagedList because the component reads `paging` for its
 * paginator state as well as `items`.
 */
const page = (
  items: Partial<PrinterSummarySimple>[]
): PagedList<PrinterSummarySimple> =>
  ({
    items: items as PrinterSummarySimple[],
    paging: {
      currentPage: 1,
      pageSize: 10,
      totalCount: items.length,
      totalPages: 1,
    },
  }) as PagedList<PrinterSummarySimple>;

const aPrinter = (
  overrides: Partial<PrinterSummarySimple> = {}
): Partial<PrinterSummarySimple> => ({
  id: 7,
  name: 'Voron 2.4',
  make: 'Formbot',
  model: 'Voron 2.4 350',
  isActive: true,
  loadedFilaments: [],
  category: { nickname: 'FFF', name: 'Fused Filament Fabrication' } as never,
  ...overrides,
});

describe('PrinterListComponent', () => {
  let component: PrinterListComponent;
  let fixture: ComponentFixture<PrinterListComponent>;
  let printerService: jasmine.SpyObj<PrinterService>;

  const setUp = async (items: Partial<PrinterSummarySimple>[]) => {
    printerService = jasmine.createSpyObj<PrinterService>('PrinterService', [
      'getCurrentUserPrinterSummaries',
      'unloadFilament',
      'deletePrinter',
    ]);
    printerService.getCurrentUserPrinterSummaries.and.returnValue(
      of(page(items))
    );

    const toastr = jasmine.createSpyObj<ToastrService>('ToastrService', [
      'success',
      'error',
    ]);
    const dialog = jasmine.createSpyObj<MatDialog>('MatDialog', ['open']);

    await TestBed.configureTestingModule({
      declarations: [PrinterListComponent],
      imports: [
        SharedModule,
        NoopAnimationsModule,
        EmptyStateComponent,
        SignedImageComponent,
        // The table rows and the empty-state buttons are routerLinks.
        RouterTestingModule,
        // The template renders app-ad for real, which needs the Adsense config.
        AdsenseModule.forRoot({ adClient: 'ca-pub-test' }),
      ],
      providers: [
        { provide: PrinterService, useValue: printerService },
        { provide: ToastrService, useValue: toastr },
        { provide: MatDialog, useValue: dialog },
        {
          provide: ActivatedRoute,
          useValue: { data: of({ printerList: page(items) }) },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PrinterListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  };

  it('creates', async () => {
    await setUp([aPrinter()]);
    expect(component).toBeTruthy();
  });

  it('takes its first page from the resolver rather than fetching', async () => {
    await setUp([aPrinter()]);

    expect(component.printers.length).toBe(1);
    expect(
      printerService.getCurrentUserPrinterSummaries
    ).not.toHaveBeenCalled();
  });

  it('reports an active search only when the box has non-whitespace text', async () => {
    await setUp([aPrinter()]);

    expect(component.hasActiveSearch).toBeFalse();

    component.searchText = '   ';
    expect(component.hasActiveSearch).toBeFalse();

    component.searchText = 'voron';
    expect(component.hasActiveSearch).toBeTrue();
  });

  describe('default photo thumbnail', () => {
    it('renders a thumbnail when the printer has a default image', async () => {
      await setUp([
        aPrinter({
          defaultImageThumbnailUrl: 'https://blob.example/thumb.webp?sig=abc',
        }),
      ]);

      const image = fixture.debugElement.query(By.css('app-signed-image'));
      expect(image).toBeTruthy();
      expect(image.componentInstance.alt() as string).toContain('Voron 2.4');
    });

    it('renders no thumbnail element when there is no default image', async () => {
      await setUp([aPrinter({ defaultImageThumbnailUrl: null })]);

      expect(fixture.debugElement.query(By.css('app-signed-image'))).toBeNull();
    });
  });
});
