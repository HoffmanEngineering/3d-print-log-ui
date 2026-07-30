import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BarChartComponent, BarDatum, BarSeries } from './bar-chart.component';

describe('BarChartComponent', () => {
  let fixture: ComponentFixture<BarChartComponent>;

  const series: BarSeries[] = [
    { key: 'Success', label: 'Success', seriesIndex: 3 },
    { key: 'Failed', label: 'Failed', seriesIndex: 4 },
  ];

  const data: BarDatum[] = [
    {
      label: '7/1',
      fullLabel: '1 July 2026',
      values: { Success: 3, Failed: 1 },
    },
    {
      label: '7/2',
      fullLabel: '2 July 2026',
      values: { Success: 5, Failed: 0 },
    },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BarChartComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(BarChartComponent);
  });

  function render(
    width: number,
    orientation: 'auto' | 'vertical' | 'horizontal' = 'auto'
  ): HTMLElement {
    fixture.componentRef.setInput('data', data);
    fixture.componentRef.setInput('series', series);
    fixture.componentRef.setInput('width', width);
    fixture.componentRef.setInput('height', 300);
    fixture.componentRef.setInput('orientation', orientation);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('renders one stacked segment per series per datum', () => {
    const el = render(900);
    // 2 data points x 2 series, minus the zero-valued Failed segment on 7/2.
    expect(el.querySelectorAll('rect.bar-chart__segment').length).toBe(3);
  });

  it('colours segments with theme classes, never literal fills', () => {
    const el = render(900);
    const segment = el.querySelector('rect.bar-chart__segment')!;

    expect(segment.classList.toString()).toContain('chart-fill-');
    expect(segment.getAttribute('fill')).toBeNull();
  });

  it('switches to horizontal bars on narrow widths so labels fit', () => {
    expect(
      render(360).querySelector('svg')!.getAttribute('data-orientation')
    ).toBe('horizontal');
    expect(
      render(1200).querySelector('svg')!.getAttribute('data-orientation')
    ).toBe('vertical');
  });

  it('honours an explicit orientation over the width heuristic', () => {
    expect(
      render(360, 'vertical')
        .querySelector('svg')!
        .getAttribute('data-orientation')
    ).toBe('vertical');
  });

  it('emits the datum and series on segment activation for click-through', () => {
    const el = render(900);
    let emitted: { label: string; seriesKey: string | null } | undefined;
    fixture.componentInstance.barSelect.subscribe((e) => (emitted = e));

    (el.querySelector('rect.bar-chart__segment') as SVGElement).dispatchEvent(
      new MouseEvent('click', { bubbles: true })
    );

    expect(emitted?.label).toBe('7/1');
    expect(emitted?.seriesKey).toBe('Success');
  });

  it('renders nothing but stays valid when data is empty', () => {
    fixture.componentRef.setInput('data', []);
    fixture.componentRef.setInput('series', series);
    fixture.componentRef.setInput('width', 900);
    fixture.componentRef.setInput('height', 300);
    fixture.detectChanges();

    expect(
      (fixture.nativeElement as HTMLElement).querySelectorAll(
        'rect.bar-chart__segment'
      ).length
    ).toBe(0);
  });

  it('does not render before it has been measured', () => {
    fixture.componentRef.setInput('data', data);
    fixture.componentRef.setInput('series', series);
    fixture.componentRef.setInput('width', 0);
    fixture.componentRef.setInput('height', 0);
    fixture.detectChanges();

    expect(
      (fixture.nativeElement as HTMLElement).querySelectorAll(
        'rect.bar-chart__segment'
      ).length
    ).toBe(0);
  });
});
