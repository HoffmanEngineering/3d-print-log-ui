import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import {
  ImageThumbnailStripComponent,
  ThumbnailImage,
} from './image-thumbnail-strip.component';

describe('ImageThumbnailStripComponent', () => {
  let component: ImageThumbnailStripComponent;
  let fixture: ComponentFixture<ImageThumbnailStripComponent>;

  const mockImages: ThumbnailImage[] = [
    {
      id: 1,
      url: 'data:image/png;base64,abc',
      isDefault: true,
      displayOrder: 0,
    },
    {
      id: 2,
      url: 'data:image/png;base64,def',
      isDefault: false,
      displayOrder: 1,
    },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ImageThumbnailStripComponent, NoopAnimationsModule],
    }).compileComponents();

    fixture = TestBed.createComponent(ImageThumbnailStripComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('images', mockImages);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render thumbnails for each image', () => {
    const thumbnails = fixture.nativeElement.querySelectorAll('.thumbnail');
    expect(thumbnails.length).toBe(2);
  });

  it('should show star icon on default image', () => {
    const star = fixture.nativeElement.querySelector('.default-star');
    expect(star).toBeTruthy();
  });

  it('should emit imageSelected when thumbnail clicked', () => {
    const spy = spyOn(component.imageSelected, 'emit');
    const thumbnail = fixture.nativeElement.querySelector('.thumbnail');
    thumbnail.click();
    expect(spy).toHaveBeenCalledWith(mockImages[0]);
  });

  it('should hide add button when at max images', () => {
    fixture.componentRef.setInput('editable', true);
    fixture.componentRef.setInput('maxImages', 2);
    fixture.detectChanges();
    const addButton = fixture.nativeElement.querySelector('.add-button');
    expect(addButton).toBeFalsy();
  });

  it('should show add button when below max images', () => {
    fixture.componentRef.setInput('editable', true);
    fixture.componentRef.setInput('maxImages', 5);
    fixture.detectChanges();
    const addButton = fixture.nativeElement.querySelector('.add-button');
    expect(addButton).toBeTruthy();
  });
});
