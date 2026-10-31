import type { MockedObject } from 'vitest';
import {
  HttpErrorResponse,
  provideHttpClient,
  withInterceptorsFromDi,
} from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  MAT_DIALOG_DATA,
  MatDialog,
  MatDialogRef,
} from '@angular/material/dialog';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { Observable, of, Subject, throwError } from 'rxjs';
import { LoggingService } from '../../core/services/logging.service';
import {
  PrinterCategory,
  PrinterCategoryService,
} from '../../core/services/printer-categories.service';
import {
  PrinterCatalogService,
  PrinterModel,
} from '../../core/services/printer-catalog.service';
import {
  PrinterDetail,
  PrinterService,
} from '../../core/services/printer.service';
import { OnboardingService } from '../onboarding.service';
import {
  openQuickAddPrinterDialog,
  QuickAddPrinterDialogComponent,
} from './quick-add-printer-dialog.component';
import {
  QuickAddMode,
  QuickAddPrinterComponent,
} from './quick-add-printer.component';

function category(nickname: string): PrinterCategory {
  return { nickname, name: nickname } as PrinterCategory;
}

function slug(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-');
}

/** A minimal catalog model: FFF, single slot, no specs unless given. */
function catalogModel(
  make: string,
  model: string,
  extra: Partial<PrinterModel> = {}
): PrinterModel {
  return {
    id: slug(`${make} ${model}`),
    make,
    model,
    technology: 'FFF',
    defaultSlotCount: 1,
    ...extra,
  };
}

const P1S = catalogModel('Bambu Lab', 'P1S', {
  id: 'bambu-lab-p1s',
  bedWidthMm: 256,
  bedDepthMm: 256,
  bedHeightMm: 256,
  nozzleOptionsMm: [0.2, 0.4, 0.6, 0.8],
  defaultNozzleMm: 0.4,
  filamentDiameterMm: 1.75,
  hasHeatedBed: true,
  hasHeatedChamber: false,
  defaultSlotCount: 4,
});
const MK4 = catalogModel('Prusa', 'MK4', { id: 'prusa-mk4' });
const MARS = catalogModel('Elegoo', 'Mars', {
  id: 'elegoo-mars',
  technology: 'Resin',
});

describe('QuickAddPrinterComponent', () => {
  let fixture: ComponentFixture<QuickAddPrinterComponent>;
  let component: QuickAddPrinterComponent;
  let printers: MockedObject<PrinterService>;
  let logging: MockedObject<LoggingService>;
  let onboarding: MockedObject<OnboardingService>;
  let catalog: MockedObject<PrinterCatalogService>;
  let saved: PrinterDetail[];
  let continued: number;

  async function setup(
    showEmailNotice = false,
    initialModelId: string | null = null,
    mode: QuickAddMode = 'dialog',
    hasSavedPrinters = false,
    inputs: Record<string, unknown> = {}
  ) {
    fixture = TestBed.createComponent(QuickAddPrinterComponent);
    for (const [name, value] of Object.entries(inputs)) {
      fixture.componentRef.setInput(name, value);
    }
    fixture.componentRef.setInput('source', 'welcome');
    fixture.componentRef.setInput('showEmailNotice', showEmailNotice);
    fixture.componentRef.setInput('mode', mode);
    fixture.componentRef.setInput('hasSavedPrinters', hasSavedPrinters);
    if (initialModelId) {
      fixture.componentRef.setInput('initialModelId', initialModelId);
    }
    component = fixture.componentInstance;
    saved = [];
    continued = 0;
    component.saved.subscribe((p) => saved.push(p));
    component.continued.subscribe(() => continued++);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  function host(): HTMLElement {
    return fixture.nativeElement as HTMLElement;
  }

  function byTestId<T extends HTMLElement>(id: string): T | null {
    return host().querySelector(`[data-testid="${id}"]`) as T | null;
  }

  function sent(): PrinterDetail {
    return vi.mocked(printers.addPrinter).mock.lastCall[0];
  }

  function typeInSearch(text: string): void {
    const search = host().querySelector(
      'input[formcontrolname="search"]'
    ) as HTMLInputElement;
    search.value = text;
    search.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  }

  /** After a pick the search box is hidden, so a type-over goes through the control. */
  function typeOverPick(text: string): void {
    component.form.controls.search.setValue(text);
    fixture.detectChanges();
  }

  /** Free text stops once to confirm make, model and type; the second save goes through. */
  async function saveFreeText(): Promise<void> {
    await component.save();
    fixture.detectChanges();
    await component.save();
  }

  function openSpecs(): void {
    byTestId<HTMLButtonElement>('edit-specs')!.click();
    fixture.detectChanges();
  }

  function buttonLabels(): string[] {
    return Array.from(
      host().querySelectorAll<HTMLButtonElement>('.quick-add__actions button')
    ).map((b) => b.textContent!.trim());
  }

  beforeEach(() => {
    printers = {
      addPrinter: vi.fn().mockName('PrinterService.addPrinter'),
    } as unknown as MockedObject<PrinterService>;
    printers.addPrinter.mockImplementation((p) => of({ ...p, id: 7 }));
    logging = {
      logEvent: vi.fn().mockName('LoggingService.logEvent'),
    } as unknown as MockedObject<LoggingService>;
    onboarding = {
      acknowledgeEmailNotice: vi
        .fn()
        .mockName('OnboardingService.acknowledgeEmailNotice'),
    } as unknown as MockedObject<OnboardingService>;
    onboarding.acknowledgeEmailNotice.mockResolvedValue(undefined);
    catalog = {
      search: vi.fn().mockName('PrinterCatalogService.search'),
      popular: vi.fn().mockName('PrinterCatalogService.popular'),
      get: vi.fn().mockName('PrinterCatalogService.get'),
      match: vi.fn().mockName('PrinterCatalogService.match'),
    } as unknown as MockedObject<PrinterCatalogService>;
    catalog.search.mockReturnValue(of([]));
    catalog.popular.mockReturnValue(of([]));
    catalog.get.mockReturnValue(of(null));
    catalog.match.mockReturnValue(of(null));
    TestBed.configureTestingModule({
      imports: [QuickAddPrinterComponent, NoopAnimationsModule],
      providers: [
        { provide: PrinterService, useValue: printers },
        { provide: LoggingService, useValue: logging },
        { provide: OnboardingService, useValue: onboarding },
        { provide: PrinterCatalogService, useValue: catalog },
        {
          provide: PrinterCategoryService,
          useValue: {
            getPrinterCategories: () =>
              of(['FFF', 'FDM', 'SLA', 'MSLA', 'SLS'].map(category)),
          },
        },
      ],
    });
  });

  it('logs QuickAddPrinter_Opened with the source', async () => {
    await setup();

    expect(logging.logEvent).toHaveBeenCalledWith('QuickAddPrinter_Opened', {
      source: 'welcome',
    });
  });

  it('fills make, model and name when a catalog row is selected', async () => {
    await setup();

    component.selectCatalogPrinter(catalogModel('Bambu Lab', 'X1 Carbon'));

    expect(component.form.controls.make.value).toBe('Bambu Lab');
    expect(component.form.controls.model.value).toBe('X1 Carbon');
    expect(component.form.controls.name.value).toBe('X1 Carbon');
  });

  it('splits free text at the first space on blur', async () => {
    await setup();
    component.form.controls.search.setValue('Voron 2.4');

    component.commitFreeText();

    expect(component.form.controls.make.value).toBe('Voron');
    expect(component.form.controls.model.value).toBe('2.4');
  });

  it('puts a single free-text word into both make and model', async () => {
    await setup();
    component.form.controls.search.setValue('Ender');

    component.commitFreeText();

    expect(component.form.controls.make.value).toBe('Ender');
    expect(component.form.controls.model.value).toBe('Ender');
  });

  it('keeps a catalog selection on blur', async () => {
    await setup();
    component.selectCatalogPrinter(catalogModel('Bambu Lab', 'A1'));

    component.commitFreeText();

    expect(component.form.controls.make.value).toBe('Bambu Lab');
    expect(component.form.controls.model.value).toBe('A1');
  });

  it('stops the name following the model once it is edited', async () => {
    await setup();
    component.selectCatalogPrinter(MK4);
    component.onNameInput();
    component.form.controls.name.setValue('Workhorse');

    component.selectCatalogPrinter(catalogModel('Bambu Lab', 'A1'));

    expect(component.form.controls.name.value).toBe('Workhorse');
  });

  it('sends slotCount 1 when multi-material is off', async () => {
    await setup();
    component.selectCatalogPrinter(MK4);
    component.form.controls.slotCount.setValue(6);

    await component.save();

    expect(sent().slotCount).toBe(1);
  });

  it('keeps Save enabled after an invalid slot count is toggled off', async () => {
    await setup();
    component.selectCatalogPrinter(MK4);
    fixture.detectChanges();
    const toggle = host().querySelector(
      '[data-testid="multi-material"] input'
    ) as HTMLInputElement;

    toggle.click();
    fixture.detectChanges();
    component.form.controls.slotCount.setValue(1);
    fixture.detectChanges();
    toggle.click();
    fixture.detectChanges();

    const save = byTestId<HTMLButtonElement>('quick-add-save')!;
    expect(save.disabled).toBe(false);
  });

  it('rejects a non-integer slot count while multi-material is on', async () => {
    await setup();
    component.form.controls.multiMaterial.setValue(true);

    component.form.controls.slotCount.setValue(2.5);
    expect(component.form.controls.slotCount.invalid).toBe(true);

    component.form.controls.slotCount.setValue(3);
    expect(component.form.controls.slotCount.invalid).toBe(false);
  });

  it('sends the slot count when multi-material is on', async () => {
    await setup();
    component.selectCatalogPrinter(MK4);
    component.form.controls.multiMaterial.setValue(true);
    component.form.controls.slotCount.setValue(6);

    await component.save();

    expect(sent().slotCount).toBe(6);
    expect(logging.logEvent).toHaveBeenCalledWith(
      'QuickAddPrinter_Saved',
      expect.objectContaining({ multiSlot: true })
    );
  });

  it('saves an FFF printer by default and emits it', async () => {
    await setup();
    component.selectCatalogPrinter(MK4);

    await component.save();

    expect(sent().id).toBeNull();
    expect(sent().name).toBe('MK4');
    expect(sent().make).toBe('Prusa');
    expect(sent().isActive).toBe(true);
    expect(sent().loadedFilaments).toEqual([]);
    expect(sent().category.nickname).toBe('FFF');
    expect(saved.length).toBe(1);
    expect(logging.logEvent).toHaveBeenCalledWith('QuickAddPrinter_Saved', {
      source: 'welcome',
      fromCatalog: true,
      multiSlot: false,
      catalogModelId: 'prusa-mk4',
      popularChip: false,
      specsEdited: false,
    });
  });

  it('dialog mode shows only a primary "Add printer"', async () => {
    await setup();
    component.selectCatalogPrinter(MK4);
    fixture.detectChanges();

    const button = byTestId<HTMLButtonElement>('quick-add-save')!;
    expect(button.textContent!.trim()).toBe('Add printer');
    expect(button.classList).toContain('mat-primary');
    expect(buttonLabels()).toEqual(['Add printer']);
    expect(byTestId('quick-add-save-another')).toBeNull();
  });

  it('maps a Resin catalog model to MSLA', async () => {
    await setup();
    component.selectCatalogPrinter(MARS);

    expect(component.form.controls.type.value).toBe('MSLA');
    await component.save();
    expect(sent().category.nickname).toBe('MSLA');
  });

  it('maps Other to the chosen category', async () => {
    await setup();
    component.selectCatalogPrinter(catalogModel('Formlabs', 'Fuse 1'));
    component.form.controls.type.setValue('Other');
    component.form.controls.otherCategory.setValue('SLS');
    await component.save();
    expect(sent().category.nickname).toBe('SLS');
  });

  it('calls addPrinter once on a double click', async () => {
    await setup();
    const response = new Subject<PrinterDetail>();
    printers.addPrinter.mockReturnValue(response);
    component.selectCatalogPrinter(MK4);
    fixture.detectChanges();
    const button = byTestId<HTMLButtonElement>('quick-add-save')!;

    button.click();
    button.click();
    void component.save();

    expect(printers.addPrinter).toHaveBeenCalledTimes(1);
    expect(component.saving()).toBe(true);
  });

  it('acknowledges the email notice only when it was shown', async () => {
    await setup(false);
    component.selectCatalogPrinter(MK4);
    await component.save();
    expect(onboarding.acknowledgeEmailNotice).not.toHaveBeenCalled();

    fixture.destroy();
    await setup(true);
    component.selectCatalogPrinter(MK4);
    await component.save();
    expect(onboarding.acknowledgeEmailNotice).toHaveBeenCalledTimes(1);
  });

  it('shows the API message on error and does not emit', async () => {
    await setup();
    printers.addPrinter.mockReturnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 400,
            error: { message: 'Printer limit reached' },
          })
      )
    );
    component.selectCatalogPrinter(MK4);

    await component.save();
    fixture.detectChanges();

    expect(saved.length).toBe(0);
    expect(component.saving()).toBe(false);
    expect(host().textContent).toContain('Printer limit reached');
  });

  it('shows the generic copy for an HTML 502 body', async () => {
    await setup();
    printers.addPrinter.mockReturnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 502,
            url: 'https://api.3dprintlog.com/api/Printers/',
            error: '<html><body><h1>502 Bad Gateway</h1></body></html>',
          })
      )
    );
    component.selectCatalogPrinter(MK4);

    await component.save();
    fixture.detectChanges();

    expect(byTestId('quick-add-error')!.textContent!.trim()).toBe(
      'We could not save the printer. Try again.'
    );
  });

  it('keeps Save disabled after a successful save, so a second click creates nothing', async () => {
    await setup();
    component.selectCatalogPrinter(MK4);
    fixture.detectChanges();
    const button = () => byTestId<HTMLButtonElement>('quick-add-save')!;

    button().click();
    await fixture.whenStable();
    await new Promise((r) => setTimeout(r));
    fixture.detectChanges();
    expect(saved.length).toBe(1);

    button().click();
    await component.save();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(printers.addPrinter).toHaveBeenCalledTimes(1);
    expect(button().disabled).toBe(true);
  });

  it('saves typed text without a blur: one click confirms, the next saves once', async () => {
    await setup();
    typeInSearch('Voron 2.4');

    const button = byTestId<HTMLButtonElement>('quick-add-save')!;
    expect(button.disabled).toBe(false);
    button.click();
    await fixture.whenStable();
    await new Promise((r) => setTimeout(r));
    fixture.detectChanges();
    expect(printers.addPrinter).not.toHaveBeenCalled();
    button.click();
    await fixture.whenStable();
    await new Promise((r) => setTimeout(r));

    expect(printers.addPrinter).toHaveBeenCalledTimes(1);
    expect(sent().make).toBe('Voron');
    expect(sent().model).toBe('2.4');
    expect(sent().name).toBe('2.4');
  });

  it('submits on Enter (form submit) with typed text', async () => {
    await setup();
    typeInSearch('Ender 3');
    const form = host().querySelector('form') as HTMLFormElement;

    // The first Enter opens make, model and type to confirm; the second saves.
    form.requestSubmit();
    await fixture.whenStable();
    await new Promise((r) => setTimeout(r));
    fixture.detectChanges();
    form.requestSubmit();
    await fixture.whenStable();
    await new Promise((r) => setTimeout(r));

    expect(printers.addPrinter).toHaveBeenCalledTimes(1);
  });

  it('marks the fields touched and explains an empty Save instead of disabling it', async () => {
    await setup();
    const button = byTestId<HTMLButtonElement>('quick-add-save')!;
    expect(button.disabled).toBe(false);

    button.click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(printers.addPrinter).not.toHaveBeenCalled();
    expect(component.form.controls.name.touched).toBe(true);
    expect(byTestId('quick-add-error')!.textContent).toContain(
      'Search for your printer, or type its make and model.'
    );
  });

  describe('popular printers', () => {
    let popular: Subject<PrinterModel[]>;

    beforeEach(() => {
      popular = new Subject<PrinterModel[]>();
      catalog.popular.mockReturnValue(popular);
    });

    it('renders a text chip per popular model, each with an accessible name', async () => {
      await setup();
      popular.next([P1S, MK4]);
      popular.complete();
      fixture.detectChanges();

      const chip = byTestId<HTMLButtonElement>('popular-printer-bambu-lab-p1s');
      expect(chip).not.toBeNull();
      expect(chip!.getAttribute('aria-label')).toBe('Bambu Lab P1S');
      expect(chip!.textContent).toContain('Bambu Lab');
      expect(chip!.textContent).toContain('P1S');
      expect(chip!.querySelector('img, svg, mat-icon')).toBeNull();
      expect(byTestId('popular-printer-prusa-mk4')).not.toBeNull();
      expect(host().textContent).toContain('Popular printers');
    });

    it('selects the model on a chip click and logs the click', async () => {
      await setup();
      popular.next([P1S, MK4]);
      fixture.detectChanges();

      byTestId<HTMLButtonElement>('popular-printer-bambu-lab-p1s')!.click();
      fixture.detectChanges();

      expect(component.form.controls.make.value).toBe('Bambu Lab');
      expect(component.form.controls.model.value).toBe('P1S');
      expect(logging.logEvent).toHaveBeenCalledWith(
        'QuickAddPrinter_PopularChipClicked',
        { id: 'bambu-lab-p1s' }
      );
      // The grid only shows while nothing is selected.
      expect(byTestId('popular-printer-prusa-mk4')).toBeNull();

      await component.save();
      expect(logging.logEvent).toHaveBeenCalledWith(
        'QuickAddPrinter_Saved',
        expect.objectContaining({
          catalogModelId: 'bambu-lab-p1s',
          popularChip: true,
          specsEdited: false,
        })
      );
    });

    it('hides the grid while the search box has text', async () => {
      await setup();
      popular.next([P1S]);
      fixture.detectChanges();

      typeInSearch('Vor');

      expect(byTestId('popular-printer-bambu-lab-p1s')).toBeNull();
    });

    it('renders no grid when popular() fails soft, and free text still saves', async () => {
      await setup();
      popular.next([]);
      popular.complete();
      fixture.detectChanges();

      expect(host().querySelector('[data-testid^="popular-printer-"]')).toBe(
        null
      );
      expect(host().textContent).not.toContain('Popular printers');

      typeInSearch('Voron 2.4');
      await saveFreeText();

      expect(sent().make).toBe('Voron');
      expect(sent().catalogModelId).toBeNull();
      expect(logging.logEvent).toHaveBeenCalledWith(
        'QuickAddPrinter_NotListed',
        { query: 'Voron 2.4' }
      );
    });

    it('fits two chips per row at a 390px phone width without overflow', async () => {
      await setup();
      popular.next([P1S, MK4, MARS, catalogModel('Creality', 'Ender-3 V3')]);
      fixture.detectChanges();
      // 390px viewport minus the 16px gutters on each side.
      host().style.width = '358px';

      const grid = byTestId('popular-printers')!;
      const chips = Array.from(
        grid.querySelectorAll<HTMLElement>('[data-testid^="popular-printer-"]')
      );
      const gridBox = grid.getBoundingClientRect();
      expect(grid.scrollWidth).toBeLessThanOrEqual(grid.clientWidth);
      for (const chip of chips) {
        const box = chip.getBoundingClientRect();
        expect(box.right).toBeLessThanOrEqual(gridBox.right + 0.5);
        // A tap target at least 44px tall.
        expect(box.height).toBeGreaterThanOrEqual(44);
      }
      const firstRowTop = chips[0].getBoundingClientRect().top;
      expect(chips[1].getBoundingClientRect().top).toBe(firstRowTop);
    });
  });

  describe('search', () => {
    it('feeds the autocomplete from catalog.search after a 150 ms debounce', async () => {
      const results = new Subject<PrinterModel[]>();
      catalog.search.mockReturnValue(results);
      await setup();

      typeInSearch('P1');
      expect(catalog.search).not.toHaveBeenCalled();
      await new Promise((r) => setTimeout(r, 200));

      expect(catalog.search).toHaveBeenCalledTimes(1);

      expect(catalog.search).toHaveBeenCalledWith('P1');
      results.next([P1S]);
      expect(component.suggestions()).toEqual([P1S]);
    });

    it('drops a stale response when the query changes (switchMap)', async () => {
      const first = new Subject<PrinterModel[]>();
      const second = new Subject<PrinterModel[]>();
      const responses: Observable<PrinterModel[]>[] = [first, second];
      catalog.search.mockImplementation(() => responses.shift()!);
      await setup();

      typeInSearch('P1');
      await new Promise((r) => setTimeout(r, 200));
      typeInSearch('MK');
      await new Promise((r) => setTimeout(r, 200));
      second.next([MK4]);
      first.next([P1S]);

      expect(component.suggestions()).toEqual([MK4]);
    });
  });

  describe('spec defaults', () => {
    it('selecting P1S sets the type, slots, nozzle and summary', async () => {
      await setup();

      component.selectCatalogPrinter(P1S);
      fixture.detectChanges();
      openSpecs();

      expect(component.form.controls.type.value).toBe('FFF');
      expect(component.form.controls.multiMaterial.value).toBe(true);
      expect(component.form.controls.slotCount.value).toBe(4);
      expect(component.form.controls.slotCount.enabled).toBe(true);
      const nozzle = byTestId<HTMLButtonElement>('nozzle-0.4')!;
      expect(nozzle.getAttribute('aria-pressed')).toBe('true');
      expect(
        byTestId<HTMLButtonElement>('nozzle-0.6')!.getAttribute('aria-pressed')
      ).toBe('false');
      expect(byTestId('spec-summary')!.textContent!.trim()).toBe(
        '256 × 256 × 256 mm · 0.4 mm nozzle · 1.75 mm · heated bed · 4 slots'
      );
    });

    it('drops the slicer-profile attribution line from quick add', async () => {
      await setup();
      component.selectCatalogPrinter(P1S);
      fixture.detectChanges();
      openSpecs();

      expect(host().querySelector('a[href="/docs/about"]')).toBeNull();
      expect(host().textContent).not.toContain('Cura and OrcaSlicer');
      expect(host().textContent).not.toContain('Specs from');
    });

    it('sends the catalog id and specs, with the chosen nozzle', async () => {
      await setup();
      component.selectCatalogPrinter(P1S);
      fixture.detectChanges();
      openSpecs();

      byTestId<HTMLButtonElement>('nozzle-0.6')!.click();
      fixture.detectChanges();
      expect(byTestId('spec-summary')!.textContent).toContain('0.6 mm nozzle');
      await component.save();

      expect(sent().catalogModelId).toBe('bambu-lab-p1s');
      expect(sent().nozzleDiameter).toBe(0.6);
      expect(sent().filamentDiameter).toBe(1.75);
      expect(sent().bedWidthMm).toBe(256);
      expect(sent().bedDepthMm).toBe(256);
      expect(sent().bedHeightMm).toBe(256);
      expect(sent().hasHeatedBed).toBe(true);
      expect(sent().hasHeatedChamber).toBe(false);
      expect(sent().slotCount).toBe(4);
      expect(logging.logEvent).toHaveBeenCalledWith(
        'QuickAddPrinter_Saved',
        expect.objectContaining({ specsEdited: true })
      );
    });

    it('sends an edited bed width, not the catalog value', async () => {
      await setup();
      component.selectCatalogPrinter(P1S);
      fixture.detectChanges();

      byTestId<HTMLButtonElement>('edit-specs')!.click();
      fixture.detectChanges();
      const width = host().querySelector(
        'input[formcontrolname="bedWidthMm"]'
      ) as HTMLInputElement;
      expect(width.value).toBe('256');
      expect(
        host().querySelector('input[formcontrolname="bedDepthMm"]')
      ).not.toBeNull();
      expect(
        host().querySelector('input[formcontrolname="bedHeightMm"]')
      ).not.toBeNull();
      expect(
        host().querySelector('input[formcontrolname="filamentDiameter"]')
      ).not.toBeNull();
      expect(
        host().querySelector('[formcontrolname="hasHeatedBed"]')
      ).not.toBeNull();
      expect(
        host().querySelector('[formcontrolname="hasHeatedChamber"]')
      ).not.toBeNull();
      width.value = '300';
      width.dispatchEvent(new Event('input'));
      fixture.detectChanges();
      await component.save();

      expect(sent().bedWidthMm).toBe(300);
      expect(sent().bedDepthMm).toBe(256);
      expect(logging.logEvent).toHaveBeenCalledWith(
        'QuickAddPrinter_Saved',
        expect.objectContaining({ specsEdited: true })
      );
    });

    it('hides the nozzle and spec fields until Adjust specs is pressed', async () => {
      await setup();
      component.selectCatalogPrinter(P1S);
      fixture.detectChanges();

      expect(
        host().querySelector('input[formcontrolname="bedWidthMm"]')
      ).toBeNull();
      expect(byTestId('nozzle-0.4')).toBeNull();
      const adjust = byTestId<HTMLButtonElement>('edit-specs')!;
      expect(adjust.textContent!.trim()).toBe('Adjust specs');
      expect(adjust.getAttribute('aria-expanded')).toBe('false');

      openSpecs();
      expect(byTestId('nozzle-0.4')).not.toBeNull();
    });

    it('a hand edit of make after a pick drops only the catalog id', async () => {
      await setup();
      component.selectCatalogPrinter(P1S);
      component.showManual.set(true);
      fixture.detectChanges();

      // The make field only shows on the manual path, so the edit goes through the handler.
      component.form.controls.make.setValue('Bambu');
      component.onManualInput();
      fixture.detectChanges();

      // The specs stay visible and editable.
      expect(byTestId('spec-summary')!.textContent).toContain('256 × 256');
      openSpecs();
      expect(
        byTestId<HTMLButtonElement>('nozzle-0.4')!.getAttribute('aria-pressed')
      ).toBe('true');
      byTestId<HTMLButtonElement>('nozzle-0.6')!.click();
      fixture.detectChanges();
      await component.save();

      expect(sent().catalogModelId).toBeNull();
      // The search box still reads "Bambu Lab P1S"; it must not overwrite the hand edit.
      expect(sent().make).toBe('Bambu');
      expect(sent().model).toBe('P1S');
      expect(sent().bedWidthMm).toBe(256);
      expect(sent().nozzleDiameter).toBe(0.6);
      expect(sent().slotCount).toBe(4);
      expect(logging.logEvent).not.toHaveBeenCalledWith(
        'QuickAddPrinter_NotListed',
        expect.anything()
      );
    });

    it('typing over a pick keeps a type the user changed', async () => {
      await setup();
      component.selectCatalogPrinter(P1S);
      component.form.controls.type.setValue('MSLA');

      typeOverPick('Voron 2.4');
      await saveFreeText();

      expect(sent().category.nickname).toBe('MSLA');
      expect(sent().bedWidthMm).toBeUndefined();
    });

    it('typing over a pick keeps a slot count the user changed', async () => {
      await setup();
      component.selectCatalogPrinter(P1S);
      component.form.controls.slotCount.setValue(8);

      typeOverPick('Voron 2.4');

      expect(component.form.controls.multiMaterial.value).toBe(true);
      expect(component.form.controls.slotCount.value).toBe(8);
      await saveFreeText();
      expect(sent().slotCount).toBe(8);
    });

    it('typing over a pick keeps an edited spec and resets the rest', async () => {
      await setup();
      component.selectCatalogPrinter(P1S);
      component.form.controls.bedWidthMm.setValue(300);
      fixture.detectChanges();

      typeOverPick('Voron 2.4');
      fixture.detectChanges();

      // The kept value stays reachable, so nothing is sent unseen.
      byTestId<HTMLButtonElement>('edit-specs')!.click();
      fixture.detectChanges();
      expect(
        (
          host().querySelector(
            'input[formcontrolname="bedWidthMm"]'
          ) as HTMLInputElement
        ).value
      ).toBe('300');
      await saveFreeText();
      expect(sent().catalogModelId).toBeNull();
      expect(sent().bedWidthMm).toBe(300);
      expect(sent().bedDepthMm).toBeUndefined();
      expect(sent().nozzleDiameter).toBeNull();
    });

    it('does not log NotListed after a catalog pick in this session', async () => {
      await setup();
      component.selectCatalogPrinter(P1S);
      typeOverPick('Voron 2.4');

      await saveFreeText();

      expect(logging.logEvent).not.toHaveBeenCalledWith(
        'QuickAddPrinter_NotListed',
        expect.anything()
      );
    });

    it('typing over an unedited pick resets every field the catalog set', async () => {
      await setup();
      component.selectCatalogPrinter(P1S);
      fixture.detectChanges();

      typeOverPick('Bambu Lab P1');
      expect(byTestId('spec-summary')).toBeNull();
      expect(byTestId('nozzle-0.4')).toBeNull();
      expect(component.form.controls.multiMaterial.value).toBe(false);
      typeInSearch('Voron 2.4');
      await saveFreeText();

      expect(sent().catalogModelId).toBeNull();
      expect(sent().nozzleDiameter).toBeNull();
      expect(sent().filamentDiameter).toBeNull();
      expect(sent().bedWidthMm).toBeUndefined();
      expect(sent().hasHeatedBed).toBeUndefined();
      expect(sent().slotCount).toBe(1);
      expect(sent().make).toBe('Voron');
    });

    it('caps the not-listed query at 40 characters', async () => {
      await setup();
      typeInSearch(`  ${'x'.repeat(50)}  `);

      await saveFreeText();

      expect(logging.logEvent).toHaveBeenCalledWith(
        'QuickAddPrinter_NotListed',
        { query: 'x'.repeat(40) }
      );
      expect(logging.logEvent).toHaveBeenCalledWith(
        'QuickAddPrinter_Saved',
        expect.objectContaining({
          fromCatalog: false,
          catalogModelId: null,
          popularChip: false,
          specsEdited: false,
        })
      );
    });

    it('does not log NotListed for a catalog save', async () => {
      await setup();
      component.selectCatalogPrinter(P1S);

      await component.save();

      expect(logging.logEvent).not.toHaveBeenCalledWith(
        'QuickAddPrinter_NotListed',
        expect.anything()
      );
    });
  });

  describe('simplified step', () => {
    let popular: Subject<PrinterModel[]>;

    beforeEach(() => {
      popular = new Subject<PrinterModel[]>();
      catalog.popular.mockReturnValue(popular);
    });

    function typeToggle(): HTMLElement | null {
      return host().querySelector('mat-button-toggle-group');
    }

    function input(name: string): HTMLInputElement | null {
      return host().querySelector(`input[formcontrolname="${name}"]`);
    }

    it('leads with the popular grid, then an outlined search, then the manual link', async () => {
      await setup();
      popular.next([P1S, MK4]);
      fixture.detectChanges();

      const grid = byTestId('popular-printers')!;
      const search = byTestId<HTMLInputElement>('printer-search')!;
      const manual = byTestId<HTMLButtonElement>('manual-toggle')!;
      const order = (a: Node, b: Node) =>
        a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING;
      expect(order(grid, search)).toBeTruthy();
      expect(order(search, manual)).toBeTruthy();

      const field = search.closest('mat-form-field')!;
      expect(field.classList).toContain('mat-form-field-appearance-outline');
      expect(field.textContent).toContain('Search 900+ printers');
      expect(field.querySelector('mat-icon')!.textContent!.trim()).toBe(
        'search'
      );
      expect(search.placeholder).toBe('e.g. Bambu Lab X1C');
      expect(manual.textContent!.trim()).toBe(
        "Can't find yours? Enter it manually"
      );
      expect(host().textContent).not.toContain('Not listed?');
    });

    it('shows no make, model, type or nickname before a pick', async () => {
      await setup();

      expect(input('make')).toBeNull();
      expect(input('model')).toBeNull();
      expect(input('name')).toBeNull();
      expect(typeToggle()).toBeNull();
    });

    it('a pick hides the grid, search and type toggle and shows one confirmation card', async () => {
      await setup();
      popular.next([P1S, MK4]);
      fixture.detectChanges();

      byTestId<HTMLButtonElement>('popular-printer-bambu-lab-p1s')!.click();
      fixture.detectChanges();

      expect(byTestId('popular-printers')).toBeNull();
      expect(byTestId('printer-search')).toBeNull();
      expect(byTestId('manual-toggle')).toBeNull();
      expect(typeToggle()).toBeNull();
      const card = byTestId('picked-printer')!;
      expect(card.querySelector('strong')!.textContent!.trim()).toBe(
        'Bambu Lab P1S'
      );
      expect(card.querySelector('mat-icon')!.textContent!.trim()).toBe(
        'check_circle'
      );
      expect(byTestId('change-printer')!.textContent!.trim()).toBe('Change');
      expect(card.querySelector('[data-testid="spec-summary"]')).not.toBeNull();
    });

    it('shows the type toggle and make/model only on the manual path', async () => {
      await setup();

      byTestId<HTMLButtonElement>('manual-toggle')!.click();
      fixture.detectChanges();

      expect(typeToggle()).not.toBeNull();
      expect(input('make')).not.toBeNull();
      expect(input('model')).not.toBeNull();
      expect(byTestId('printer-search')).toBeNull();
    });

    it('shows the nickname on the manual path once make or model has text', async () => {
      await setup();
      byTestId<HTMLButtonElement>('manual-toggle')!.click();
      fixture.detectChanges();
      expect(input('name')).toBeNull();

      const model = input('model')!;
      model.value = 'Trident';
      model.dispatchEvent(new Event('input'));
      fixture.detectChanges();

      expect(input('name')!.value).toBe('Trident');
    });

    it('labels the name "Nickname" with a hint, prefilled with the model', async () => {
      await setup();
      component.selectCatalogPrinter(P1S);
      fixture.detectChanges();

      const field = input('name')!.closest('mat-form-field')!;
      expect(field.querySelector('mat-label')!.textContent!.trim()).toBe(
        'Nickname'
      );
      expect(field.querySelector('mat-hint')!.textContent!.trim()).toBe(
        'What it\'s called in your log, e.g. "Garage P1S".'
      );
      expect(input('name')!.value).toBe('P1S');
    });

    it('starts the AMS checkbox checked for a multi-slot model and shows the slot count', async () => {
      await setup();
      component.selectCatalogPrinter(P1S);
      fixture.detectChanges();

      const box = host().querySelector(
        '[data-testid="multi-material"] input'
      ) as HTMLInputElement;
      expect(byTestId('multi-material')!.textContent!.trim()).toBe(
        'I use an AMS / multi-material unit'
      );
      expect(box.checked).toBe(true);
      expect(input('slotCount')!.value).toBe('4');

      box.click();
      fixture.detectChanges();
      expect(input('slotCount')).toBeNull();
    });

    it('leaves the AMS checkbox off for a single-slot model', async () => {
      await setup();
      component.selectCatalogPrinter(MK4);
      fixture.detectChanges();

      const box = host().querySelector(
        '[data-testid="multi-material"] input'
      ) as HTMLInputElement;
      expect(box.checked).toBe(false);
      expect(input('slotCount')).toBeNull();
    });

    it('Change clears the pick and restores the grid and search', async () => {
      await setup();
      popular.next([P1S, MK4]);
      fixture.detectChanges();
      byTestId<HTMLButtonElement>('popular-printer-bambu-lab-p1s')!.click();
      fixture.detectChanges();

      byTestId<HTMLButtonElement>('change-printer')!.click();
      fixture.detectChanges();

      expect(component.catalogModel()).toBeNull();
      expect(byTestId('picked-printer')).toBeNull();
      expect(byTestId('popular-printer-bambu-lab-p1s')).not.toBeNull();
      expect(byTestId<HTMLInputElement>('printer-search')!.value).toBe('');
      expect(byTestId('spec-summary')).toBeNull();
      expect(component.form.controls.make.value).toBe('');
      expect(component.form.controls.multiMaterial.value).toBe(false);
      expect(logging.logEvent).toHaveBeenCalledWith(
        'QuickAddPrinter_PickChanged',
        { id: 'bambu-lab-p1s' }
      );
    });

    it('shows no validation message until a save is attempted', async () => {
      await setup(false, null, 'welcome');
      typeInSearch('Vor');
      typeInSearch('');

      expect(byTestId('quick-add-error')).toBeNull();
    });
  });

  describe('confirming an unlisted printer', () => {
    async function clickPrimary(): Promise<void> {
      byTestId<HTMLButtonElement>('quick-add-save')!.click();
      await fixture.whenStable();
      await new Promise((r) => setTimeout(r));
      fixture.detectChanges();
    }

    function field(name: string): HTMLInputElement | null {
      return host().querySelector(`input[formcontrolname="${name}"]`);
    }

    it('opens the manual section prefilled instead of saving free text on the first click', async () => {
      await setup();
      typeInSearch('Elegoo Saturn 4');

      await clickPrimary();

      expect(printers.addPrinter).not.toHaveBeenCalled();
      expect(field('make')!.value).toBe('Elegoo');
      expect(field('model')!.value).toBe('Saturn 4');
      expect(host().querySelector('mat-button-toggle-group')).not.toBeNull();
      expect(byTestId('quick-add-hint')!.textContent!.trim()).toBe(
        'Check the make, model and type, then save.'
      );
      expect(byTestId('quick-add-error')).toBeNull();

      const resin = Array.from(
        host().querySelectorAll<HTMLButtonElement>('mat-button-toggle button')
      ).find((b) => b.textContent!.trim() === 'Resin')!;
      resin.click();
      fixture.detectChanges();
      await clickPrimary();

      expect(printers.addPrinter).toHaveBeenCalledTimes(1);
      expect(sent().make).toBe('Elegoo');
      expect(sent().model).toBe('Saturn 4');
      expect(sent().category.nickname).toBe('MSLA');
    });

    it('saves on the first click when the manual section is already open', async () => {
      await setup();
      byTestId<HTMLButtonElement>('manual-toggle')!.click();
      fixture.detectChanges();
      component.form.patchValue({ make: 'Voron', model: 'Trident' });
      fixture.detectChanges();

      await clickPrimary();

      expect(printers.addPrinter).toHaveBeenCalledTimes(1);
    });

    it('welcome mode: "Save and add another" also stops to confirm free text', async () => {
      await setup(false, null, 'welcome');
      typeInSearch('Elegoo Saturn 4');

      await component.saveAndAddAnother();
      fixture.detectChanges();

      expect(printers.addPrinter).not.toHaveBeenCalled();
      expect(component.showManual()).toBe(true);
      expect(continued).toBe(0);
    });
  });

  describe('welcome mode', () => {
    let popular: Subject<PrinterModel[]>;

    beforeEach(() => {
      popular = new Subject<PrinterModel[]>();
      catalog.popular.mockReturnValue(popular);
    });

    async function settleSave(): Promise<void> {
      await fixture.whenStable();
      await new Promise((r) => setTimeout(r));
      fixture.detectChanges();
    }

    it('offers "Add printer and continue" and "Save and add another"', async () => {
      await setup(false, null, 'welcome');

      expect(buttonLabels()).toEqual([
        'Save and add another',
        'Add printer and continue',
      ]);
      expect(
        byTestId<HTMLButtonElement>('quick-add-save')!.classList
      ).toContain('mat-primary');
    });

    it('"Add printer and continue" saves, then asks to continue, then resets', async () => {
      await setup(false, null, 'welcome');
      component.selectCatalogPrinter(MK4);
      fixture.detectChanges();

      byTestId<HTMLButtonElement>('quick-add-save')!.click();
      await settleSave();

      expect(printers.addPrinter).toHaveBeenCalledTimes(1);
      expect(saved.length).toBe(1);
      expect(continued).toBe(1);
      expect(component.catalogModel()).toBeNull();
      expect(byTestId<HTMLButtonElement>('quick-add-save')!.disabled).toBe(
        false
      );
    });

    it('"Save and add another" saves, resets to the grid and does not continue', async () => {
      await setup(false, null, 'welcome');
      popular.next([P1S, MK4]);
      fixture.detectChanges();
      byTestId<HTMLButtonElement>('popular-printer-bambu-lab-p1s')!.click();
      fixture.detectChanges();
      component.onNameInput();
      component.form.controls.name.setValue('Garage P1S');

      byTestId<HTMLButtonElement>('quick-add-save-another')!.click();
      await settleSave();

      expect(sent().name).toBe('Garage P1S');
      expect(sent().catalogModelId).toBe('bambu-lab-p1s');
      expect(saved.length).toBe(1);
      expect(continued).toBe(0);
      expect(logging.logEvent).toHaveBeenCalledWith(
        'QuickAddPrinter_SaveAndAddAnother',
        { source: 'welcome' }
      );
      // Back to the start: grid, empty search, a name that follows the model again.
      expect(byTestId('picked-printer')).toBeNull();
      expect(byTestId('popular-printer-bambu-lab-p1s')).not.toBeNull();
      expect(byTestId<HTMLInputElement>('printer-search')!.value).toBe('');
      expect(component.form.controls.multiMaterial.value).toBe(false);
      expect(component.form.controls.nozzleDiameter.value).toBeNull();
      component.selectCatalogPrinter(MK4);
      expect(component.form.controls.name.value).toBe('MK4');
    });

    it('a second printer saves after "Save and add another"', async () => {
      await setup(false, null, 'welcome');
      component.selectCatalogPrinter(P1S);
      await component.saveAndAddAnother();
      fixture.detectChanges();

      component.selectCatalogPrinter(MK4);
      await component.saveAndAddAnother();

      expect(printers.addPrinter).toHaveBeenCalledTimes(2);
      expect(sent().catalogModelId).toBe('prusa-mk4');
    });

    it('reads "Continue" with a saved printer and nothing new, and only continues', async () => {
      await setup(false, null, 'welcome', true);

      expect(buttonLabels()).toEqual(['Continue']);
      expect(byTestId('quick-add-save-another')).toBeNull();

      byTestId<HTMLButtonElement>('quick-add-save')!.click();
      await settleSave();

      expect(continued).toBe(1);
      expect(printers.addPrinter).not.toHaveBeenCalled();
      expect(byTestId('quick-add-error')).toBeNull();
    });

    it('switches back to saving once something is typed or picked', async () => {
      await setup(false, null, 'welcome', true);

      typeInSearch('Voron 2.4');
      expect(buttonLabels()).toEqual([
        'Save and add another',
        'Add printer and continue',
      ]);

      typeInSearch('');
      expect(buttonLabels()).toEqual(['Continue']);

      component.selectCatalogPrinter(MK4);
      fixture.detectChanges();
      expect(buttonLabels()).toEqual([
        'Save and add another',
        'Add printer and continue',
      ]);
    });

    it('explains an empty save when there is no printer yet', async () => {
      await setup(false, null, 'welcome');

      byTestId<HTMLButtonElement>('quick-add-save')!.click();
      await settleSave();

      expect(printers.addPrinter).not.toHaveBeenCalled();
      expect(continued).toBe(0);
      expect(byTestId('quick-add-error')!.textContent).toContain(
        'Search for your printer, or type its make and model.'
      );
    });

    it('keeps the pick and does not continue when the save fails', async () => {
      await setup(false, null, 'welcome');
      printers.addPrinter.mockReturnValue(throwError(() => new Error('down')));
      component.selectCatalogPrinter(MK4);

      await component.submit();
      fixture.detectChanges();

      expect(continued).toBe(0);
      expect(component.catalogModel()).toBe(MK4);
      expect(byTestId('quick-add-error')).not.toBeNull();
    });
  });

  describe('initialModelId', () => {
    it('loads and preselects the model', async () => {
      const model = new Subject<PrinterModel | null>();
      catalog.get.mockReturnValue(model);
      await setup(false, 'bambu-lab-p1s');

      model.next(P1S);
      model.complete();
      fixture.detectChanges();

      expect(catalog.get).toHaveBeenCalledWith('bambu-lab-p1s');
      expect(component.form.controls.search.value).toBe('Bambu Lab P1S');
      expect(component.form.controls.make.value).toBe('Bambu Lab');
      expect(byTestId('spec-summary')).not.toBeNull();
      await component.save();
      expect(sent().catalogModelId).toBe('bambu-lab-p1s');
    });

    it('leaves the form empty when the id is unknown', async () => {
      catalog.get.mockReturnValue(of(null));
      await setup(false, 'nope');

      expect(component.form.controls.search.value).toBe('');
      expect(byTestId('spec-summary')).toBeNull();
    });
  });

  describe('initialName and initialSearch', () => {
    it('keeps the given nickname over the model a pick fills in', async () => {
      catalog.get.mockReturnValue(of(P1S));
      await setup(false, 'bambu-lab-p1s', 'dialog', false, {
        initialName: 'Workshop P1S',
      });

      expect(component.form.controls.model.value).toBe('P1S');
      expect(component.form.controls.name.value).toBe('Workshop P1S');
      await component.save();
      expect(sent().name).toBe('Workshop P1S');
    });

    it('starts the search with the given text when there is no catalog id', async () => {
      await setup(false, null, 'dialog', false, {
        initialSearch: 'Voron 2.4',
      });

      expect(component.form.controls.search.value).toBe('Voron 2.4');
    });
  });
});

describe('QuickAddPrinterComponent with the real catalog service', () => {
  it('renders on the first detectChanges without throwing', () => {
    TestBed.configureTestingModule({
      imports: [QuickAddPrinterComponent, NoopAnimationsModule],
      providers: [
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
        { provide: PrinterService, useValue: {} },
        { provide: LoggingService, useValue: { logEvent: () => undefined } },
        { provide: OnboardingService, useValue: {} },
        {
          provide: PrinterCategoryService,
          useValue: { getPrinterCategories: () => of([]) },
        },
      ],
    });
    const fixture = TestBed.createComponent(QuickAddPrinterComponent);
    fixture.componentRef.setInput('source', 'welcome');

    expect(() => fixture.detectChanges()).not.toThrow();
    expect(TestBed.inject(PrinterCatalogService)).toBeTruthy();
  });
});

describe('openQuickAddPrinterDialog', () => {
  it('opens the dialog with the desktop sizing and returns its ref', () => {
    const ref = {} as MatDialogRef<QuickAddPrinterDialogComponent>;
    const dialog = {
      open: vi.fn().mockName('MatDialog.open'),
    };
    dialog.open.mockReturnValue(ref);
    const data = { source: 'checklist' as const, showEmailNotice: true };

    const result = openQuickAddPrinterDialog(
      dialog as unknown as MatDialog,
      data
    );

    expect(result).toBe(ref);
    const [component, config] = vi.mocked(dialog.open).mock.lastCall;
    expect(component).toBe(QuickAddPrinterDialogComponent);
    expect(config?.data).toEqual(data);
    expect(config?.width).toBe('min(30rem, 100vw - 2rem)');
    expect(config?.maxWidth).toBe('100vw');
    expect(config?.autoFocus).toBe('first-tabbable');
  });

  function setupDialog(data: object) {
    const ref = {
      close: vi.fn().mockName('ref.close'),
    };
    const catalog = {
      search: vi.fn().mockName('PrinterCatalogService.search'),
      popular: vi.fn().mockName('PrinterCatalogService.popular'),
      get: vi.fn().mockName('PrinterCatalogService.get'),
    };
    catalog.search.mockReturnValue(of([]));
    catalog.popular.mockReturnValue(of([]));
    catalog.get.mockReturnValue(of(P1S));
    TestBed.configureTestingModule({
      imports: [QuickAddPrinterDialogComponent, NoopAnimationsModule],
      providers: [
        { provide: MatDialogRef, useValue: ref },
        { provide: MAT_DIALOG_DATA, useValue: data },
        { provide: PrinterService, useValue: {} },
        { provide: LoggingService, useValue: { logEvent: () => undefined } },
        { provide: OnboardingService, useValue: {} },
        { provide: PrinterCatalogService, useValue: catalog },
        {
          provide: PrinterCategoryService,
          useValue: { getPrinterCategories: () => of([]) },
        },
      ],
    });
    const dialogFixture = TestBed.createComponent(
      QuickAddPrinterDialogComponent
    );
    return { ref, catalog, dialogFixture };
  }

  it('closes with the saved printer', () => {
    const { ref, dialogFixture } = setupDialog({
      source: 'print-form',
      showEmailNotice: false,
    });
    const printer = { id: 3 } as PrinterDetail;

    dialogFixture.detectChanges();

    const cancel = (dialogFixture.nativeElement as HTMLElement).querySelector(
      'mat-dialog-actions button'
    ) as HTMLButtonElement;
    // A styled Material button, not a bare native one.
    expect(cancel.classList).toContain('mat-mdc-button');

    dialogFixture.componentInstance.onSaved(printer);

    expect(ref.close).toHaveBeenCalledWith(printer);
  });

  it('passes initialModelId through to the quick-add form', () => {
    const { catalog, dialogFixture } = setupDialog({
      source: 'print-form',
      showEmailNotice: false,
      initialModelId: 'bambu-lab-p1s',
    });

    dialogFixture.detectChanges();

    expect(catalog.get).toHaveBeenCalledWith('bambu-lab-p1s');
  });
});
