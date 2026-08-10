import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ScatterChartComponent } from './scatter-chart.component';

describe('ScatterChartComponent', () => {
  let fixture: ComponentFixture<ScatterChartComponent>;
  let component: ScatterChartComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ScatterChartComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ScatterChartComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('width', 600);
    fixture.componentRef.setInput('height', 400);
    fixture.componentRef.setInput('xLabel', 'Estimated');
    fixture.componentRef.setInput('yLabel', 'Actual');
  });

  it('plots one mark per point', () => {
    fixture.componentRef.setInput('points', [
      { x: 60, y: 66, count: 1, label: '1 print' },
      { x: 600, y: 500, count: 3, label: '3 prints' },
    ]);
    fixture.detectChanges();

    expect(component.marks().length).toBe(2);
  });

  it('scales radius by the square root of the count so area tracks the count', () => {
    fixture.componentRef.setInput('points', [
      { x: 60, y: 66, count: 1, label: '1' },
      { x: 120, y: 130, count: 100, label: '100' },
    ]);
    fixture.detectChanges();

    const [one, hundred] = component.marks();
    expect(hundred.r).toBeGreaterThan(one.r);
    expect(hundred.r).toBeLessThan(one.r * 100);
  });

  it('draws a y equals x reference line', () => {
    fixture.componentRef.setInput('points', [
      { x: 60, y: 66, count: 1, label: '1' },
    ]);
    fixture.detectChanges();

    expect(
      fixture.nativeElement.querySelector('line.scatter-chart__reference')
    ).toBeTruthy();
  });

  it('renders nothing rather than throwing when there are no points', () => {
    fixture.componentRef.setInput('points', []);
    fixture.detectChanges();

    expect(component.marks()).toEqual([]);
  });

  it('drops non-positive values in log mode instead of producing NaN geometry', () => {
    fixture.componentRef.setInput('points', [
      { x: 0, y: 5, count: 1, label: 'bad' },
      { x: 60, y: 66, count: 1, label: 'good' },
    ]);
    fixture.detectChanges();

    expect(component.marks().length).toBe(1);
    component.marks().forEach((mark) => {
      expect(Number.isFinite(mark.cx)).toBeTrue();
      expect(Number.isFinite(mark.cy)).toBeTrue();
    });
  });

  it('emits the selected point', () => {
    fixture.componentRef.setInput('points', [
      { x: 60, y: 66, count: 1, label: '1' },
    ]);
    fixture.detectChanges();

    let emitted: { x: number; y: number } | null = null;
    component.pointSelect.subscribe((event) => (emitted = event));

    component.onSelect(component.marks()[0]);

    expect(emitted).toEqual({ x: 60, y: 66 });
  });
});
