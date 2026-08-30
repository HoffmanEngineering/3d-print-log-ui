import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FilamentColorSwatchComponent } from './filament-color-swatch.component';

describe('FilamentColorSwatchComponent', () => {
  let fixture: ComponentFixture<FilamentColorSwatchComponent>;

  const filament = {
    colors: ['c62828'],
    colorPattern: 1,
    finishType: 1,
    effects: [],
    colorName: 'Fire Red',
  } as any;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FilamentColorSwatchComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(FilamentColorSwatchComponent);
  });

  it('exposes the color name as its accessible name by default', () => {
    fixture.componentRef.setInput('filament', filament);
    fixture.detectChanges();
    const el = fixture.nativeElement.querySelector('.swatch');
    expect(el.getAttribute('aria-hidden')).not.toBe('true');
    expect(el.textContent.trim()).toBe('Fire Red');
  });

  it('falls back to a generic name when colorName is missing', () => {
    fixture.componentRef.setInput('filament', {
      ...filament,
      colorName: null,
    });
    fixture.detectChanges();
    expect(
      fixture.nativeElement.querySelector('.swatch').textContent.trim()
    ).toBe('Filament color');
  });

  it('is hidden from assistive tech when decorative', () => {
    fixture.componentRef.setInput('filament', filament);
    fixture.componentRef.setInput('decorative', true);
    fixture.detectChanges();
    const el = fixture.nativeElement.querySelector('.swatch');
    expect(el.getAttribute('aria-hidden')).toBe('true');
    expect(el.textContent.trim()).toBe('');
  });
});
