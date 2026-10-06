import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Meta, Title } from '@angular/platform-browser';
import { provideRouter, Router } from '@angular/router';

import { LoggingService } from '../core/services/logging.service';
import { NotFoundComponent } from './not-found.component';

describe('NotFoundComponent', () => {
  let fixture: ComponentFixture<NotFoundComponent>;
  let logging: jasmine.SpyObj<LoggingService>;
  let meta: Meta;

  beforeEach(async () => {
    logging = jasmine.createSpyObj<LoggingService>('LoggingService', [
      'logEvent',
    ]);

    await TestBed.configureTestingModule({
      imports: [NotFoundComponent],
      providers: [
        provideRouter([]),
        { provide: LoggingService, useValue: logging },
      ],
    }).compileComponents();

    const router = TestBed.inject(Router);
    spyOnProperty(router, 'url', 'get').and.returnValue(
      '/prints/1/nope?code=secret#token=abc'
    );
    meta = TestBed.inject(Meta);

    fixture = TestBed.createComponent(NotFoundComponent);
    fixture.detectChanges();
  });

  it('tells the reader the page does not exist', () => {
    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('Page not found');
    expect(TestBed.inject(Title).getTitle()).toBe(
      'Page not found | 3D Print Log'
    );
  });

  it('links home and to the docs', () => {
    const hrefs = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('a')
    ).map((a) => a.getAttribute('href'));
    expect(hrefs).toEqual(['/home-redirect', '/docs/getting-started']);
  });

  it('keeps the page out of search indexes until it is left', () => {
    expect(meta.getTag('name="robots"')?.content).toBe('noindex');
    fixture.destroy();
    expect(meta.getTag('name="robots"')).toBeNull();
  });

  it('logs the path without its query string or fragment', () => {
    expect(logging.logEvent).toHaveBeenCalledOnceWith('NotFound_Viewed', {
      path: '/prints/1/nope',
    });
  });
});
