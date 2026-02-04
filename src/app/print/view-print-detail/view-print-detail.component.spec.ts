import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { ViewPrintDetailComponent } from './view-print-detail.component';

xdescribe('ViewPrintDetailComponent', () => {
  let component: ViewPrintDetailComponent;
  let fixture: ComponentFixture<ViewPrintDetailComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ViewPrintDetailComponent],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ViewPrintDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render thumbnail strip when multiple images exist', () => {
    // Update mock data to include multiple images with displayOrder
    component.printImages = [
      { id: 1, isDefault: true, displayOrder: 0 },
      { id: 2, isDefault: false, displayOrder: 1 },
    ];
    component.selectedImage = component.printImages[0];
    fixture.detectChanges();
    // Verify ImageThumbnailStripComponent renders
    const thumbnailStrip = fixture.nativeElement.querySelector(
      'app-image-thumbnail-strip'
    );
    expect(thumbnailStrip).toBeTruthy();
  });

  it('should update selectedImage when onImageSelected is called', () => {
    const testImage = { id: 2, isDefault: false, displayOrder: 1 };
    component.onImageSelected(testImage);
    expect(component.selectedImage).toEqual(testImage);
  });
});
