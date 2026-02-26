import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FilamentSpoolIconComponent } from './filament-spool-icon.component';

describe('FilamentSpoolIconComponent', () => {
  let fixture: ComponentFixture<FilamentSpoolIconComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FilamentSpoolIconComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(FilamentSpoolIconComponent);
  });

  it('should create', () => {
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should render an SVG element', () => {
    fixture.detectChanges();
    const svg = fixture.nativeElement.querySelector('svg');
    expect(svg).not.toBeNull();
  });

  it('should apply the filament color to the barrel fill', () => {
    fixture.componentRef.setInput('color', 'FF5733');
    fixture.detectChanges();
    const barrel = fixture.nativeElement.querySelector('.spool-barrel');
    expect(barrel.getAttribute('fill')).toBe('#FF5733');
  });

  it('should default to black barrel when color is empty', () => {
    fixture.detectChanges();
    const barrel = fixture.nativeElement.querySelector('.spool-barrel');
    expect(barrel.getAttribute('fill')).toBe('#000000');
  });

  it('should mark the SVG as aria-hidden', () => {
    fixture.detectChanges();
    const svg = fixture.nativeElement.querySelector('svg');
    expect(svg.getAttribute('aria-hidden')).toBe('true');
  });
});
