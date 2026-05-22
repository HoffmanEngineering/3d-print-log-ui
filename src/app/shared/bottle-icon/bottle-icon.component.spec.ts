import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BottleIconComponent } from './bottle-icon.component';
import {
  ColorPatternType,
  FilamentEffect,
  FilamentFinishType,
} from '../../core/services/filament.service';

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

  describe('multi-color rendering', () => {
    it('renders one fill path for Solid pattern', () => {
      fixture.componentRef.setInput('colorPattern', ColorPatternType.Solid);
      fixture.componentRef.setInput('colors', ['4d96ff']);
      fixture.detectChanges();

      const body = fixture.nativeElement.querySelector('path.bottle-body');
      expect(body.getAttribute('fill')).toBe('#4d96ff');
    });

    it('renders a vertical linearGradient for Gradient pattern', () => {
      fixture.componentRef.setInput('colorPattern', ColorPatternType.Gradient);
      fixture.componentRef.setInput('colors', ['ff0000', '0000ff']);
      fixture.detectChanges();

      const grad = fixture.nativeElement.querySelector('linearGradient');
      expect(grad).toBeTruthy();
      // Bottle gradient is vertical: x1=x2=50%, y1=0%, y2=100%
      expect(grad.getAttribute('x1')).toBe('50%');
      expect(grad.getAttribute('x2')).toBe('50%');
      expect(grad.getAttribute('y1')).toBe('0%');
      expect(grad.getAttribute('y2')).toBe('100%');
    });

    it('renders GITD glow filter when GlowInDark effect is set', () => {
      fixture.componentRef.setInput('colorPattern', ColorPatternType.Solid);
      fixture.componentRef.setInput('colors', ['b6ffc8']);
      fixture.componentRef.setInput('effects', [FilamentEffect.GlowInDark]);
      fixture.detectChanges();

      const filter = fixture.nativeElement.querySelector('filter');
      expect(filter).toBeTruthy();
    });
  });
});
