import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PrintStatusBadgeComponent } from './print-status-badge.component';
import { PrintStatus } from 'src/app/core/services/print.service';

describe('PrintStatusBadgeComponent', () => {
  let fixture: ComponentFixture<PrintStatusBadgeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PrintStatusBadgeComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(PrintStatusBadgeComponent);
  });

  const render = (status: PrintStatus) => {
    fixture.componentRef.setInput('status', status);
    fixture.detectChanges();
    return fixture.nativeElement.querySelector('.status-badge');
  };

  it('renders a visible text label alongside the icon', () => {
    const el = render(PrintStatus.Success);
    expect(el.textContent).toContain('Success');
    expect(el.querySelector('mat-icon')).toBeTruthy();
  });

  it('renders Partial Success with a space', () => {
    expect(render(PrintStatus.PartialSuccess).textContent).toContain(
      'Partial Success'
    );
  });

  it('applies a status-specific class', () => {
    expect(render(PrintStatus.Failed).classList).toContain('status-5');
  });

  it('falls back to Unknown for an unrecognized status', () => {
    const el = render(99 as PrintStatus);
    expect(el.textContent).toContain('Unknown');
  });
});
