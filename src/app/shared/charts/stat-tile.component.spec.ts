import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { Metric } from 'src/app/analytics/models/analytics.models';
import { StatTileComponent } from './stat-tile.component';

describe('StatTileComponent', () => {
  let fixture: ComponentFixture<StatTileComponent>;

  const metric = (
    value: number | null,
    previous: number | null = null
  ): Metric => ({
    value,
    previous,
    coverage: {
      population: 'prints',
      counted: 1,
      total: 1,
      undatedCount: 0,
      exclusions: [],
    },
  });

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StatTileComponent, NoopAnimationsModule],
    }).compileComponents();
    fixture = TestBed.createComponent(StatTileComponent);
  });

  function render(inputs: Record<string, unknown>): HTMLElement {
    for (const [k, v] of Object.entries(inputs))
      fixture.componentRef.setInput(k, v);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('formats a duration in human units rather than raw seconds', () => {
    const el = render({
      label: 'Print time',
      metric: metric(9000),
      format: 'duration',
    });
    expect(el.textContent).toContain('2h');
    expect(el.textContent).not.toContain('9000');
  });

  it('formats a percentage', () => {
    const el = render({
      label: 'Success rate',
      metric: metric(91.256),
      format: 'percent',
    });
    expect(el.textContent).toContain('91.3%');
  });

  it('rolls grams up to kilograms when large', () => {
    const el = render({
      label: 'Filament',
      metric: metric(3200),
      format: 'grams',
    });
    expect(el.textContent).toContain('3.2 kg');
  });

  it('shows a dash rather than zero when a value is unavailable', () => {
    const el = render({
      label: 'Success rate',
      metric: metric(null),
      format: 'percent',
    });
    expect(
      el.querySelector('[data-testid="stat-value"]')?.textContent?.trim()
    ).toBe('—');
  });

  it('shows an upward delta against the previous period', () => {
    const el = render({
      label: 'Prints',
      metric: metric(42, 30),
      format: 'number',
    });
    const delta = el.querySelector('[data-testid="stat-delta"]');
    expect(delta?.textContent).toContain('40');
    expect(delta?.classList).toContain('stat-tile__delta--up');
  });

  it('suppresses the delta when the previous period was zero', () => {
    const el = render({
      label: 'Prints',
      metric: metric(42, 0),
      format: 'number',
    });
    expect(el.querySelector('[data-testid="stat-delta"]')).toBeFalsy();
  });

  it('suppresses the delta when no comparison was requested', () => {
    const el = render({
      label: 'Prints',
      metric: metric(42, null),
      format: 'number',
    });
    expect(el.querySelector('[data-testid="stat-delta"]')).toBeFalsy();
  });

  it('explains coverage exclusions in plain language with the affected print count', () => {
    const value = metric(48.1);
    value.coverage.exclusions = [{ reason: 'MaterialEstimated', count: 2 }];

    const el = render({
      label: 'Estimated cost',
      metric: value,
      format: 'currency',
    });

    expect(el.textContent).toContain('2 prints use estimated material amounts');
    expect(el.textContent).not.toContain('MaterialEstimated');
  });
});
