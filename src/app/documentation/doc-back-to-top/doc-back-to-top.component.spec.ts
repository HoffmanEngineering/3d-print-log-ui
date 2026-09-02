import { ScrollDispatcher } from '@angular/cdk/scrolling';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';

import { DocBackToTopComponent } from './doc-back-to-top.component';
import { shouldShowBackToTop } from './scroll-target';

describe('shouldShowBackToTop', () => {
  it('stays hidden within the first two screens', () => {
    expect(shouldShowBackToTop(0, 800)).toBeFalse();
    expect(shouldShowBackToTop(1600, 800)).toBeFalse();
  });

  it('appears past two screens', () => {
    expect(shouldShowBackToTop(1601, 800)).toBeTrue();
  });

  it('scales with the viewport rather than a fixed pixel count', () => {
    // The same absolute offset is deep into a short viewport and barely past
    // the fold on a tall one.
    expect(shouldShowBackToTop(1000, 400)).toBeTrue();
    expect(shouldShowBackToTop(1000, 900)).toBeFalse();
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
    spyOnProperty(element, 'scrollTop').and.returnValue(5000);
    spyOnProperty(element, 'clientHeight').and.returnValue(800);

    scrolled.next();
    fixture.detectChanges();

    expect(button()).not.toBeNull();
    expect(button()?.getAttribute('aria-label')).toBe('Back to top of page');
  });

  it('scrolls the page to the top and hides itself again', () => {
    const element = document.documentElement;
    spyOnProperty(element, 'scrollTop').and.returnValue(5000);
    spyOnProperty(element, 'clientHeight').and.returnValue(800);
    // Typed as the two-argument scrollTo(x, y) overload, so the options-object
    // call has to be read back off the spy rather than matched inline.
    const scrollTo = spyOn(element, 'scrollTo');
    scrolled.next();
    fixture.detectChanges();

    button()?.click();
    fixture.detectChanges();

    expect(scrollTo).toHaveBeenCalled();
    expect(scrollTo.calls.mostRecent().args[0]).toEqual(
      jasmine.objectContaining({ top: 0 })
    );
    expect(fixture.componentInstance.visible()).toBeFalse();
    expect(button()).toBeNull();
  });
});
