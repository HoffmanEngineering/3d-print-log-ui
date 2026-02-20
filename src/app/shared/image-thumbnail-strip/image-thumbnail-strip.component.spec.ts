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

  it('should emit imageSelected when thumbnail select button is clicked', () => {
    const spy = spyOn(component.imageSelected, 'emit');
    const btn = fixture.nativeElement.querySelector('.thumbnail-select');
    btn.click();
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

  describe('getSelectLabel', () => {
    it('should return "Image 1 of 2" for a non-default image at index 0', () => {
      const image: ThumbnailImage = {
        id: 1,
        url: 'x',
        isDefault: false,
        displayOrder: 0,
      };
      fixture.componentRef.setInput('images', [image, mockImages[1]]);
      fixture.detectChanges();
      expect(component.getSelectLabel(image, 0)).toBe('Image 1 of 2');
    });

    it('should append ", default" for the default image', () => {
      expect(component.getSelectLabel(mockImages[0], 0)).toBe(
        'Image 1 of 2, default'
      );
    });

    it('should reflect the correct total count', () => {
      expect(component.getSelectLabel(mockImages[1], 1)).toBe('Image 2 of 2');
    });
  });

  describe('accessibility — thumbnail list', () => {
    it('should render thumbnails container as a <ul>', () => {
      const list = fixture.nativeElement.querySelector('ul.thumbnails');
      expect(list).toBeTruthy();
    });

    it('should render each thumbnail as an <li>', () => {
      const items = fixture.nativeElement.querySelectorAll('li.thumbnail');
      expect(items.length).toBe(2);
    });

    it('should render a select button inside each thumbnail', () => {
      const btns = fixture.nativeElement.querySelectorAll('.thumbnail-select');
      expect(btns.length).toBe(2);
    });

    it('should set aria-label to "Image 1 of 2, default" on the first select button', () => {
      const btn =
        fixture.nativeElement.querySelectorAll('.thumbnail-select')[0];
      expect(btn.getAttribute('aria-label')).toBe('Image 1 of 2, default');
    });

    it('should set aria-label to "Image 2 of 2" on the second select button', () => {
      const btn =
        fixture.nativeElement.querySelectorAll('.thumbnail-select')[1];
      expect(btn.getAttribute('aria-label')).toBe('Image 2 of 2');
    });

    it('should set aria-current="true" on the selected thumbnail', () => {
      fixture.componentRef.setInput('selectedId', 1);
      fixture.detectChanges();
      const btns = fixture.nativeElement.querySelectorAll('.thumbnail-select');
      expect(btns[0].getAttribute('aria-current')).toBe('true');
      expect(btns[1].getAttribute('aria-current')).toBeNull();
    });

    it('should set alt="" on thumbnail images (label is on the button)', () => {
      const imgs = fixture.nativeElement.querySelectorAll(
        '.thumbnail-select img'
      );
      imgs.forEach((img: HTMLImageElement) =>
        expect(img.getAttribute('alt')).toBe('')
      );
    });

    it('should set aria-hidden="true" on the default star icon', () => {
      const star = fixture.nativeElement.querySelector('.default-star');
      expect(star.getAttribute('aria-hidden')).toBe('true');
    });
  });
});
