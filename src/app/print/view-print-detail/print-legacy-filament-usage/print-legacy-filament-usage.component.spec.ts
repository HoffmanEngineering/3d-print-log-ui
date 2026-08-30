import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PrintLegacyFilamentUsageComponent } from './print-legacy-filament-usage.component';

describe('PrintLegacyFilamentUsageComponent', () => {
  let fixture: ComponentFixture<PrintLegacyFilamentUsageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PrintLegacyFilamentUsageComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(PrintLegacyFilamentUsageComponent);
  });

  const render = (print: any) => {
    fixture.componentRef.setInput('print', print);
    fixture.detectChanges();
    return fixture.nativeElement;
  };

  it('renders nothing when there is no legacy data', () => {
    const el = render({
      filamentType: '',
      filamentUsageMg: 0,
      estimatedFilamentUsageMg: 0,
    });
    expect(el.textContent.trim()).toBe('');
    expect(fixture.componentInstance.hasLegacyData()).toBe(false);
  });

  it('converts milligrams to grams', () => {
    const el = render({
      filamentType: 'PLA',
      filamentUsageMg: 18400,
      estimatedFilamentUsageMg: 20000,
    });
    expect(el.textContent).toContain('18.4');
    expect(el.textContent).toContain('20');
    expect(el.textContent).toContain('PLA');
  });

  it('renders when only the filament type is present', () => {
    render({
      filamentType: 'PETG',
      filamentUsageMg: 0,
      estimatedFilamentUsageMg: 0,
    });
    expect(fixture.componentInstance.hasLegacyData()).toBe(true);
  });

  it('tolerates null numeric fields', () => {
    const el = render({
      filamentType: 'PLA',
      filamentUsageMg: null,
      estimatedFilamentUsageMg: null,
    });
    expect(el.textContent).not.toContain('NaN');
  });
});
