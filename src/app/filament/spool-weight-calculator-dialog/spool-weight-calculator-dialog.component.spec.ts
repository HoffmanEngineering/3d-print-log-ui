import {
  ComponentFixture,
  fakeAsync,
  TestBed,
  tick,
} from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

import {
  SpoolWeightCalculatorDialogComponent,
  SpoolWeightCalculatorDialogData,
  SpoolWeightCalculatorDialogResult,
} from './spool-weight-calculator-dialog.component';

describe('SpoolWeightCalculatorDialogComponent', () => {
  let component: SpoolWeightCalculatorDialogComponent;
  let fixture: ComponentFixture<SpoolWeightCalculatorDialogComponent>;
  let dialogRef: jasmine.SpyObj<
    MatDialogRef<SpoolWeightCalculatorDialogComponent>
  >;

  const data: SpoolWeightCalculatorDialogData = {
    spoolWeightMg: 150000,
    filamentRemainingMg: 500000,
  };

  beforeEach(async () => {
    dialogRef = jasmine.createSpyObj<
      MatDialogRef<SpoolWeightCalculatorDialogComponent>
    >('MatDialogRef', ['close']);

    await TestBed.configureTestingModule({
      imports: [SpoolWeightCalculatorDialogComponent, NoopAnimationsModule],
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: data },
        { provide: MatDialogRef, useValue: dialogRef },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SpoolWeightCalculatorDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('has no preview until a measured weight is entered', () => {
    expect(component.preview()).toBeNull();
  });

  it('computes the adjustment preview from the measured weight (grams)', () => {
    component.measuredTotalWeightControl.setValue(450);
    const preview = component.preview();
    expect(preview).not.toBeNull();
    expect(preview!.adjustmentMg).toBe(-200000);
    expect(preview!.measuredRemainingMg).toBe(300000);
    expect(preview!.negativeRemaining).toBeFalse();
  });

  it('closes with the adjustment, measured weight, and a descriptive note on confirm', () => {
    component.measuredTotalWeightControl.setValue(450);
    component.confirm();

    expect(dialogRef.close).toHaveBeenCalledTimes(1);
    const result = dialogRef.close.calls.mostRecent()
      .args[0] as SpoolWeightCalculatorDialogResult;
    expect(result.adjustmentG).toBe(-200);
    expect(result.measuredTotalWeightG).toBe(450);
    expect(result.note).toContain('450');
    expect(result.note).toContain('300');
  });

  it('does not close on confirm when no measured weight is entered', () => {
    component.confirm();
    expect(dialogRef.close).not.toHaveBeenCalled();
  });

  it('has no preview and does not close when the measured weight is zero', () => {
    component.measuredTotalWeightControl.setValue(0);
    expect(component.preview()).toBeNull();

    component.confirm();
    expect(dialogRef.close).not.toHaveBeenCalled();
  });

  it('shows the numeric preview immediately but debounces the negative-remaining warning', fakeAsync(() => {
    // Measured 100 g total is below the 150 g spool weight -> negative remaining
    component.measuredTotalWeightControl.setValue(100);
    fixture.detectChanges();

    // Preview is immediate; the warning is not shown yet (debounce pending).
    expect(component.preview()).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.calc-warning')).toBeNull();

    // After the debounce elapses, the warning appears.
    tick(500);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.calc-warning')).not.toBeNull();
  }));

  it('still allows confirm when the measurement is below the spool weight', () => {
    component.measuredTotalWeightControl.setValue(100);
    expect(component.preview()).not.toBeNull();

    component.confirm();
    expect(dialogRef.close).toHaveBeenCalledTimes(1);
  });

  it('closes with no result on cancel', () => {
    component.cancel();
    expect(dialogRef.close).toHaveBeenCalledWith();
  });
});
