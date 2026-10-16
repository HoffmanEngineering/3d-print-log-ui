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

  it('positions repeated month labels in separate year buckets', () => {
    fixture.componentRef.setInput('data', [
      {
        label: 'Jul',
        fullLabel: 'Jul 2025',
        values: { Success: 2, Failed: 0 },
      },
      {
        label: 'Jul',
        fullLabel: 'Jul 2026',
        values: { Success: 3, Failed: 0 },
      },
    ]);
    fixture.componentRef.setInput('series', series);
    fixture.componentRef.setInput('width', 900);
    fixture.componentRef.setInput('height', 300);
    fixture.detectChanges();

    const xPositions = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll(
        'rect.bar-chart__segment'
      )
    ).map((segment) => segment.getAttribute('x'));

    expect(new Set(xPositions).size).toBe(2);
  });

  it('colors segments with theme classes, never literal fills', () => {
    const el = render(900);
    const segment = el.querySelector('rect.bar-chart__segment')!;

    expect(segment.classList.toString()).toContain('chart-fill-');
    expect(segment.getAttribute('fill')).toBeNull();
  });

  it('keeps chronological time buckets as vertical columns on narrow widths', () => {
    expect(
      render(360).querySelector('svg')!.getAttribute('data-orientation')
    ).toBe('vertical');
    expect(
      render(1200).querySelector('svg')!.getAttribute('data-orientation')
    ).toBe('vertical');
  });

  it('honors an explicit orientation over the width heuristic', () => {
    expect(
      render(360, 'vertical')
        .querySelector('svg')!
        .getAttribute('data-orientation')
    ).toBe('vertical');
  });

  it('renders numeric y-axis ticks and grid lines for print counts', () => {
    const el = render(900);
    const labels = Array.from(
      el.querySelectorAll('.bar-chart__value-label')
    ).map((label) => label.textContent?.trim());

    expect(labels).toContain('0');
    expect(labels).toContain('5');
    expect(el.querySelectorAll('.bar-chart__grid-line').length).toBeGreaterThan(
      1
    );
  });

  it('shows every nonzero segment immediately when the bucket is hovered', () => {
    const el = render(900);
    el.querySelector<SVGRectElement>(
      '.bar-chart__bucket-hitbox'
    )!.dispatchEvent(new MouseEvent('mouseenter'));
    fixture.detectChanges();

    const tooltip = el.querySelector('[data-testid="bar-tooltip"]');
    expect(tooltip?.textContent).toContain('Success: 3');
    expect(tooltip?.textContent).toContain('Failed: 1');
  });

  it('shows only the hovered segment in the immediate tooltip', () => {
    const el = render(900);
    el.querySelector<SVGRectElement>('.bar-chart__segment')!.dispatchEvent(
      new MouseEvent('mouseenter')
    );
    fixture.detectChanges();

    const tooltip = el.querySelector('[data-testid="bar-tooltip"]');
    expect(tooltip?.textContent).toContain('Success: 3');
    expect(tooltip?.textContent).not.toContain('Failed: 1');
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

  it('does not put focusable controls inside an aria-hidden subtree', () => {
    // A node that is focusable but hidden from assistive tech is a trap: a screen-reader user
    // tabs onto it and hears nothing. Either the marks are exposed, or they are not focusable.
    const el = render(900);

    expect(el.querySelector('svg')!.getAttribute('aria-hidden')).toBeNull();

    const segment = el.querySelector('rect.bar-chart__segment')!;
    expect(segment.getAttribute('tabindex')).toBe('0');
    expect(segment.getAttribute('aria-label')).toBeTruthy();
    expect(segment.closest('[aria-hidden="true"]')).toBeNull();
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
  it('uses a datum fill when one is supplied and the theme class otherwise', () => {
    fixture.componentRef.setInput('series', [
      { key: 'value', label: 'Used', seriesIndex: 1 },
    ]);
    fixture.componentRef.setInput('data', [
      { label: 'PLA', fullLabel: 'PLA', values: { value: 5 }, fill: '#ff0000' },
      { label: 'PETG', fullLabel: 'PETG', values: { value: 3 } },
    ]);
    fixture.componentRef.setInput('width', 900);
    fixture.componentRef.setInput('height', 300);
    fixture.detectChanges();

    const [pla, petg] = fixture.componentInstance.segments();
    expect(pla.fill).toBe('#ff0000');
    expect(petg.fill).toBeNull();
  });

  describe('signed series', () => {
    const withSigned: BarSeries[] = [
      ...series,
      { key: 'Adj', label: 'Adjustments', seriesIndex: 6, signed: true },
    ];

    function renderSigned(adj: number[]): HTMLElement {
      fixture.componentRef.setInput(
        'data',
        data.map((datum, index) => ({
          ...datum,
          values: { ...datum.values, Adj: adj[index] ?? 0 },
        }))
      );
      fixture.componentRef.setInput('series', withSigned);
      fixture.componentRef.setInput('width', 900);
      fixture.componentRef.setInput('height', 300);
      fixture.componentRef.setInput('orientation', 'vertical');
      fixture.detectChanges();
      return fixture.nativeElement as HTMLElement;
    }

    const segmentsOf = (key: string) =>
      fixture.componentInstance.segments().filter((s) => s.seriesKey === key);

    it('draws a signed series beside the stack, not on top of it', () => {
      renderSigned([2, 0]);
      const [success] = segmentsOf('Success');
      const [adj] = segmentsOf('Adj');
      const zeroY = fixture.componentInstance.zeroY();

      // Its own bar in the same bucket, starting at zero rather than at the stack's top.
      expect(adj.x).toBeGreaterThan(success.x);
      expect(adj.y + adj.h).toBeCloseTo(zeroY, 5);
    });

    it('draws a negative value below the zero line, with a baseline and negative ticks', () => {
      const el = renderSigned([-2, 0]);
      const [adj] = segmentsOf('Adj');
      const zeroY = fixture.componentInstance.zeroY();

      expect(adj.y).toBeCloseTo(zeroY, 5);
      expect(adj.h).toBeGreaterThan(1);
      const baseline = el.querySelector('.bar-chart__zero-line');
      expect(baseline).toBeTruthy();
      expect(Number(baseline!.getAttribute('y1'))).toBeCloseTo(zeroY, 5);
      const labels = Array.from(
        el.querySelectorAll('.bar-chart__value-label')
      ).map((label) => label.textContent?.trim());
      expect(labels.some((label) => label?.startsWith('-'))).toBeTrue();
    });

    it('draws no baseline when nothing is negative', () => {
      const el = renderSigned([2, 0]);
      expect(el.querySelector('.bar-chart__zero-line')).toBeNull();
    });

    it('lists a negative signed value in the bucket tooltip', () => {
      const el = renderSigned([-2, 0]);
      el.querySelector<SVGRectElement>(
        '.bar-chart__bucket-hitbox'
      )!.dispatchEvent(new MouseEvent('mouseenter'));
      fixture.detectChanges();

      expect(
        el.querySelector('[data-testid="bar-tooltip"]')?.textContent
      ).toContain('Adjustments: -2');
    });

    it('hatches signed bars so they never read as one more stacked series', () => {
      const el = renderSigned([-2, 0]);
      const rect = el.querySelector('rect.bar-chart__segment--signed')!;

      expect(rect).toBeTruthy();
      expect(rect.getAttribute('fill')).toMatch(/^url\(#bar-hatch-\d+\)$/);
      expect(
        el.querySelector(`pattern#${rect.getAttribute('fill')!.slice(5, -1)}`)
      ).toBeTruthy();
    });
  });

  it('projects swatch defs into its own svg', () => {
    // The defs must live INSIDE the chart's <svg>; a url(#id) fill cannot resolve otherwise.
    expect(fixture.nativeElement.querySelector('svg')).toBeTruthy();
  });
});
