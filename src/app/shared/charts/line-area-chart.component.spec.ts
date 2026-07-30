import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LineAreaChartComponent, LinePoint } from './line-area-chart.component';

describe('LineAreaChartComponent', () => {
  let fixture: ComponentFixture<LineAreaChartComponent>;

  const points: LinePoint[] = [
    { date: '2026-07-01', value: 3 },
    { date: '2026-07-02', value: 7 },
    { date: '2026-07-03', value: 5 },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LineAreaChartComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(LineAreaChartComponent);
  });

  function render(width: number): HTMLElement {
    fixture.componentRef.setInput('points', points);
    fixture.componentRef.setInput('width', width);
    fixture.componentRef.setInput('height', 300);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('does not render before it has been measured', () => {
    fixture.componentRef.setInput('points', points);
    fixture.componentRef.setInput('width', 0);
    fixture.componentRef.setInput('height', 0);
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('path.line-area-chart__line')).toBeFalsy();
    expect(el.querySelectorAll('circle.line-area-chart__dot').length).toBe(0);
  });

  it('renders one dot per point', () => {
    const el = render(900);
    expect(el.querySelectorAll('circle.line-area-chart__dot').length).toBe(
      points.length
    );
  });

  it('strokes the line with a theme class, never a literal stroke', () => {
    const line = render(900).querySelector('path.line-area-chart__line')!;

    expect(line.classList.toString()).toContain('chart-stroke-1');
    expect(line.getAttribute('stroke')).toBeNull();
  });

  it('draws fewer axis ticks when narrow than when wide', () => {
    const narrow = render(360).querySelectorAll(
      'text.line-area-chart__axis-label'
    ).length;
    const wide = render(1440).querySelectorAll(
      'text.line-area-chart__axis-label'
    ).length;

    expect(narrow).toBeLessThan(wide);
  });

  it('emits the ISO date of the activated point for click-through', () => {
    const el = render(900);
    let emitted: { date: string } | undefined;
    fixture.componentInstance.pointSelect.subscribe((e) => (emitted = e));

    (
      el.querySelector('circle.line-area-chart__hit') as SVGElement
    ).dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(emitted?.date).toBe('2026-07-01');
  });

  it('does not put focusable controls inside an aria-hidden subtree', () => {
    // Same trap the bar chart had: focusable but unannounced is worse than either alone.
    const el = render(900);

    expect(el.querySelector('svg')!.getAttribute('aria-hidden')).toBeNull();

    const hit = el.querySelector('circle.line-area-chart__hit')!;
    expect(hit.getAttribute('tabindex')).toBe('0');
    expect(hit.getAttribute('aria-label')).toBeTruthy();
    expect(hit.closest('[aria-hidden="true"]')).toBeNull();
  });

  it('survives a single point, whose time domain would otherwise be zero-width', () => {
    fixture.componentRef.setInput('points', [{ date: '2026-07-01', value: 4 }]);
    fixture.componentRef.setInput('width', 900);
    fixture.componentRef.setInput('height', 300);
    fixture.detectChanges();

    const path = (fixture.nativeElement as HTMLElement).querySelector(
      'path.line-area-chart__line'
    );
    expect(path?.getAttribute('d')).not.toContain('NaN');
  });
});
