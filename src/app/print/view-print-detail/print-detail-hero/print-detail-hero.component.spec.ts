import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { PrintService } from 'src/app/core/services/print.service';
import { PrintDetailHeroComponent } from './print-detail-hero.component';

describe('PrintDetailHeroComponent', () => {
  let fixture: ComponentFixture<PrintDetailHeroComponent>;

  beforeEach(async () => {
    const mockPrintService = jasmine.createSpyObj<PrintService>(
      'PrintService',
      {
        getPrintImage: of(''),
      }
    );

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
});
