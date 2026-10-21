import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { of } from 'rxjs';
import { PrintService } from 'src/app/core/services/print.service';
import { PrintImageComponent } from './print-image.component';

describe('PrintImageComponent', () => {
  let component: PrintImageComponent;
  let fixture: ComponentFixture<PrintImageComponent>;

  beforeEach(waitForAsync(() => {
    const mockPrintService = jasmine.createSpyObj<PrintService>(
      'PrintService',
      { getPrintImage: of('') }
    );

    TestBed.configureTestingModule({
      imports: [PrintImageComponent],
      providers: [{ provide: PrintService, useValue: mockPrintService }],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(PrintImageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('fetches the image when none is bound and reports it to the parent', () => {
    const printService = TestBed.inject(
      PrintService
    ) as jasmine.SpyObj<PrintService>;
    printService.getPrintImage.and.returnValue(of('data:image/png;base64,AA'));
    const f = TestBed.createComponent(PrintImageComponent);
    f.componentRef.setInput('printId', 3);
    f.componentRef.setInput('imageId', 9);
    const reported: string[] = [];
    f.componentInstance.imageData.subscribe((d) => reported.push(d));

    f.detectChanges();

    expect(printService.getPrintImage).toHaveBeenCalledWith(3, 9);
    expect(reported).toEqual(['data:image/png;base64,AA']);
    const img = f.nativeElement.querySelector('img') as HTMLImageElement;
    expect(img.getAttribute('src')).toBe('data:image/png;base64,AA');
  });

  // getPrintImage maps every HTTP error to an empty string, so an empty
  // result is a failed fetch. Treated as "nothing yet" it left a blank box in
  // the table and a blank tile in the gallery.
  it('shows the fallback when the fetch comes back empty', () => {
    const printService = TestBed.inject(
      PrintService
    ) as jasmine.SpyObj<PrintService>;
    printService.getPrintImage.and.returnValue(of(''));
    const f = TestBed.createComponent(PrintImageComponent);
    f.componentRef.setInput('printId', 3);
    f.componentRef.setInput('imageId', 9);

    f.detectChanges();

    expect(f.nativeElement.querySelector('img')).toBeNull();
    expect(f.nativeElement.textContent).toContain('Image unavailable');
  });

  describe('with an image bound', () => {
    // A fresh fixture: the outer beforeEach already ran change detection with
    // no image, and flipping the @if branch afterwards trips NG0100.
    const renderWith = (props: Record<string, unknown>) => {
      const f = TestBed.createComponent(PrintImageComponent);
      for (const [key, value] of Object.entries(props)) {
        f.componentRef.setInput(key, value);
      }
      f.detectChanges();
      return f;
    };

    it('shows a fallback when the image fails to load', () => {
      const f = renderWith({ imageData: 'https://example.com/gone.png' });

      const img: HTMLImageElement =
        f.nativeElement.querySelector('img.fade-in');
      expect(img).toBeTruthy();

      img.dispatchEvent(new Event('error'));
      f.detectChanges();

      expect(f.nativeElement.querySelector('img.fade-in')).toBeNull();
      expect(f.nativeElement.textContent).toContain('Image unavailable');
    });

    it('clears the failed state when a different image is bound', () => {
      const f = renderWith({ imageData: 'https://example.com/gone.png' });
      f.nativeElement
        .querySelector('img.fade-in')
        .dispatchEvent(new Event('error'));
      f.detectChanges();
      expect(f.nativeElement.textContent).toContain('Image unavailable');

      // Simulates the carousel advancing to the next image.
      f.componentRef.setInput('imageData', 'https://example.com/ok.png');
      f.detectChanges();

      expect(f.nativeElement.querySelector('img.fade-in')).toBeTruthy();
      expect(f.nativeElement.textContent).not.toContain('Image unavailable');
    });

    it('uses the supplied alt text', () => {
      const f = renderWith({
        imageData: 'https://example.com/ok.png',
        alt: 'Articulated dragon, image 2 of 3',
      });

      expect(
        f.nativeElement.querySelector('img.fade-in').getAttribute('alt')
      ).toBe('Articulated dragon, image 2 of 3');
    });

    // Letterboxing is right where the whole photo matters (the carousel), and
    // stays the default; a fixed-size gallery tile needs a crop instead, or a
    // portrait photo reads as a thin strip with bars either side.
    it('letterboxes by default', () => {
      const f = renderWith({ imageData: 'https://example.com/ok.png' });

      const img: HTMLImageElement = f.nativeElement.querySelector('img');
      expect(getComputedStyle(img).objectFit).toBe('contain');
    });

    it('crops to fill its box when asked to cover', () => {
      const f = renderWith({
        imageData: 'https://example.com/ok.png',
        fit: 'cover',
      });

      const img: HTMLImageElement = f.nativeElement.querySelector('img');
      expect(getComputedStyle(img).objectFit).toBe('cover');
    });

    // A caller whose surrounding text already names the image (a gallery
    // tile's title) marks it decorative with an empty alt.
    it('keeps an empty alt rather than replacing it with the generic one', () => {
      const f = renderWith({
        imageData: 'https://example.com/ok.png',
        alt: '',
      });

      expect(
        f.nativeElement.querySelector('img.fade-in').getAttribute('alt')
      ).toBe('');
    });

    it('falls back to a generic alt when none is supplied', () => {
      const f = renderWith({ imageData: 'https://example.com/ok.png' });

      expect(
        f.nativeElement.querySelector('img.fade-in').getAttribute('alt')
      ).toBe('Image of 3D print');
    });
  });
});
