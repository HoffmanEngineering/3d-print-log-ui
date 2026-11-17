import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { PrintService } from 'src/app/core/services/print.service';
import { PrintDetailHeroComponent } from './print-detail-hero.component';

describe('PrintDetailHeroComponent', () => {
  let fixture: ComponentFixture<PrintDetailHeroComponent>;
  let mockPrintService: { getPrintImage: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    mockPrintService = {
      getPrintImage: vi
        .fn()
        .mockName('PrintService.getPrintImage')
        .mockReturnValue(of('')),
    };

    await TestBed.configureTestingModule({
      imports: [PrintDetailHeroComponent],
      providers: [{ provide: PrintService, useValue: mockPrintService }],
    }).compileComponents();
    fixture = TestBed.createComponent(PrintDetailHeroComponent);
    fixture.componentRef.setInput('printId', 1);
  });

  it('renders a placeholder when there are no images', () => {
    fixture.componentRef.setInput('images', []);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.no-image')).toBeTruthy();
    expect(
      fixture.nativeElement.querySelector('app-image-carousel')
    ).toBeNull();
  });

  it('renders the carousel when images exist', () => {
    fixture.componentRef.setInput('images', [
      { id: 1, isDefault: true, displayOrder: 0 },
    ]);
    fixture.detectChanges();
    expect(
      fixture.nativeElement.querySelector('app-image-carousel')
    ).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.no-image')).toBeNull();
  });

  it('hides the thumbnail strip for a single image', () => {
    fixture.componentRef.setInput('images', [
      { id: 1, isDefault: true, displayOrder: 0 },
    ]);
    fixture.detectChanges();
    expect(
      fixture.nativeElement.querySelector('app-image-thumbnail-strip')
    ).toBeNull();
  });

  it('selects the default image first', () => {
    fixture.componentRef.setInput('images', [
      { id: 1, isDefault: false, displayOrder: 0 },
      { id: 2, isDefault: true, displayOrder: 1 },
    ]);
    fixture.detectChanges();
    expect(fixture.componentInstance.selectedIndex()).toBe(1);
  });

  // A private print's image needs the owner's token, which a plain <img src> never sends,
  // so an image without a direct URL is fetched through PrintService.
  it('fetches an image without a direct URL through PrintService', () => {
    fixture.componentRef.setInput('images', [
      { id: 7, isDefault: true, displayOrder: 0 },
    ]);
    fixture.detectChanges();
    expect(mockPrintService.getPrintImage).toHaveBeenCalledWith(1, 7);
  });

  it('fetches the newly selected image when the selection changes', () => {
    fixture.componentRef.setInput('images', [
      { id: 1, isDefault: true, displayOrder: 0 },
      { id: 2, isDefault: false, displayOrder: 1 },
    ]);
    fixture.detectChanges();
    fixture.componentInstance.selectedIndex.set(1);
    fixture.detectChanges();
    expect(mockPrintService.getPrintImage).toHaveBeenLastCalledWith(1, 2);
  });

  it('shows a direct URL as it is, without fetching', () => {
    const url = 'https://api.example.test/api/Prints/1/image/3';
    fixture.componentRef.setInput('images', [
      { id: 3, isDefault: true, displayOrder: 0, url },
    ]);
    fixture.detectChanges();
    expect(mockPrintService.getPrintImage).not.toHaveBeenCalled();
    expect(fixture.nativeElement.querySelector('img').getAttribute('src')).toBe(
      url
    );
  });
});
