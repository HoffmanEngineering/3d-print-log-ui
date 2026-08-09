import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';
import currency from 'currency.js';
import { PrintDetailSummaryComponent } from './print-detail-summary.component';
import {
  EMPTY_GUID,
  PrintService,
  PrintStatus,
} from 'src/app/core/services/print.service';

describe('PrintDetailSummaryComponent', () => {
  let fixture: ComponentFixture<PrintDetailSummaryComponent>;

  const print = {
    id: 1,
    title: 'Articulated Dragon',
    status: PrintStatus.Success,
    startDate: new Date('2026-03-14T00:00:00Z'),
    createdByUserId: 7,
    printerId: 3,
    printer: { make: 'Bambu Lab', model: 'X1C', name: '' },
    url: 'https://printables.com/model/1',
    fileName: 'dragon.3mf',
    notes: '',
    printTimeInSeconds: 7200,
    // Must be non-empty: materialCostResult short-circuits to null when
    // hasFilamentUsage() is false, so an empty array would make every
    // material-cost assertion below unreachable.
    filamentUsage: [
      {
        filament: { id: 'f1', displayName: 'Bambu PLA Basic', colors: [] },
        amountMg: 18400,
      },
    ],
    projectId: 'p1',
    projectName: 'Dragon Project',
  } as any;

  beforeEach(async () => {
    // calculatePrintCost MUST be included: this spec renders the real
    // FilamentUsageSummaryComponent, which calls it per row whenever
    // showPrices is true (filament-usage-summary.component.ts:47,61). A
    // createSpyObj list omitting it leaves the method undefined, and every
    // owner-path assertion below dies with "not a function".
    const printService = jasmine.createSpyObj<PrintService>('PrintService', [
      'calculateElectricityCost',
      'calculateTotalPrintCost',
      'calculatePrintCost',
    ]);
    printService.calculatePrintCost.and.returnValue({
      valid: true,
      price: currency(0.42),
      formattedPrice: '$0.42',
      symbol: '$',
      usesDefaultPrice: false,
    });
    printService.calculateElectricityCost.and.returnValue({
      valid: true,
      cost: currency(0.21),
      formattedCost: '$0.21',
      symbol: '$',
      wattageW: 150,
      usesDefaultWattage: false,
      printTimeHours: 2,
    });
    // calculateTotalPrintCost returns { prices, total } — the cost fields are
    // nested under `total`. No `as any` cast: the cast is what would let a
    // wrong shape through undetected.
    printService.calculateTotalPrintCost.and.returnValue({
      prices: [],
      total: {
        valid: true,
        price: currency(1.84),
        formattedPrice: '$1.84',
        symbol: '$',
        usesDefaultPrice: false,
      },
    });

    await TestBed.configureTestingModule({
      imports: [PrintDetailSummaryComponent, RouterTestingModule],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: PrintService, useValue: printService },
      ],
      // No NO_ERRORS_SCHEMA: the rail's children are real standalone
      // components pulled in via its own imports, so the schema would suppress
      // nothing while masking template and binding typos.
    }).compileComponents();

    fixture = TestBed.createComponent(PrintDetailSummaryComponent);
    fixture.componentRef.setInput('print', print);
  });

  const renderAs = (isOwner: boolean) => {
    fixture.componentRef.setInput('isOwner', isOwner);
    fixture.detectChanges();
    return fixture.nativeElement;
  };

  // These two tests are the deterministic coverage for cost gating that the
  // owner-side E2E deliberately does not attempt (see Task 11). If they are
  // ever weakened, that E2E justification no longer holds.
  it('shows costs to the owner', () => {
    const el = renderAs(true);
    expect(el.textContent).toContain('$0.21');
    expect(el.textContent).toContain('$1.84');
  });

  it('omits all cost figures from non-owners', () => {
    const el = renderAs(false);
    expect(el.textContent).not.toContain('$0.21');
    expect(el.textContent).not.toContain('$1.84');
    expect(el.textContent).not.toContain('Electricity');
    expect(el.textContent).not.toContain('Material cost');
  });

  it('links the printer only for the owner', () => {
    expect(renderAs(true).querySelector('[data-cy-printer-link]')).toBeTruthy();
    fixture = TestBed.createComponent(PrintDetailSummaryComponent);
    fixture.componentRef.setInput('print', print);
    expect(renderAs(false).querySelector('[data-cy-printer-link]')).toBeNull();
  });

  it('shows the printer make and model to everyone', () => {
    expect(renderAs(false).textContent).toContain('Bambu Lab');
    expect(renderAs(false).textContent).toContain('X1C');
  });

  // The user-summary endpoint returns displayName: null for a user who has not
  // set one. Linking that produced an empty <a> — an axe "link-name" violation
  // and an unlabeled tab stop on every public print by such a user.
  it('renders no user link when the display name is blank', () => {
    fixture.componentRef.setInput('user', { id: 4, displayName: null });
    const el = renderAs(false);
    expect(el.querySelector('.byline a')).toBeNull();
    expect(el.querySelector('.byline')?.textContent).toContain('Printed on');
  });

  it('links the user when a display name exists', () => {
    fixture.componentRef.setInput('user', { id: 4, displayName: 'Ada' });
    const el = renderAs(false);
    expect(el.querySelector('.byline')?.textContent).toContain('Ada');
  });

  it('links the project for everyone', () => {
    const el = renderAs(false);
    expect(el.querySelector('[data-cy-project-link]')).toBeTruthy();
    expect(el.textContent).toContain('Dragon Project');
    // No name lookup when the payload already carried one.
    TestBed.inject(HttpTestingController).expectNone((r) =>
      r.url.includes('/api/Projects/')
    );
  });

  // GET /api/Prints/{id} returns projectId but no projectName, which is the
  // case that left the rail with nothing to render.
  it('resolves the project name when the print payload omits it', () => {
    fixture.componentRef.setInput('print', {
      ...print,
      projectName: undefined,
    });
    const el = renderAs(false);
    TestBed.inject(HttpTestingController)
      .expectOne((r) => r.url.endsWith('/api/Projects/p1'))
      .flush({ id: 'p1', name: 'Fetched Project' });
    fixture.detectChanges();

    expect(el.querySelector('[data-cy-project-link]')).toBeTruthy();
    expect(el.textContent).toContain('Fetched Project');
  });

  // Public route: an anonymous visitor, a private project, or a deleted one
  // must degrade to a nameless link rather than take the page down.
  it('still links the project when the name cannot be resolved', () => {
    fixture.componentRef.setInput('print', {
      ...print,
      projectName: undefined,
    });
    const el = renderAs(false);
    TestBed.inject(HttpTestingController)
      .expectOne((r) => r.url.endsWith('/api/Projects/p1'))
      .flush(null, { status: 401, statusText: 'Unauthorized' });
    fixture.detectChanges();

    expect(el.querySelector('[data-cy-project-link]')).toBeTruthy();
    expect(el.textContent).toContain('View project');
  });

  it('renders no project row when the id is the empty guid', () => {
    fixture.componentRef.setInput('print', {
      ...print,
      projectId: EMPTY_GUID,
      projectName: undefined,
    });
    const el = renderAs(false);

    expect(el.querySelector('[data-cy-project-link]')).toBeNull();
    TestBed.inject(HttpTestingController).expectNone((r) =>
      r.url.includes('/api/Projects/')
    );
  });

  it('shows the file name to everyone', () => {
    expect(renderAs(false).textContent).toContain('dragon.3mf');
  });

  it('renders the title as an h1', () => {
    expect(renderAs(false).querySelector('h1').textContent).toContain(
      'Articulated Dragon'
    );
  });

  it('omits the printer row entirely when printer is absent', () => {
    fixture.componentRef.setInput('print', { ...print, printer: undefined });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).not.toContain('Printer');
  });

  it('marks the material total partial when some rows have no price', () => {
    const printService = TestBed.inject(
      PrintService
    ) as jasmine.SpyObj<PrintService>;
    // Two materials on the print, only one of which priced successfully.
    printService.calculateTotalPrintCost.and.returnValue({
      prices: [{ valid: true } as any, { valid: false } as any],
      total: {
        valid: true,
        price: currency(0.42),
        formattedPrice: '$0.42',
        symbol: '$',
        usesDefaultPrice: false,
      },
    });
    fixture.componentRef.setInput('print', {
      ...print,
      filamentUsage: [
        { filament: { id: 'f1', displayName: 'PLA', colors: [] } },
        { filament: { id: 'f2', displayName: 'PETG', colors: [] } },
      ],
    });

    const el = renderAs(true);
    expect(el.textContent).toContain('at least');
    expect(el.textContent).toContain('only');
  });

  it('does not mark the total partial when every row priced', () => {
    const printService = TestBed.inject(
      PrintService
    ) as jasmine.SpyObj<PrintService>;
    printService.calculateTotalPrintCost.and.returnValue({
      prices: [{ valid: true } as any],
      total: {
        valid: true,
        price: currency(0.42),
        formattedPrice: '$0.42',
        symbol: '$',
        usesDefaultPrice: false,
      },
    });
    fixture.componentRef.setInput('print', {
      ...print,
      filamentUsage: [
        { filament: { id: 'f1', displayName: 'PLA', colors: [] } },
      ],
    });

    expect(renderAs(true).textContent).not.toContain('at least');
  });

  it('renders a dangerous url as plain text, not a link', () => {
    fixture.componentRef.setInput('print', {
      ...print,
      url: 'javascript:alert(1)',
    });
    fixture.detectChanges();
    expect(
      fixture.nativeElement.querySelector('[data-cy-source-link]')
    ).toBeNull();
  });

  it('resolves each marker to visible legend text', () => {
    const printService = TestBed.inject(
      PrintService
    ) as jasmine.SpyObj<PrintService>;
    printService.calculateTotalPrintCost.and.returnValue({
      prices: [],
      total: {
        valid: true,
        price: currency(1.84),
        formattedPrice: '$1.84',
        symbol: '$',
        usesDefaultPrice: true,
      },
    });
    printService.calculateElectricityCost.and.returnValue({
      valid: true,
      cost: currency(0.21),
      formattedCost: '$0.21',
      symbol: '$',
      wattageW: 150,
      usesDefaultWattage: true,
      printTimeHours: 2,
    });

    fixture.componentRef.setInput('print', {
      ...print,
      filamentUsage: [
        { filament: { id: 'f1', displayName: 'PLA', colors: [] } },
      ],
    });
    const el = renderAs(true);

    const markers = Array.from(
      el.querySelectorAll('[aria-describedby]')
    ) as Element[];
    const ids = markers.flatMap((m) =>
      m.getAttribute('aria-describedby')!.split(' ').filter(Boolean)
    );

    // Guard against a vacuous pass: if no legend marker rendered, the loop
    // below asserts nothing and the test is worthless.
    expect(ids.filter((id) => id.startsWith('legend-')).length).toBeGreaterThan(
      0
    );

    ids.forEach((id) => {
      // Resolved against the document, not the fixture root: MatTooltip's own
      // aria-describedby points at a CDK message element rendered into a global
      // container outside this component.
      const target = document.querySelector(`#${id}`);
      expect(target)
        .withContext(`aria-describedby target #${id} must exist`)
        .toBeTruthy();
      expect(target!.textContent!.trim().length).toBeGreaterThan(0);
    });
  });
});
