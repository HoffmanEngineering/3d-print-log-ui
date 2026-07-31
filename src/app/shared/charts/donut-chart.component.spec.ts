import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DonutChartComponent, DonutSlice } from './donut-chart.component';

describe('DonutChartComponent', () => {
  let fixture: ComponentFixture<DonutChartComponent>;

  const slices: DonutSlice[] = [
    { key: 'Success', label: 'Success', value: 9, seriesIndex: 3 },
    { key: 'Failed', label: 'Failed', value: 1, seriesIndex: 4 },
    { key: 'Cancelled', label: 'Cancelled', value: 0, seriesIndex: 6 },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DonutChartComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(DonutChartComponent);
  });

  function render(): HTMLElement {
    fixture.componentRef.setInput('slices', slices);
    fixture.componentRef.setInput('width', 400);
    fixture.componentRef.setInput('height', 300);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('omits zero-valued slices from the ring', () => {
    expect(render().querySelectorAll('path.donut-chart__slice').length).toBe(2);
  });

  it('lists every slice in the legend, including zero-valued ones', () => {
    // A status at zero is meaningful information; hiding it reads as "unknown".
    expect(
      render().querySelectorAll('[data-testid="donut-legend-item"]').length
    ).toBe(3);
  });

  it('uses theme classes rather than literal fills', () => {
    const slice = render().querySelector('path.donut-chart__slice')!;
    expect(slice.classList.toString()).toContain('chart-fill-');
    expect(slice.getAttribute('fill')).toBeNull();
  });

  it('shows a percentage in each slice tooltip', () => {
    expect(
      render().querySelector('path.donut-chart__slice title')!.textContent
    ).toContain('90');
  });

  it('sizes the center total to occupy most of the donut hole', () => {
    fixture.componentRef.setInput('centerValue', '25');
    fixture.componentRef.setInput('centerLabel', 'prints');
    const el = render();

    const valueSize = Number(
      el.querySelector('.donut-chart__center-value')?.getAttribute('font-size')
    );
    const labelSize = Number(
      el.querySelector('.donut-chart__center-label')?.getAttribute('font-size')
    );

    expect(valueSize).toBeGreaterThan(70);
    expect(labelSize).toBeGreaterThan(20);
    expect(valueSize).toBeLessThan(fixture.componentInstance.radius() * 1.24);
  });

  it('emits the slice key on activation for click-through', () => {
    const el = render();
    let key: string | undefined;
    fixture.componentInstance.sliceSelect.subscribe((e) => (key = e.key));

    (el.querySelector('path.donut-chart__slice') as SVGElement).dispatchEvent(
      new MouseEvent('click', { bubbles: true })
    );

    expect(key).toBe('Success');
  });

  it('renders nothing when every value is zero', () => {
    fixture.componentRef.setInput(
      'slices',
      slices.map((s) => ({ ...s, value: 0 }))
    );
    fixture.componentRef.setInput('width', 400);
    fixture.componentRef.setInput('height', 300);
    fixture.detectChanges();

    expect(
      (fixture.nativeElement as HTMLElement).querySelectorAll(
        'path.donut-chart__slice'
      ).length
    ).toBe(0);
  });

  it('does not render before measurement', () => {
    fixture.componentRef.setInput('slices', slices);
    fixture.componentRef.setInput('width', 0);
    fixture.componentRef.setInput('height', 0);
    fixture.detectChanges();

    expect(
      (fixture.nativeElement as HTMLElement).querySelectorAll(
        'path.donut-chart__slice'
      ).length
    ).toBe(0);
  });
});
