import type { MockedObject } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { of } from 'rxjs';
import { PrintService } from 'src/app/core/services/print.service';
import { PrintImageComponent } from './print-image.component';

describe('PrintImageComponent', () => {
  let component: PrintImageComponent;
  let fixture: ComponentFixture<PrintImageComponent>;

  beforeEach(async () => {
    const mockPrintService = {
      getPrintImage: vi
        .fn()
        .mockName('PrintService.getPrintImage')
        .mockReturnValue(of('')),
    };

    await TestBed.configureTestingModule({
      imports: [PrintImageComponent],
      providers: [{ provide: PrintService, useValue: mockPrintService }],
    }).compileComponents();
  });

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
    ) as MockedObject<PrintService>;
    printService.getPrintImage.mockReturnValue(of('data:image/png;base64,AA'));
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

  // List views pass the DTO's thumbnail path; an API older than #281 sends none, and the
  // component then asks for the full image exactly as before.
  it('asks for the thumbnail when one is bound', () => {
    const printService = TestBed.inject(
      PrintService
    ) as MockedObject<PrintService>;
    printService.getPrintImage.mockReturnValue(of('data:image/webp;base64,AA'));
    const f = TestBed.createComponent(PrintImageComponent);
    f.componentRef.setInput('printId', 3);
    f.componentRef.setInput('imageId', 9);
    f.componentRef.setInput('thumbnailUrl', '/api/Prints/3/image/9/thumbnail');

    f.detectChanges();

    expect(printService.getPrintImage).toHaveBeenCalledWith(
      3,
      9,
      '/api/Prints/3/image/9/thumbnail'
    );
  });

  it('asks for the full image when the thumbnail is null', () => {
    const printService = TestBed.inject(
      PrintService
    ) as MockedObject<PrintService>;
    printService.getPrintImage.mockClear();
    const f = TestBed.createComponent(PrintImageComponent);
    f.componentRef.setInput('printId', 3);
    f.componentRef.setInput('imageId', 9);
    f.componentRef.setInput('thumbnailUrl', null);

    f.detectChanges();

    expect(printService.getPrintImage).toHaveBeenCalledWith(3, 9);
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

    it('falls back to a generic alt when none is supplied', () => {
      const f = renderWith({ imageData: 'https://example.com/ok.png' });

      expect(
        f.nativeElement.querySelector('img.fade-in').getAttribute('alt')
      ).toBe('Image of 3D print');
    });
  });
});
