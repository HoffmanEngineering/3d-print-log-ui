import { ScrollDispatcher } from '@angular/cdk/scrolling';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';

import { DocBackToTopComponent } from './doc-back-to-top.component';
import { shouldShowBackToTop } from './scroll-target';

describe('shouldShowBackToTop', () => {
  it('stays hidden within the first two screens', () => {
    expect(shouldShowBackToTop(0, 800)).toBe(false);
    expect(shouldShowBackToTop(1600, 800)).toBe(false);
  });

  it('appears past two screens', () => {
    expect(shouldShowBackToTop(1601, 800)).toBe(true);
  });

  it('scales with the viewport rather than a fixed pixel count', () => {
    // The same absolute offset is deep into a short viewport and barely past
    // the fold on a tall one.
    expect(shouldShowBackToTop(1000, 400)).toBe(true);
    expect(shouldShowBackToTop(1000, 900)).toBe(false);
  });
});

describe('DocBackToTopComponent', () => {
  let fixture: ComponentFixture<DocBackToTopComponent>;
  let scrolled: Subject<void>;

  const button = (): HTMLButtonElement | null =>
    fixture.nativeElement.querySelector('[data-cy="doc-back-to-top"]');

  beforeEach(async () => {
    scrolled = new Subject<void>();

    await TestBed.configureTestingModule({
      imports: [DocBackToTopComponent],
      providers: [
        {
          provide: ScrollDispatcher,
          useValue: { scrolled: () => scrolled.asObservable() },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(DocBackToTopComponent);
    fixture.detectChanges();
  });

  it('renders no button until the reader has scrolled', () => {
    expect(button()).toBeNull();
  });

  it('renders the button once the page is scrolled past two screens', () => {
    const element = document.documentElement;
    vi.spyOn(element, 'scrollTop', 'get').mockReturnValue(5000);
    vi.spyOn(element, 'clientHeight', 'get').mockReturnValue(800);

    scrolled.next();
    fixture.detectChanges();

    expect(button()).not.toBeNull();
    expect(button()?.getAttribute('aria-label')).toBe('Back to top of page');
  });

  it('scrolls the page to the top and hides itself again', () => {
    const element = document.documentElement;
    vi.spyOn(element, 'scrollTop', 'get').mockReturnValue(5000);
    vi.spyOn(element, 'clientHeight', 'get').mockReturnValue(800);
    // Typed as the two-argument scrollTo(x, y) overload, so the options-object
    // call has to be read back off the spy rather than matched inline.
    const scrollTo = vi.spyOn(element, 'scrollTo').mockReturnValue(undefined);
    scrolled.next();
    fixture.detectChanges();

    button()?.click();
    fixture.detectChanges();

    expect(scrollTo).toHaveBeenCalled();
    expect(vi.mocked(scrollTo).mock.lastCall[0]).toEqual(
      expect.objectContaining({ top: 0 })
    );
    expect(fixture.componentInstance.visible()).toBe(false);
    expect(button()).toBeNull();
  });
});
