import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BottleIconComponent } from './bottle-icon.component';

describe('BottleIconComponent', () => {
  let fixture: ComponentFixture<BottleIconComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BottleIconComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(BottleIconComponent);
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

  it('should apply the filament color to the bottle body fill', () => {
    fixture.componentRef.setInput('color', 'FF5733');
    fixture.detectChanges();
    const body = fixture.nativeElement.querySelector('.bottle-body');
    expect(body.getAttribute('fill')).toBe('#FF5733');
  });

  it('should default to black body when color is empty', () => {
    fixture.detectChanges();
    const body = fixture.nativeElement.querySelector('.bottle-body');
    expect(body.getAttribute('fill')).toBe('#000000');
  });

  it('should mark the SVG as aria-hidden', () => {
    fixture.detectChanges();
    const svg = fixture.nativeElement.querySelector('svg');
    expect(svg.getAttribute('aria-hidden')).toBe('true');
  });
});
