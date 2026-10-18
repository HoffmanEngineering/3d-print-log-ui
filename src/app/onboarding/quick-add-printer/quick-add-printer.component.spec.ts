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
import { QuickAddPrinterComponent } from './quick-add-printer.component';

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
  let printers: jasmine.SpyObj<PrinterService>;
  let logging: jasmine.SpyObj<LoggingService>;
  let onboarding: jasmine.SpyObj<OnboardingService>;
  let catalog: jasmine.SpyObj<PrinterCatalogService>;
  let saved: PrinterDetail[];

  async function setup(
    showEmailNotice = false,
    initialModelId: string | null = null
  ) {
    fixture = TestBed.createComponent(QuickAddPrinterComponent);
    fixture.componentRef.setInput('source', 'welcome');
    fixture.componentRef.setInput('showEmailNotice', showEmailNotice);
    if (initialModelId) {
      fixture.componentRef.setInput('initialModelId', initialModelId);
    }
    component = fixture.componentInstance;
    saved = [];
    component.saved.subscribe((p) => saved.push(p));
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
    return printers.addPrinter.calls.mostRecent().args[0];
  }

  function typeInSearch(text: string): void {
    const search = host().querySelector(
      'input[formcontrolname="search"]'
    ) as HTMLInputElement;
    search.value = text;
    search.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  }

  beforeEach(() => {
    printers = jasmine.createSpyObj<PrinterService>('PrinterService', [
      'addPrinter',
    ]);
    printers.addPrinter.and.callFake((p) => of({ ...p, id: 7 }));
    logging = jasmine.createSpyObj<LoggingService>('LoggingService', [
      'logEvent',
    ]);
    onboarding = jasmine.createSpyObj<OnboardingService>('OnboardingService', [
      'acknowledgeEmailNotice',
    ]);
    onboarding.acknowledgeEmailNotice.and.resolveTo();
    catalog = jasmine.createSpyObj<PrinterCatalogService>(
      'PrinterCatalogService',
      ['search', 'popular', 'get', 'match']
    );
    catalog.search.and.returnValue(of([]));
    catalog.popular.and.returnValue(of([]));
    catalog.get.and.returnValue(of(null));
    catalog.match.and.returnValue(of(null));
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
      'mat-slide-toggle button'
    ) as HTMLButtonElement;

    toggle.click();
    fixture.detectChanges();
    component.form.controls.slotCount.setValue(1);
    fixture.detectChanges();
    toggle.click();
    fixture.detectChanges();

    const save = byTestId<HTMLButtonElement>('quick-add-save')!;
    expect(save.disabled).toBeFalse();
  });

  it('rejects a non-integer slot count while multi-material is on', async () => {
    await setup();
    component.form.controls.multiMaterial.setValue(true);

    component.form.controls.slotCount.setValue(2.5);
    expect(component.form.controls.slotCount.invalid).toBeTrue();

    component.form.controls.slotCount.setValue(3);
    expect(component.form.controls.slotCount.invalid).toBeFalse();
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
      jasmine.objectContaining({ multiSlot: true })
    );
  });

  it('saves an FFF printer by default and emits it', async () => {
    await setup();
    component.selectCatalogPrinter(MK4);

    await component.save();

    expect(sent().id).toBeNull();
    expect(sent().name).toBe('MK4');
    expect(sent().make).toBe('Prusa');
    expect(sent().isActive).toBeTrue();
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

  it('is a primary flat button labeled "Save printer"', async () => {
    await setup();
    const button = byTestId<HTMLButtonElement>('quick-add-save')!;
    expect(button.textContent!.trim()).toBe('Save printer');
    expect(button.classList).toContain('mat-primary');
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
    printers.addPrinter.and.returnValue(response);
    component.selectCatalogPrinter(MK4);
    fixture.detectChanges();
    const button = byTestId<HTMLButtonElement>('quick-add-save')!;

    button.click();
    button.click();
    void component.save();

    expect(printers.addPrinter).toHaveBeenCalledTimes(1);
    expect(component.saving()).toBeTrue();
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
    printers.addPrinter.and.returnValue(
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
    expect(component.saving()).toBeFalse();
    expect(host().textContent).toContain('Printer limit reached');
  });

  it('shows the generic copy for an HTML 502 body', async () => {
    await setup();
    printers.addPrinter.and.returnValue(
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
    expect(button().disabled).toBeTrue();
  });

  it('saves typed text without a blur: Save is enabled and one click saves once', async () => {
    await setup();
    typeInSearch('Voron 2.4');

    const button = byTestId<HTMLButtonElement>('quick-add-save')!;
    expect(button.disabled).toBeFalse();
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

    (host().querySelector('form') as HTMLFormElement).requestSubmit();
    await fixture.whenStable();
    await new Promise((r) => setTimeout(r));

    expect(printers.addPrinter).toHaveBeenCalledTimes(1);
  });

  it('marks the fields touched and explains an empty Save instead of disabling it', async () => {
    await setup();
    const button = byTestId<HTMLButtonElement>('quick-add-save')!;
    expect(button.disabled).toBeFalse();

    button.click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(printers.addPrinter).not.toHaveBeenCalled();
    expect(component.form.controls.name.touched).toBeTrue();
    expect(byTestId('quick-add-error')!.textContent).toContain(
      'Search for your printer, or type its make and model.'
    );
  });

  describe('popular printers', () => {
    let popular: Subject<PrinterModel[]>;

    beforeEach(() => {
      popular = new Subject<PrinterModel[]>();
      catalog.popular.and.returnValue(popular);
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
        jasmine.objectContaining({
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
      await component.save();

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
      catalog.search.and.returnValue(results);
      await setup();

      typeInSearch('P1');
      expect(catalog.search).not.toHaveBeenCalled();
      await new Promise((r) => setTimeout(r, 200));

      expect(catalog.search).toHaveBeenCalledOnceWith('P1');
      results.next([P1S]);
      expect(component.suggestions()).toEqual([P1S]);
    });

    it('drops a stale response when the query changes (switchMap)', async () => {
      const first = new Subject<PrinterModel[]>();
      const second = new Subject<PrinterModel[]>();
      const responses: Observable<PrinterModel[]>[] = [first, second];
      catalog.search.and.callFake(() => responses.shift()!);
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

      expect(component.form.controls.type.value).toBe('FFF');
      expect(component.form.controls.multiMaterial.value).toBeTrue();
      expect(component.form.controls.slotCount.value).toBe(4);
      expect(component.form.controls.slotCount.enabled).toBeTrue();
      const nozzle = byTestId<HTMLButtonElement>('nozzle-0.4')!;
      expect(nozzle.getAttribute('aria-pressed')).toBe('true');
      expect(
        byTestId<HTMLButtonElement>('nozzle-0.6')!.getAttribute('aria-pressed')
      ).toBe('false');
      expect(byTestId('spec-summary')!.textContent!.trim()).toBe(
        '256 × 256 × 256 mm · 0.4 mm nozzle · 1.75 mm · heated bed · 4 slots'
      );
      const link = host().querySelector(
        'a[href="/docs/about"]'
      ) as HTMLAnchorElement;
      expect(link).not.toBeNull();
      expect(link.closest('p')!.textContent!.trim()).toBe(
        'Specs from Cura and OrcaSlicer printer profiles'
      );
    });

    it('sends the catalog id and specs, with the chosen nozzle', async () => {
      await setup();
      component.selectCatalogPrinter(P1S);
      fixture.detectChanges();

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
      expect(sent().hasHeatedBed).toBeTrue();
      expect(sent().hasHeatedChamber).toBeFalse();
      expect(sent().slotCount).toBe(4);
      expect(logging.logEvent).toHaveBeenCalledWith(
        'QuickAddPrinter_Saved',
        jasmine.objectContaining({ specsEdited: true })
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
        jasmine.objectContaining({ specsEdited: true })
      );
    });

    it('hides the spec fields until Edit specs is pressed', async () => {
      await setup();
      component.selectCatalogPrinter(P1S);
      fixture.detectChanges();

      expect(
        host().querySelector('input[formcontrolname="bedWidthMm"]')
      ).toBeNull();
      expect(byTestId('edit-specs')!.getAttribute('aria-expanded')).toBe(
        'false'
      );
    });

    it('a hand edit of make after a pick drops only the catalog id', async () => {
      await setup();
      component.selectCatalogPrinter(P1S);
      component.showManual.set(true);
      fixture.detectChanges();

      const make = host().querySelector(
        'input[formcontrolname="make"]'
      ) as HTMLInputElement;
      make.value = 'Bambu';
      make.dispatchEvent(new Event('input'));
      fixture.detectChanges();

      // The specs stay visible and editable.
      expect(byTestId('spec-summary')!.textContent).toContain('256 × 256');
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
        jasmine.anything()
      );
    });

    it('typing over a pick keeps a type the user changed', async () => {
      await setup();
      component.selectCatalogPrinter(P1S);
      component.form.controls.type.setValue('MSLA');

      typeInSearch('Voron 2.4');
      await component.save();

      expect(sent().category.nickname).toBe('MSLA');
      expect(sent().bedWidthMm).toBeUndefined();
    });

    it('typing over a pick keeps a slot count the user changed', async () => {
      await setup();
      component.selectCatalogPrinter(P1S);
      component.form.controls.slotCount.setValue(8);

      typeInSearch('Voron 2.4');

      expect(component.form.controls.multiMaterial.value).toBeTrue();
      expect(component.form.controls.slotCount.value).toBe(8);
      await component.save();
      expect(sent().slotCount).toBe(8);
    });

    it('typing over a pick keeps an edited spec and resets the rest', async () => {
      await setup();
      component.selectCatalogPrinter(P1S);
      component.form.controls.bedWidthMm.setValue(300);
      fixture.detectChanges();

      typeInSearch('Voron 2.4');
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
      await component.save();
      expect(sent().catalogModelId).toBeNull();
      expect(sent().bedWidthMm).toBe(300);
      expect(sent().bedDepthMm).toBeUndefined();
      expect(sent().nozzleDiameter).toBeNull();
    });

    it('does not log NotListed after a catalog pick in this session', async () => {
      await setup();
      component.selectCatalogPrinter(P1S);
      typeInSearch('Voron 2.4');

      await component.save();

      expect(logging.logEvent).not.toHaveBeenCalledWith(
        'QuickAddPrinter_NotListed',
        jasmine.anything()
      );
    });

    it('typing over an unedited pick resets every field the catalog set', async () => {
      await setup();
      component.selectCatalogPrinter(P1S);
      fixture.detectChanges();

      typeInSearch('Bambu Lab P1');
      expect(byTestId('spec-summary')).toBeNull();
      expect(byTestId('nozzle-0.4')).toBeNull();
      expect(component.form.controls.multiMaterial.value).toBeFalse();
      typeInSearch('Voron 2.4');
      await component.save();

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

      await component.save();

      expect(logging.logEvent).toHaveBeenCalledWith(
        'QuickAddPrinter_NotListed',
        { query: 'x'.repeat(40) }
      );
      expect(logging.logEvent).toHaveBeenCalledWith(
        'QuickAddPrinter_Saved',
        jasmine.objectContaining({
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
        jasmine.anything()
      );
    });
  });

  describe('initialModelId', () => {
    it('loads and preselects the model', async () => {
      const model = new Subject<PrinterModel | null>();
      catalog.get.and.returnValue(model);
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
      catalog.get.and.returnValue(of(null));
      await setup(false, 'nope');

      expect(component.form.controls.search.value).toBe('');
      expect(byTestId('spec-summary')).toBeNull();
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
    const dialog = jasmine.createSpyObj<MatDialog>('MatDialog', ['open']);
    dialog.open.and.returnValue(ref);
    const data = { source: 'checklist' as const, showEmailNotice: true };

    const result = openQuickAddPrinterDialog(dialog, data);

    expect(result).toBe(ref);
    const [component, config] = dialog.open.calls.mostRecent().args;
    expect(component).toBe(QuickAddPrinterDialogComponent);
    expect(config?.data).toEqual(data);
    expect(config?.width).toBe('min(30rem, 100vw - 2rem)');
    expect(config?.maxWidth).toBe('100vw');
    expect(config?.autoFocus).toBe('first-tabbable');
  });

  function setupDialog(data: object) {
    const ref = jasmine.createSpyObj<
      MatDialogRef<QuickAddPrinterDialogComponent>
    >('ref', ['close']);
    const catalog = jasmine.createSpyObj<PrinterCatalogService>(
      'PrinterCatalogService',
      ['search', 'popular', 'get']
    );
    catalog.search.and.returnValue(of([]));
    catalog.popular.and.returnValue(of([]));
    catalog.get.and.returnValue(of(P1S));
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
