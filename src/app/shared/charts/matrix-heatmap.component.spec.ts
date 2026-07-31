import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatrixHeatmapComponent } from './matrix-heatmap.component';

const fullGrid = (hot: { weekday: number; hour: number; count: number }[]) => {
  const cells = [];
  for (let weekday = 0; weekday < 7; weekday++) {
    for (let hour = 0; hour < 24; hour++) {
      const match = hot.find((h) => h.weekday === weekday && h.hour === hour);
      cells.push({ weekday, hour, count: match?.count ?? 0 });
    }
  }
  return cells;
};

describe('MatrixHeatmapComponent', () => {
  let fixture: ComponentFixture<MatrixHeatmapComponent>;
  let component: MatrixHeatmapComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MatrixHeatmapComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(MatrixHeatmapComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('width', 700);
    fixture.componentRef.setInput('height', 240);
    fixture.componentRef.setInput('rowLabels', [
      'Sun',
      'Mon',
      'Tue',
      'Wed',
      'Thu',
      'Fri',
      'Sat',
    ]);
    fixture.componentRef.setInput(
      'columnLabels',
      Array.from({ length: 24 }, (_, h) => `${h}`)
    );
  });

  it('renders every cell it is given', () => {
    fixture.componentRef.setInput('cells', fullGrid([]));
    fixture.detectChanges();

    expect(component.rendered().length).toBe(168);
  });

  it('scales the busiest cell to the top level and leaves zeroes at level 0', () => {
    fixture.componentRef.setInput(
      'cells',
      fullGrid([{ weekday: 2, hour: 14, count: 9 }])
    );
    fixture.detectChanges();

    const hot = component
      .rendered()
      .find((c) => c.weekday === 2 && c.hour === 14)!;
    const cold = component
      .rendered()
      .find((c) => c.weekday === 0 && c.hour === 0)!;

    expect(hot.level).toBe(4);
    expect(cold.level).toBe(0);
  });

  it('renders nothing rather than throwing on an empty grid', () => {
    fixture.componentRef.setInput('cells', []);
    fixture.detectChanges();

    expect(component.rendered()).toEqual([]);
  });

  it('labels each cell with its weekday, hour and count', () => {
    fixture.componentRef.setInput(
      'cells',
      fullGrid([{ weekday: 1, hour: 9, count: 4 }])
    );
    fixture.detectChanges();

    const cell = component
      .rendered()
      .find((c) => c.weekday === 1 && c.hour === 9)!;
    expect(cell.label).toContain('Mon');
    expect(cell.label).toContain('4');
  });

  it('emits the selected cell', () => {
    fixture.componentRef.setInput(
      'cells',
      fullGrid([{ weekday: 1, hour: 9, count: 4 }])
    );
    fixture.detectChanges();

    let emitted: { weekday: number; hour: number } | null = null;
    component.cellSelect.subscribe((event) => (emitted = event));

    component.onSelect(
      component.rendered().find((c) => c.weekday === 1 && c.hour === 9)!
    );

    expect(emitted).toEqual({ weekday: 1, hour: 9 });
  });
});
