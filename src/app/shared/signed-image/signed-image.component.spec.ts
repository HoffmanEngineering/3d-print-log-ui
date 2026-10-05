import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

import { SignedImageComponent } from './signed-image.component';

describe('SignedImageComponent', () => {
  let component: SignedImageComponent;
  let fixture: ComponentFixture<SignedImageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SignedImageComponent, NoopAnimationsModule],
    }).compileComponents();

    fixture = TestBed.createComponent(SignedImageComponent);
    component = fixture.componentInstance;
    // alt is required, so every test needs one; individual tests override it.
    fixture.componentRef.setInput('alt', 'A photo');
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
      .querySelector('.signed-image')
      .addEventListener('click', wrapperClick);

    fixture.nativeElement.querySelector('.delete-btn').click();

    expect(emitted).toHaveBeenCalled();
    expect(wrapperClick).not.toHaveBeenCalled();
  });

  // The component's own `.signed-image img` rule ties on specificity with anything a
  // parent writes through ::ng-deep, so a caller could not reliably override it - the
  // printer list's square thumbnail rendered letterboxed. Inline style settles it.
  it('letterboxes by default and crops when asked to', () => {
    fixture.componentRef.setInput('src', 'https://blob/a.webp?sig=x');
    fixture.componentRef.setInput('alt', 'A photo');
    fixture.detectChanges();

    const img = () =>
      fixture.debugElement.query(By.css('img'))
        .nativeElement as HTMLImageElement;
    expect(img().style.objectFit).toBe('contain');

    fixture.componentRef.setInput('fit', 'cover');
    fixture.detectChanges();

    expect(img().style.objectFit).toBe('cover');
  });
});
