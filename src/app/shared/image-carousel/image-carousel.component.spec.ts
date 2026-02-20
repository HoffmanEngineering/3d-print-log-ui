import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ImageCarouselComponent } from './image-carousel.component';

describe('ImageCarouselComponent', () => {
  let component: ImageCarouselComponent;
  let fixture: ComponentFixture<ImageCarouselComponent>;

  function setup(imageCount: number, selectedIndex: number) {
    fixture.componentRef.setInput('imageCount', imageCount);
    fixture.componentRef.setInput('selectedIndex', selectedIndex);
    fixture.detectChanges();
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ImageCarouselComponent, NoopAnimationsModule],
    }).compileComponents();

    fixture = TestBed.createComponent(ImageCarouselComponent);
    component = fixture.componentInstance;
    setup(3, 1);
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('arrow visibility', () => {
    it('should show left arrow when selectedIndex > 0', () => {
      setup(3, 1);
      expect(
        fixture.nativeElement.querySelector('.nav-arrow--left')
      ).toBeTruthy();
    });

    it('should hide left arrow at index 0', () => {
      setup(3, 0);
      expect(
        fixture.nativeElement.querySelector('.nav-arrow--left')
      ).toBeFalsy();
    });

    it('should show right arrow when not at last image', () => {
      setup(3, 0);
      expect(
        fixture.nativeElement.querySelector('.nav-arrow--right')
      ).toBeTruthy();
    });

    it('should hide right arrow at last image', () => {
      setup(3, 2);
      expect(
        fixture.nativeElement.querySelector('.nav-arrow--right')
      ).toBeFalsy();
    });

    it('should hide both arrows with a single image', () => {
      setup(1, 0);
      expect(
        fixture.nativeElement.querySelector('.nav-arrow--left')
      ).toBeFalsy();
      expect(
        fixture.nativeElement.querySelector('.nav-arrow--right')
      ).toBeFalsy();
    });

    it('should hide both arrows with zero images', () => {
      setup(0, 0);
      expect(
        fixture.nativeElement.querySelector('.nav-arrow--left')
      ).toBeFalsy();
      expect(
        fixture.nativeElement.querySelector('.nav-arrow--right')
      ).toBeFalsy();
    });
  });

  describe('arrow click navigation', () => {
    it('should emit previous index when left arrow clicked', () => {
      setup(3, 2);
      const spy = spyOn(component.indexChange, 'emit');
      fixture.nativeElement.querySelector('.nav-arrow--left').click();
      expect(spy).toHaveBeenCalledWith(1);
    });

    it('should emit next index when right arrow clicked', () => {
      setup(3, 1);
      const spy = spyOn(component.indexChange, 'emit');
      fixture.nativeElement.querySelector('.nav-arrow--right').click();
      expect(spy).toHaveBeenCalledWith(2);
    });

    it('should not emit when prev() called at index 0', () => {
      setup(3, 0);
      const spy = spyOn(component.indexChange, 'emit');
      component.prev();
      expect(spy).not.toHaveBeenCalled();
    });

    it('should not emit when next() called at last index', () => {
      setup(3, 2);
      const spy = spyOn(component.indexChange, 'emit');
      component.next();
      expect(spy).not.toHaveBeenCalled();
    });
  });

  describe('swipe gestures', () => {
    function swipe(startX: number, endX: number) {
      const container = fixture.nativeElement.querySelector(
        '.carousel-container'
      );
      container.dispatchEvent(
        new TouchEvent('touchstart', {
          touches: [{ clientX: startX } as Touch],
          bubbles: true,
        })
      );
      container.dispatchEvent(
        new TouchEvent('touchend', {
          changedTouches: [{ clientX: endX } as Touch],
          bubbles: true,
        })
      );
    }

    it('should navigate next on swipe left (delta >= 50px)', () => {
      setup(3, 1);
      const spy = spyOn(component.indexChange, 'emit');
      swipe(200, 100);
      expect(spy).toHaveBeenCalledWith(2);
    });

    it('should navigate prev on swipe right (delta >= 50px)', () => {
      setup(3, 1);
      const spy = spyOn(component.indexChange, 'emit');
      swipe(100, 200);
      expect(spy).toHaveBeenCalledWith(0);
    });

    it('should not navigate when swipe delta < 50px', () => {
      setup(3, 1);
      const spy = spyOn(component.indexChange, 'emit');
      swipe(100, 130);
      expect(spy).not.toHaveBeenCalled();
    });

    it('should not navigate past last image on swipe left', () => {
      setup(3, 2);
      const spy = spyOn(component.indexChange, 'emit');
      swipe(200, 100);
      expect(spy).not.toHaveBeenCalled();
    });

    it('should not navigate before first image on swipe right', () => {
      setup(3, 0);
      const spy = spyOn(component.indexChange, 'emit');
      swipe(100, 200);
      expect(spy).not.toHaveBeenCalled();
    });
  });

  describe('keyboard navigation', () => {
    function pressKey(key: string) {
      const container = fixture.nativeElement.querySelector(
        '.carousel-container'
      );
      container.dispatchEvent(
        new KeyboardEvent('keydown', { key, bubbles: true })
      );
    }

    it('should emit prev index on ArrowLeft', () => {
      setup(3, 2);
      const spy = spyOn(component.indexChange, 'emit');
      pressKey('ArrowLeft');
      expect(spy).toHaveBeenCalledWith(1);
    });

    it('should emit next index on ArrowRight', () => {
      setup(3, 1);
      const spy = spyOn(component.indexChange, 'emit');
      pressKey('ArrowRight');
      expect(spy).toHaveBeenCalledWith(2);
    });

    it('should not emit on ArrowLeft when at first image', () => {
      setup(3, 0);
      const spy = spyOn(component.indexChange, 'emit');
      pressKey('ArrowLeft');
      expect(spy).not.toHaveBeenCalled();
    });

    it('should not emit on ArrowRight when at last image', () => {
      setup(3, 2);
      const spy = spyOn(component.indexChange, 'emit');
      pressKey('ArrowRight');
      expect(spy).not.toHaveBeenCalled();
    });

    it('should not emit on unrelated keys', () => {
      setup(3, 1);
      const spy = spyOn(component.indexChange, 'emit');
      pressKey('Enter');
      expect(spy).not.toHaveBeenCalled();
    });
  });

  describe('accessibility — container', () => {
    it('should have role="group" on the container', () => {
      setup(3, 1);
      const container = fixture.nativeElement.querySelector(
        '.carousel-container'
      );
      expect(container.getAttribute('role')).toBe('group');
    });

    it('should have aria-roledescription="carousel" on the container', () => {
      setup(3, 1);
      const container = fixture.nativeElement.querySelector(
        '.carousel-container'
      );
      expect(container.getAttribute('aria-roledescription')).toBe('carousel');
    });

    it('should default aria-label to "Image gallery"', () => {
      setup(3, 1);
      const container = fixture.nativeElement.querySelector(
        '.carousel-container'
      );
      expect(container.getAttribute('aria-label')).toBe('Image gallery');
    });

    it('should use the label input for aria-label when provided', () => {
      fixture.componentRef.setInput('label', 'Print images');
      setup(3, 1);
      const container = fixture.nativeElement.querySelector(
        '.carousel-container'
      );
      expect(container.getAttribute('aria-label')).toBe('Print images');
    });

    it('should render a live region with the current image position', () => {
      setup(3, 1);
      const live = fixture.nativeElement.querySelector('[aria-live="polite"]');
      expect(live).toBeTruthy();
      expect(live.textContent.trim()).toBe('Image 2 of 3');
    });

    it('should update the live region when the index changes', () => {
      setup(3, 0);
      const live = fixture.nativeElement.querySelector('[aria-live="polite"]');
      expect(live.textContent.trim()).toBe('Image 1 of 3');
      setup(3, 2);
      expect(live.textContent.trim()).toBe('Image 3 of 3');
    });
  });
});
