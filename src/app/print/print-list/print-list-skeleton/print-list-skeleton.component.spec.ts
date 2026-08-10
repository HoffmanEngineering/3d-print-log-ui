import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PrintListSkeletonComponent } from './print-list-skeleton.component';

describe('PrintListSkeletonComponent', () => {
  let fixture: ComponentFixture<PrintListSkeletonComponent>;

  const create = async (inputs: Record<string, unknown> = {}) => {
    await TestBed.configureTestingModule({
      imports: [PrintListSkeletonComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(PrintListSkeletonComponent);
    for (const [key, value] of Object.entries(inputs)) {
      fixture.componentRef.setInput(key, value);
    }
    fixture.detectChanges();
  };

  it('draws one card per requested item', async () => {
    await create({ count: 3 });
    expect(
      fixture.nativeElement.querySelectorAll('.skeleton-card').length
    ).toBe(3);
  });

  it('draws a grid of rows and cells in the row variant', async () => {
    await create({ variant: 'row', count: 4, columns: 6 });

    const rows = fixture.nativeElement.querySelectorAll('.skeleton-row');
    expect(rows.length).toBe(4);
    expect(rows[0].querySelectorAll('app-skeleton').length).toBe(6);
  });

  // Zero rows would render an invisible "loading" region that says nothing.
  it('always draws at least one placeholder', async () => {
    await create({ count: 0, columns: 0 });
    expect(
      fixture.nativeElement.querySelectorAll('.skeleton-card').length
    ).toBe(1);
  });

  it('announces the pending state once, not once per block', async () => {
    await create({ count: 3, label: 'Loading prints' });

    const region = fixture.nativeElement.querySelector(
      '[data-testid="print-list-skeleton"]'
    );
    expect(region.getAttribute('role')).toBe('status');
    expect(region.getAttribute('aria-busy')).toBe('true');
    expect(region.textContent).toContain('Loading prints');
    expect(
      region.querySelectorAll('app-skeleton:not([aria-hidden="true"])').length
    ).toBe(0);
  });
});
