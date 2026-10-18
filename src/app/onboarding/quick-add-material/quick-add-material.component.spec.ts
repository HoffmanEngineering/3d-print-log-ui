import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of, throwError } from 'rxjs';
import {
  ColorPatternType,
  FilamentDetail,
  FilamentFinishType,
  FilamentService,
  FilamentSourceMeasurement,
} from '../../core/services/filament.service';
import { LoggingService } from '../../core/services/logging.service';
import {
  Material,
  MaterialService,
} from '../../core/services/material.service';
import { PrinterService } from '../../core/services/printer.service';
import { QuickAddMaterialComponent } from './quick-add-material.component';

const MATERIALS: Material[] = [
  {
    id: 'm-abs',
    acronym: 'ABS',
    name: 'ABS',
    materialCategoryNickname: 'filament',
    densityGramPerCubicCm: 1.04,
  },
  {
    id: 'm-pla',
    acronym: 'PLA',
    name: 'Polylactic Acid',
    materialCategoryNickname: 'filament',
    densityGramPerCubicCm: 1.24,
  },
  {
    id: 'm-petg',
    acronym: 'PETG',
    name: 'PETG',
    materialCategoryNickname: 'filament',
    densityGramPerCubicCm: 1.27,
  },
  {
    id: 'm-resin',
    acronym: 'RES',
    name: 'Standard resin',
    materialCategoryNickname: 'resin',
    densityGramPerCubicCm: 1.1,
  },
];

describe('QuickAddMaterialComponent', () => {
  let fixture: ComponentFixture<QuickAddMaterialComponent>;
  let component: QuickAddMaterialComponent;
  let filaments: jasmine.SpyObj<FilamentService>;
  let printers: jasmine.SpyObj<PrinterService>;
  let logging: jasmine.SpyObj<LoggingService>;
  let saved: FilamentDetail[];

  async function setup(loadIntoPrinterId: number | null = null) {
    fixture = TestBed.createComponent(QuickAddMaterialComponent);
    fixture.componentRef.setInput('loadIntoPrinterId', loadIntoPrinterId);
    component = fixture.componentInstance;
    saved = [];
    component.saved.subscribe((f) => saved.push(f));
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  beforeEach(() => {
    filaments = jasmine.createSpyObj<FilamentService>('FilamentService', [
      'addFilament',
    ]);
    filaments.addFilament.and.callFake((f) => of({ ...f, id: 'new-id' }));
    printers = jasmine.createSpyObj<PrinterService>('PrinterService', [
      'loadSlot',
    ]);
    printers.loadSlot.and.returnValue(of([]));
    logging = jasmine.createSpyObj<LoggingService>('LoggingService', [
      'logEvent',
      'logException',
    ]);
    TestBed.configureTestingModule({
      imports: [QuickAddMaterialComponent, NoopAnimationsModule],
      providers: [
        { provide: FilamentService, useValue: filaments },
        { provide: PrinterService, useValue: printers },
        { provide: LoggingService, useValue: logging },
        {
          provide: MaterialService,
          useValue: { getMaterials: () => of(MATERIALS) },
        },
      ],
    });
  });

  it('pre-selects PLA, fills density and offers only filament types', async () => {
    await setup();

    expect(component.form.controls.materialId.value).toBe('m-pla');
    expect(component.density()).toBe(1.24);
    expect(component.materials().map((m) => m.id)).toEqual([
      'm-abs',
      'm-pla',
      'm-petg',
    ]);
  });

  it('updates density and the display name when switching to PETG', async () => {
    await setup();
    component.form.controls.brand.setValue('Hatchbox');
    component.form.controls.colorName.setValue('Red');

    component.form.controls.materialId.setValue('m-petg');

    expect(component.density()).toBe(1.27);
    expect(component.form.controls.displayName.value).toBe('Hatchbox PETG Red');
  });

  it('stops the display name following once it is edited', async () => {
    await setup();
    component.onNameInput();
    component.form.controls.displayName.setValue('My spool');

    component.form.controls.brand.setValue('Hatchbox');

    expect(component.form.controls.displayName.value).toBe('My spool');
  });

  it('saves a 1,000,000 mg solid filament without the # on the color', async () => {
    await setup();
    component.form.controls.brand.setValue('Hatchbox');
    component.form.controls.colorName.setValue('Red');
    component.form.controls.colorHex.setValue('#ff0000');

    await component.save();

    const body = filaments.addFilament.calls.mostRecent().args[0];
    expect(body.initialNominalWeightMg).toBe(1_000_000);
    expect(body.source).toBe(FilamentSourceMeasurement.Weight);
    expect(body.diameterMm).toBe(1.75);
    expect(body.materialCategoryNickname).toBe('filament');
    expect(body.materialType).toBe('PLA');
    expect(body.materialDensityGramPerCubicCm).toBe(1.24);
    expect(body.brand).toBe('Hatchbox');
    expect(body.colorName).toBe('Red');
    expect(body.colorHex).toBe('ff0000');
    expect(body.colors).toEqual(['ff0000']);
    expect(body.colorPattern).toBe(ColorPatternType.Solid);
    expect(body.finishType).toBe(FilamentFinishType.Standard);
    expect(body.effects).toEqual([]);
    expect(body.isActive).toBeTrue();
    expect(body.filamentAdjustments).toEqual([]);
    expect(body.displayName).toBe('Hatchbox PLA Red');
    expect(saved.length).toBe(1);
    expect(saved[0].id).toBe('new-id');
  });

  it('defaults the color to ffffff', async () => {
    await setup();

    await component.save();

    const body = filaments.addFilament.calls.mostRecent().args[0];
    expect(body.colorHex).toBe('ffffff');
    expect(body.colors).toEqual(['ffffff']);
  });

  it('loads slot 0 of the printer when loadIntoPrinterId is set', async () => {
    await setup(7);

    await component.save();

    expect(printers.loadSlot).toHaveBeenCalledOnceWith(7, 0, 'new-id');
    expect(logging.logEvent).toHaveBeenCalledWith('QuickAddMaterial_Saved', {
      materialType: 'PLA',
      loadedIntoPrinter: true,
    });
  });

  it('does not call loadSlot when loadIntoPrinterId is null', async () => {
    await setup(null);

    await component.save();

    expect(printers.loadSlot).not.toHaveBeenCalled();
    expect(logging.logEvent).toHaveBeenCalledWith('QuickAddMaterial_Saved', {
      materialType: 'PLA',
      loadedIntoPrinter: false,
    });
  });

  it('still emits saved when loadSlot fails, and logs the exception', async () => {
    printers.loadSlot.and.returnValue(throwError(() => new Error('boom')));
    await setup(7);

    await component.save();

    expect(saved.length).toBe(1);
    expect(logging.logException).toHaveBeenCalled();
    expect(component.errorMessage()).toBeNull();
  });

  it('shows an error and does not emit when the filament save fails', async () => {
    filaments.addFilament.and.returnValue(
      throwError(() => ({ error: { message: 'Nope' } }))
    );
    await setup();

    await component.save();

    expect(saved.length).toBe(0);
    expect(component.errorMessage()).toBe('Nope');
    expect(component.saving()).toBeFalse();
  });

  it('ignores a second save while one is in flight', async () => {
    await setup();

    const first = component.save();
    const second = component.save();
    await Promise.all([first, second]);

    expect(filaments.addFilament).toHaveBeenCalledTimes(1);
  });
});
