import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  MAT_DIALOG_DATA,
  MatDialog,
  MatDialogRef,
} from '@angular/material/dialog';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of, Subject, throwError } from 'rxjs';
import { LoggingService } from '../../core/services/logging.service';
import {
  PrinterCategory,
  PrinterCategoryService,
} from '../../core/services/printer-categories.service';
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

describe('QuickAddPrinterComponent', () => {
  let fixture: ComponentFixture<QuickAddPrinterComponent>;
  let component: QuickAddPrinterComponent;
  let printers: jasmine.SpyObj<PrinterService>;
  let logging: jasmine.SpyObj<LoggingService>;
  let onboarding: jasmine.SpyObj<OnboardingService>;
  let saved: PrinterDetail[];

  async function setup(showEmailNotice = false) {
    fixture = TestBed.createComponent(QuickAddPrinterComponent);
    fixture.componentRef.setInput('source', 'welcome');
    fixture.componentRef.setInput('showEmailNotice', showEmailNotice);
    component = fixture.componentInstance;
    saved = [];
    component.saved.subscribe((p) => saved.push(p));
    fixture.detectChanges();
    await fixture.whenStable();
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
    TestBed.configureTestingModule({
      imports: [QuickAddPrinterComponent, NoopAnimationsModule],
      providers: [
        { provide: PrinterService, useValue: printers },
        { provide: LoggingService, useValue: logging },
        { provide: OnboardingService, useValue: onboarding },
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

    component.selectCatalogPrinter({ make: 'Bambu Lab', model: 'X1 Carbon' });

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
    component.selectCatalogPrinter({ make: 'Bambu Lab', model: 'A1' });

    component.commitFreeText();

    expect(component.form.controls.make.value).toBe('Bambu Lab');
    expect(component.form.controls.model.value).toBe('A1');
  });

  it('stops the name following the model once it is edited', async () => {
    await setup();
    component.selectCatalogPrinter({ make: 'Prusa', model: 'MK4' });
    component.onNameInput();
    component.form.controls.name.setValue('Workhorse');

    component.selectCatalogPrinter({ make: 'Bambu Lab', model: 'A1' });

    expect(component.form.controls.name.value).toBe('Workhorse');
  });

  it('sends slotCount 1 when multi-material is off', async () => {
    await setup();
    component.selectCatalogPrinter({ make: 'Prusa', model: 'MK4' });
    component.form.controls.slotCount.setValue(6);

    await component.save();

    expect(printers.addPrinter.calls.mostRecent().args[0].slotCount).toBe(1);
  });

  it('keeps Save enabled after an invalid slot count is toggled off', async () => {
    await setup();
    component.selectCatalogPrinter({ make: 'Prusa', model: 'MK4' });
    const host = fixture.nativeElement as HTMLElement;
    const toggle = host.querySelector(
      'mat-slide-toggle button'
    ) as HTMLButtonElement;

    toggle.click();
    fixture.detectChanges();
    component.form.controls.slotCount.setValue(1);
    fixture.detectChanges();
    toggle.click();
    fixture.detectChanges();

    const save = host.querySelector(
      '[data-testid="quick-add-save"]'
    ) as HTMLButtonElement;
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
    component.selectCatalogPrinter({ make: 'Prusa', model: 'MK4' });
    component.form.controls.multiMaterial.setValue(true);
    component.form.controls.slotCount.setValue(6);

    await component.save();

    expect(printers.addPrinter.calls.mostRecent().args[0].slotCount).toBe(6);
    expect(logging.logEvent).toHaveBeenCalledWith(
      'QuickAddPrinter_Saved',
      jasmine.objectContaining({ multiSlot: true })
    );
  });

  it('saves an FFF printer by default and emits it', async () => {
    await setup();
    component.selectCatalogPrinter({ make: 'Prusa', model: 'MK4' });

    await component.save();

    const sent = printers.addPrinter.calls.mostRecent().args[0];
    expect(sent.id).toBeNull();
    expect(sent.name).toBe('MK4');
    expect(sent.make).toBe('Prusa');
    expect(sent.isActive).toBeTrue();
    expect(sent.loadedFilaments).toEqual([]);
    expect(sent.category.nickname).toBe('FFF');
    expect(saved.length).toBe(1);
    expect(logging.logEvent).toHaveBeenCalledWith('QuickAddPrinter_Saved', {
      source: 'welcome',
      fromCatalog: true,
      multiSlot: false,
    });
  });

  it('maps Resin to MSLA and Other to the chosen category', async () => {
    await setup();
    component.selectCatalogPrinter({ make: 'Elegoo', model: 'Mars' });
    component.form.controls.type.setValue('MSLA');
    await component.save();
    expect(
      printers.addPrinter.calls.mostRecent().args[0].category.nickname
    ).toBe('MSLA');

    component.form.controls.type.setValue('Other');
    component.form.controls.otherCategory.setValue('SLS');
    await component.save();
    expect(
      printers.addPrinter.calls.mostRecent().args[0].category.nickname
    ).toBe('SLS');
  });

  it('calls addPrinter once on a double click', async () => {
    await setup();
    const response = new Subject<PrinterDetail>();
    printers.addPrinter.and.returnValue(response);
    component.selectCatalogPrinter({ make: 'Prusa', model: 'MK4' });
    fixture.detectChanges();
    const button = (fixture.nativeElement as HTMLElement).querySelector(
      '[data-testid="quick-add-save"]'
    ) as HTMLButtonElement;

    button.click();
    button.click();
    void component.save();

    expect(printers.addPrinter).toHaveBeenCalledTimes(1);
    expect(component.saving()).toBeTrue();
  });

  it('acknowledges the email notice only when it was shown', async () => {
    await setup(false);
    component.selectCatalogPrinter({ make: 'Prusa', model: 'MK4' });
    await component.save();
    expect(onboarding.acknowledgeEmailNotice).not.toHaveBeenCalled();

    fixture.destroy();
    await setup(true);
    component.selectCatalogPrinter({ make: 'Prusa', model: 'MK4' });
    await component.save();
    expect(onboarding.acknowledgeEmailNotice).toHaveBeenCalledTimes(1);
  });

  it('shows the API message on error and does not emit', async () => {
    await setup();
    printers.addPrinter.and.returnValue(
      throwError(() => ({ error: { message: 'Printer limit reached' } }))
    );
    component.selectCatalogPrinter({ make: 'Prusa', model: 'MK4' });

    await component.save();
    fixture.detectChanges();

    expect(saved.length).toBe(0);
    expect(component.saving()).toBeFalse();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain(
      'Printer limit reached'
    );
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

  it('closes with the saved printer', () => {
    const ref = jasmine.createSpyObj<
      MatDialogRef<QuickAddPrinterDialogComponent>
    >('ref', ['close']);
    TestBed.configureTestingModule({
      imports: [QuickAddPrinterDialogComponent, NoopAnimationsModule],
      providers: [
        { provide: MatDialogRef, useValue: ref },
        {
          provide: MAT_DIALOG_DATA,
          useValue: { source: 'print-form', showEmailNotice: false },
        },
        { provide: PrinterService, useValue: {} },
        { provide: LoggingService, useValue: { logEvent: () => undefined } },
        { provide: OnboardingService, useValue: {} },
        {
          provide: PrinterCategoryService,
          useValue: { getPrinterCategories: () => of([]) },
        },
      ],
    });
    const dialogFixture = TestBed.createComponent(
      QuickAddPrinterDialogComponent
    );
    const printer = { id: 3 } as PrinterDetail;

    dialogFixture.componentInstance.onSaved(printer);

    expect(ref.close).toHaveBeenCalledWith(printer);
  });
});
