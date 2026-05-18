import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FilamentSpoolIconComponent } from './filament-spool-icon.component';
import {
  ColorPatternType,
  FilamentEffect,
  FilamentFinishType,
} from '../../core/services/filament.service';

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

  describe('multi-color rendering', () => {
    it('renders one fill path for Solid pattern', async () => {
      fixture.componentRef.setInput('colorPattern', ColorPatternType.Solid);
      fixture.componentRef.setInput('colors', ['ff0000']);
      fixture.detectChanges();

      const paths = fixture.nativeElement.querySelectorAll(
        'path[fill-rule="evenodd"]'
      );
      expect(paths.length).toBe(1);
      expect(paths[0].getAttribute('fill')).toBe('#ff0000');
    });

    it('renders N clipped paths for Multi pattern', async () => {
      fixture.componentRef.setInput('colorPattern', ColorPatternType.Multi);
      fixture.componentRef.setInput('colors', ['ff0000', '0000ff', '00ff00']);
      fixture.detectChanges();

      const paths = fixture.nativeElement.querySelectorAll(
        'path[fill-rule="evenodd"]'
      );
      expect(paths.length).toBe(3);
      expect(paths[0].getAttribute('fill')).toBe('#ff0000');
      expect(paths[1].getAttribute('fill')).toBe('#0000ff');
      expect(paths[2].getAttribute('fill')).toBe('#00ff00');
    });

    it('renders a linearGradient with 2 stops for Gradient pattern', async () => {
      fixture.componentRef.setInput('colorPattern', ColorPatternType.Gradient);
      fixture.componentRef.setInput('colors', ['ff0000', '0000ff']);
      fixture.detectChanges();

      const grad = fixture.nativeElement.querySelector('linearGradient');
      expect(grad).toBeTruthy();
      const stops = grad.querySelectorAll('stop');
      expect(stops.length).toBe(2);
      expect(stops[0].getAttribute('stop-color')).toBe('#ff0000');
      expect(stops[1].getAttribute('stop-color')).toBe('#0000ff');
    });

    it('renders a linearGradient with N stops for Rainbow pattern', async () => {
      fixture.componentRef.setInput('colorPattern', ColorPatternType.Rainbow);
      fixture.componentRef.setInput('colors', [
        'ff0000',
        'ffe040',
        '00ff00',
        '0000ff',
      ]);
      fixture.detectChanges();

      const grad = fixture.nativeElement.querySelector('linearGradient');
      expect(grad).toBeTruthy();
      const stops = grad.querySelectorAll('stop');
      expect(stops.length).toBe(4);
    });
  });
});
