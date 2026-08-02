import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  ColorPatternType,
  FilamentEffect,
  FilamentFinishType,
} from 'src/app/core/services/filament.service';
import { FilamentSvgDefsComponent } from './filament-svg-defs.component';

describe('FilamentSvgDefsComponent', () => {
  let fixture: ComponentFixture<FilamentSvgDefsComponent>;
  let component: FilamentSvgDefsComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FilamentSvgDefsComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(FilamentSvgDefsComponent);
    component = fixture.componentInstance;
  });

  it('returns a literal color for a solid swatch rather than an unnecessary gradient', () => {
    fixture.componentRef.setInput('swatches', [
      { id: 'a', colors: ['ff0000'], colorPattern: ColorPatternType.Solid },
    ]);
    fixture.detectChanges();

    expect(component.fillFor('a')).toBe('#ff0000');
    expect(
      fixture.nativeElement.querySelectorAll('linearGradient').length
    ).toBe(0);
  });

  it('emits a gradient and returns a url() fill for a multi-color swatch', () => {
    fixture.componentRef.setInput('swatches', [
      {
        id: 'a',
        colors: ['ff0000', '0000ff'],
        colorPattern: ColorPatternType.Gradient,
      },
    ]);
    fixture.detectChanges();

    expect(component.fillFor('a')).toMatch(/^url\(#.+\)$/);
    expect(
      fixture.nativeElement.querySelectorAll('linearGradient').length
    ).toBe(1);
    expect(fixture.nativeElement.querySelectorAll('stop').length).toBe(2);
  });

  it('scopes ids per instance so two charts cannot share a gradient', () => {
    const other = TestBed.createComponent(FilamentSvgDefsComponent);

    fixture.componentRef.setInput('swatches', [
      {
        id: 'a',
        colors: ['ff0000', '0000ff'],
        colorPattern: ColorPatternType.Gradient,
      },
    ]);
    other.componentRef.setInput('swatches', [
      {
        id: 'a',
        colors: ['00ff00', '000000'],
        colorPattern: ColorPatternType.Gradient,
      },
    ]);
    fixture.detectChanges();
    other.detectChanges();

    expect(component.fillFor('a')).not.toBe(
      other.componentInstance.fillFor('a')
    );
  });

  it('never emits a color that failed hex validation', () => {
    fixture.componentRef.setInput('swatches', [
      {
        id: 'a',
        colors: ['#ff0000;fill:url(#evil)', 'javascript:alert(1)'],
        colorPattern: ColorPatternType.Gradient,
      },
    ]);
    fixture.detectChanges();

    const markup = fixture.nativeElement.innerHTML as string;
    expect(markup).not.toContain('evil');
    expect(markup).not.toContain('javascript');
    Array.from(
      fixture.nativeElement.querySelectorAll(
        'stop'
      ) as NodeListOf<SVGStopElement>
    ).forEach((stop) => {
      expect(stop.getAttribute('stop-color')).toMatch(/^#[0-9a-fA-F]{3,6}$/);
    });
  });

  it('emits a filter for Matte and glow, and exposes the translucent opacity', () => {
    fixture.componentRef.setInput('swatches', [
      {
        id: 'a',
        colors: ['ff0000'],
        colorPattern: ColorPatternType.Solid,
        finishType: FilamentFinishType.Matte,
        effects: [FilamentEffect.Translucent],
      },
    ]);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('filter').length).toBe(1);
    expect(component.filterFor('a')).toMatch(/^url\(#.+\)$/);
    expect(component.opacityFor('a')).toBe(0.7);
  });

  it('falls back to a neutral fill for an unknown swatch id', () => {
    fixture.componentRef.setInput('swatches', []);
    fixture.detectChanges();

    expect(component.fillFor('missing')).toBe('var(--chart-series-6)');
    expect(component.filterFor('missing')).toBeNull();
    expect(component.opacityFor('missing')).toBe(1);
  });
});
