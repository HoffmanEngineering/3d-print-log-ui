import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

import { FilamentImageComponent } from './filament-image.component';

describe('FilamentImageComponent', () => {
  let component: FilamentImageComponent;
  let fixture: ComponentFixture<FilamentImageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FilamentImageComponent, NoopAnimationsModule],
    }).compileComponents();

    fixture = TestBed.createComponent(FilamentImageComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    fixture.componentRef.setInput('src', 'https://blob.example.com/a.jpg');
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('renders the signed url directly with lazy loading', () => {
    fixture.componentRef.setInput(
      'src',
      'https://blob.example.com/a.jpg?sig=x'
    );
    fixture.componentRef.setInput('alt', 'Blue PLA spool');
    fixture.detectChanges();

    const img: HTMLImageElement = fixture.nativeElement.querySelector('img');
    expect(img.getAttribute('loading')).toBe('lazy');
    expect(img.alt).toBe('Blue PLA spool');
  });

  it('shows a fallback when the image fails to load', () => {
    fixture.componentRef.setInput('src', 'https://blob.example.com/gone.jpg');
    fixture.detectChanges();
    fixture.nativeElement
      .querySelector('img')
      .dispatchEvent(new Event('error'));
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Image unavailable');
  });

  it('clears the error state when the src changes', () => {
    // The carousel swaps images through inputs without recreating the component,
    // so a sticky failure would show "Image unavailable" for every later image
    // too.
    fixture.componentRef.setInput('src', 'https://blob.example.com/gone.jpg');
    fixture.detectChanges();
    fixture.nativeElement
      .querySelector('img')
      .dispatchEvent(new Event('error'));
    fixture.detectChanges();

    fixture.componentRef.setInput('src', 'https://blob.example.com/good.jpg');
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).not.toContain(
      'Image unavailable'
    );
  });

  it('emits delete without bubbling the click when the delete button is used', () => {
    fixture.componentRef.setInput('src', 'https://blob.example.com/a.jpg');
    fixture.componentRef.setInput('showDeleteOnHover', true);
    fixture.detectChanges();

    const emitted = spyOn(component.delete, 'emit');
    const wrapperClick = jasmine.createSpy('wrapperClick');
    fixture.nativeElement
      .querySelector('.filament-image')
      .addEventListener('click', wrapperClick);

    fixture.nativeElement.querySelector('.delete-btn').click();

    expect(emitted).toHaveBeenCalled();
    expect(wrapperClick).not.toHaveBeenCalled();
  });
});
