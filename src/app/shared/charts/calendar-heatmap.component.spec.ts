import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CalendarHeatmapComponent } from './calendar-heatmap.component';

describe('CalendarHeatmapComponent', () => {
  let fixture: ComponentFixture<CalendarHeatmapComponent>;
  let component: CalendarHeatmapComponent;

  const days = (count: number) =>
    Array.from({ length: count }, (_, i) => {
      const date = new Date(2026, 0, 1 + i);
      const iso = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      return { date: iso, count: i % 5 };
    });

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CalendarHeatmapComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(CalendarHeatmapComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('width', 800);
    fixture.componentRef.setInput('height', 160);
  });

  it('renders one cell per day', () => {
    fixture.componentRef.setInput('days', days(30));
    fixture.detectChanges();

    expect(component.cells().length).toBe(30);
  });

  it('renders nothing rather than throwing when there are no days', () => {
    fixture.componentRef.setInput('days', []);
    fixture.detectChanges();

    expect(component.cells()).toEqual([]);
    expect(
      fixture.nativeElement.querySelectorAll('rect.calendar-heatmap__cell')
        .length
    ).toBe(0);
  });

  it('gives a zero-count day level 0 and a non-zero day at least level 1', () => {
    fixture.componentRef.setInput('days', [
      { date: '2026-01-01', count: 0 },
      { date: '2026-01-02', count: 1 },
    ]);
    fixture.detectChanges();

    const [empty, active] = component.cells();
    expect(empty.level).toBe(0);
    expect(active.level).toBeGreaterThanOrEqual(1);
  });

  it('places each day in the column for its week and the row for its weekday', () => {
    // 2026-01-04 is a Sunday, so it opens a new column at weekday row 0.
    fixture.componentRef.setInput('days', [
      { date: '2026-01-03', count: 1 }, // Saturday
      { date: '2026-01-04', count: 1 }, // Sunday
    ]);
    fixture.detectChanges();

    const [saturday, sunday] = component.cells();
    expect(sunday.x).toBeGreaterThan(saturday.x);
    expect(sunday.y).toBeLessThan(saturday.y);
  });

  it('labels every cell for screen readers and tooltips', () => {
    fixture.componentRef.setInput('days', [{ date: '2026-01-01', count: 3 }]);
    fixture.detectChanges();

    expect(component.cells()[0].label).toContain('3');
  });

  it('emits the clicked day so the parent can link to a filtered print list', () => {
    fixture.componentRef.setInput('days', [{ date: '2026-01-01', count: 3 }]);
    fixture.detectChanges();

    let emitted: { date: string } | null = null;
    component.daySelect.subscribe((event) => (emitted = event));

    fixture.nativeElement
      .querySelector('rect.calendar-heatmap__hit')
      .dispatchEvent(new MouseEvent('click'));

    expect(emitted).toEqual({ date: '2026-01-01' });
  });
});
