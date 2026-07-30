import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { Coverage } from 'src/app/analytics/models/analytics.models';
import { ChartFrameComponent } from './chart-frame.component';

describe('ChartFrameComponent', () => {
  let fixture: ComponentFixture<ChartFrameComponent>;

  const coverage = (exclusions: Coverage['exclusions']): Coverage => ({
    population: 'prints',
    counted: 8,
    total: 10,
    undatedCount: 0,
    exclusions,
  });

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChartFrameComponent, NoopAnimationsModule],
    }).compileComponents();

    fixture = TestBed.createComponent(ChartFrameComponent);
  });

  it('shows a skeleton while loading and no content', () => {
    fixture.componentRef.setInput('title', 'Prints over time');
    fixture.componentRef.setInput('state', 'loading');
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('[data-testid="chart-skeleton"]')).toBeTruthy();
    expect(el.querySelector('[data-testid="chart-content"]')).toBeFalsy();
  });

  it('shows the empty message with its own state, not an error', () => {
    fixture.componentRef.setInput('title', 'Prints over time');
    fixture.componentRef.setInput('state', 'empty');
    fixture.componentRef.setInput(
      'emptyMessage',
      'No prints in this range yet.'
    );
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('No prints in this range yet.');
    expect(el.querySelector('[data-testid="chart-retry"]')).toBeFalsy();
  });

  it('offers a retry affordance on error', () => {
    fixture.componentRef.setInput('title', 'Prints over time');
    fixture.componentRef.setInput('state', 'error');
    fixture.detectChanges();

    const retry = (fixture.nativeElement as HTMLElement).querySelector(
      '[data-testid="chart-retry"]'
    ) as HTMLButtonElement;
    expect(retry).toBeTruthy();

    let emitted = false;
    fixture.componentInstance.retry.subscribe(() => (emitted = true));
    retry.click();
    expect(emitted).toBeTrue();
  });

  it('renders a coverage badge when values include estimates', () => {
    fixture.componentRef.setInput('title', 'Filament used');
    fixture.componentRef.setInput('state', 'ready');
    fixture.componentRef.setInput(
      'coverage',
      coverage([{ reason: 'MaterialEstimated', count: 2 }])
    );
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain(
      'estimate'
    );
  });

  it('renders no coverage badge when nothing was excluded or estimated', () => {
    fixture.componentRef.setInput('title', 'Filament used');
    fixture.componentRef.setInput('state', 'ready');
    fixture.componentRef.setInput('coverage', coverage([]));
    fixture.detectChanges();

    expect(
      (fixture.nativeElement as HTMLElement).querySelector(
        '[data-testid="coverage-badge"]'
      )
    ).toBeFalsy();
  });

  it('exposes an accessible summary for screen readers', () => {
    fixture.componentRef.setInput('title', 'Prints over time');
    fixture.componentRef.setInput('state', 'ready');
    fixture.componentRef.setInput('ariaSummary', '42 prints across 30 days');
    fixture.detectChanges();

    const region = (fixture.nativeElement as HTMLElement).querySelector(
      '[role="img"]'
    );
    expect(region?.getAttribute('aria-label')).toContain('42 prints');
  });
});
