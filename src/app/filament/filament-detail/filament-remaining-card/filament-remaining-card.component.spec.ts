import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { FilamentRemainingCardComponent } from './filament-remaining-card.component';

describe('FilamentRemainingCardComponent', () => {
  let fixture: ComponentFixture<FilamentRemainingCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FilamentRemainingCardComponent, NoopAnimationsModule],
    }).compileComponents();

    fixture = TestBed.createComponent(FilamentRemainingCardComponent);
  });

  function render(inputs: Record<string, unknown>): HTMLElement {
    Object.entries(inputs).forEach(([key, value]) =>
      fixture.componentRef.setInput(key, value)
    );
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('shows the remaining grams', () => {
    const el = render({
      remainingMg: 412_000,
      projectedMg: 412_000,
      nominalMg: 1_000_000,
    });
    expect(el.textContent).toContain('412');
  });

  it('explains an untracked spool instead of showing zero', () => {
    const el = render({
      remainingMg: null,
      projectedMg: null,
      nominalMg: null,
    });
    expect(el.textContent).toContain('Not tracked');
    expect(el.textContent).not.toContain('0 g');
  });

  it('warns when more was used than the spool held', () => {
    const el = render({
      remainingMg: -38_000,
      projectedMg: -38_000,
      nominalMg: 1_000_000,
    });
    expect(el.querySelector('.over-used')).toBeTruthy();
    expect(el.textContent).toContain('38');
  });

  it('shows the projected value when it differs from the server value', () => {
    const el = render({
      remainingMg: 412_000,
      projectedMg: 380_000,
      nominalMg: 1_000_000,
    });
    expect(el.textContent).toContain('after saving');
    expect(el.textContent).toContain('380');
  });

  it('hides the projection arrow when it is suppressed', () => {
    const el = render({
      remainingMg: 412_000,
      projectedMg: 412_000,
      isSuppressed: true,
      nominalMg: 1_000_000,
    });
    // The suppressed note replaces the "X g -> Y g after saving" arrow entirely.
    expect(el.querySelector('.projection.muted')).toBeTruthy();
    expect(el.textContent).toContain('updates after saving');
    expect(el.textContent).not.toContain('g after saving');
  });

  it('shows the server value, not a stale projection, while suppressed', () => {
    const el = render({
      remainingMg: 412_000,
      projectedMg: 380_000,
      isSuppressed: true,
      nominalMg: 1_000_000,
    });
    expect(el.textContent).toContain('412');
    expect(el.textContent).not.toContain('380');
  });

  it('renders length, volume and usage totals', () => {
    const el = render({
      remainingMg: 412_000,
      projectedMg: 412_000,
      nominalMg: 1_000_000,
      lengthRemainingM: 138.2,
      volumeRemainingMl: 345.1,
      totalUsedMg: 588_000,
      printCount: 23,
    });
    expect(el.textContent).toContain('138');
    expect(el.textContent).toContain('345');
    expect(el.textContent).toContain('588');
    expect(el.textContent).toContain('23');
  });

  it('asks the parent to focus the nominal weight input', () => {
    const el = render({
      remainingMg: null,
      projectedMg: null,
      nominalMg: null,
    });
    let emitted = false;
    fixture.componentInstance.focusNominalWeight.subscribe(
      () => (emitted = true)
    );

    el.querySelector('button')!.click();

    expect(emitted).toBeTrue();
  });
});
