import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import {
  BackToOrcaSlicerComponent,
  ORCA_SLICER_HOST,
  OrcaSlicerHost,
  isInOrcaSlicer,
} from './back-to-orca-slicer.component';

describe('isInOrcaSlicer', () => {
  it('is true only when the webview injected window.orca', () => {
    expect(isInOrcaSlicer({ orca: { postMessage: () => undefined } })).toBe(
      true
    );
    expect(isInOrcaSlicer({})).toBe(false);
    expect(isInOrcaSlicer(null)).toBe(false);
  });

  it('is false in the test browser, which has no window.orca', () => {
    expect(isInOrcaSlicer(window)).toBe(false);
    expect(TestBed.inject(ORCA_SLICER_HOST)).toBeNull();
  });
});

describe('BackToOrcaSlicerComponent', () => {
  const setup = (host: OrcaSlicerHost | null) => {
    TestBed.configureTestingModule({
      imports: [BackToOrcaSlicerComponent],
      providers: [{ provide: ORCA_SLICER_HOST, useValue: host }],
    });
    const fixture = TestBed.createComponent(BackToOrcaSlicerComponent);
    fixture.detectChanges();
    return fixture;
  };

  const button = (
    fixture: ReturnType<typeof setup>
  ): HTMLButtonElement | null =>
    fixture.debugElement.query(By.css('[data-testid="back-to-orca-slicer"]'))
      ?.nativeElement ?? null;

  it('is hidden in an ordinary browser', () => {
    expect(button(setup(null))).toBeNull();
  });

  it('shows inside OrcaSlicer and goes back in history', () => {
    const back = jasmine.createSpy('back');
    const fixture = setup({ history: { back } });

    const el = button(fixture);
    expect(el?.textContent).toContain('Back to OrcaSlicer');
    el!.click();
    expect(back).toHaveBeenCalledTimes(1);
  });
});
