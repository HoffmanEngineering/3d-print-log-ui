import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { LoggingService } from 'src/app/core/services/logging.service';
import {
  PrintStatus,
  SameFilePrint,
} from 'src/app/core/services/print.service';
import { PrintSameFileComponent } from './print-same-file.component';

describe('PrintSameFileComponent', () => {
  let fixture: ComponentFixture<PrintSameFileComponent>;
  let httpMock: HttpTestingController;
  let logging: jasmine.SpyObj<LoggingService>;

  const other = (id: number, title: string | null = `Print ${id}`) =>
    ({
      id,
      title,
      status: PrintStatus.Success,
      startDate: '2026-03-14T12:00:00Z',
      createdDate: '2026-03-14T12:00:00Z',
      defaultPrintImageId: null,
    }) satisfies SameFilePrint;

  beforeEach(async () => {
    logging = jasmine.createSpyObj<LoggingService>('LoggingService', [
      'logEvent',
      'logException',
    ]);

    // The real PrintService over the HTTP testing backend: the request itself (URL, no
    // anonymous header) is part of what this component promises the public route.
    await TestBed.configureTestingModule({
      imports: [PrintSameFileComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideNoopAnimations(),
        provideRouter([]),
        { provide: LoggingService, useValue: logging },
      ],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(PrintSameFileComponent);
    fixture.componentRef.setInput('printId', 5);
  });

  afterEach(() => httpMock.verify());

  const respond = (body: unknown) => {
    fixture.detectChanges();
    httpMock
      .expectOne((r) => r.url.endsWith('/api/Prints/5/same-file'))
      .flush(body);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  };

  const trigger = (el: HTMLElement) =>
    el.querySelector<HTMLButtonElement>('[data-cy-same-file-trigger]');

  const openMenu = async (el: HTMLElement) => {
    trigger(el)!.click();
    fixture.detectChanges();
    await fixture.whenStable();
    return document.querySelector<HTMLElement>('.same-file-menu')!;
  };

  it('says how many times the file was printed', () => {
    const el = respond({ count: 3, prints: [other(8), other(6)] });

    expect(trigger(el)?.textContent).toContain('Printed 3 times');
  });

  it('renders nothing for a file printed once', () => {
    const el = respond({ count: 1, prints: [] });

    expect(trigger(el)).toBeNull();
    expect(el.textContent?.trim()).toBe('');
  });

  it('renders nothing for a print with no file hash', () => {
    const el = respond({ count: 0, prints: [] });

    expect(trigger(el)).toBeNull();
  });

  it('renders nothing, and does not throw, when the request fails', () => {
    fixture.detectChanges();
    httpMock
      .expectOne((r) => r.url.endsWith('/api/Prints/5/same-file'))
      .flush(null, { status: 404, statusText: 'Not Found' });

    expect(() => fixture.detectChanges()).not.toThrow();
    expect(trigger(fixture.nativeElement)).toBeNull();
    expect(logging.logException).toHaveBeenCalledTimes(1);
  });

  it('lists the other prints as links to them', async () => {
    const el = respond({
      count: 3,
      prints: [other(8, 'Second go'), other(6, null)],
    });

    const menu = await openMenu(el);
    const links = Array.from(
      menu.querySelectorAll<HTMLAnchorElement>('[data-cy-same-file-print]')
    );

    expect(links.map((a) => a.getAttribute('href'))).toEqual([
      '/prints/8',
      '/prints/6',
    ]);
    expect(links[0].textContent).toContain('Second go');
    expect(links[1].textContent).toContain('Untitled print');
  });

  it('says how many more there are than the list shows', async () => {
    const el = respond({ count: 14, prints: [other(8), other(6)] });

    const menu = await openMenu(el);

    // 14 prints: this one, the two listed, and 11 more.
    expect(menu.textContent).toContain('11 more');
  });

  it('announces the rest as a disabled menu item', async () => {
    const el = respond({ count: 14, prints: [other(8), other(6)] });

    const menu = await openMenu(el);
    const more = menu.querySelector<HTMLElement>('[data-cy-same-file-more]');

    // A plain paragraph inside role="menu" is skipped by screen readers moving item to item.
    expect(more?.getAttribute('role')).toBe('menuitem');
    expect(more?.getAttribute('aria-disabled')).toBe('true');
    expect(more?.textContent).toContain('11 more');
  });

  it('labels the menu and hides the visual heading from screen readers', async () => {
    const el = respond({ count: 3, prints: [other(8), other(6)] });

    const menu = await openMenu(el);

    expect(menu.getAttribute('aria-label')).toBe('Other prints of this file');
    expect(
      menu.querySelector('.menu-heading')?.getAttribute('aria-hidden')
    ).toBe('true');
  });

  it('does not mention more when the list is complete', async () => {
    const el = respond({ count: 3, prints: [other(8), other(6)] });

    const menu = await openMenu(el);

    expect(menu.textContent).not.toContain('more');
  });

  it('logs opening the list', async () => {
    const el = respond({ count: 3, prints: [other(8), other(6)] });

    await openMenu(el);

    expect(logging.logEvent).toHaveBeenCalledWith('PrintSameFile_Opened', {
      printId: 5,
      count: 3,
    });
  });

  it('logs choosing a print', async () => {
    const el = respond({ count: 3, prints: [other(8), other(6)] });

    const menu = await openMenu(el);
    menu.querySelector<HTMLAnchorElement>('[data-cy-same-file-print]')!.click();

    expect(logging.logEvent).toHaveBeenCalledWith(
      'PrintSameFile_PrintSelected',
      { printId: 5, selectedPrintId: 8 }
    );
  });

  it('refetches when the router reuses it for another print', () => {
    respond({ count: 3, prints: [other(8), other(6)] });

    fixture.componentRef.setInput('printId', 8);
    fixture.detectChanges();
    // Print 6's answer must not stand in for print 8's while that one is in flight.
    expect(trigger(fixture.nativeElement)).toBeNull();
    httpMock
      .expectOne((r) => r.url.endsWith('/api/Prints/8/same-file'))
      .flush({ count: 1, prints: [] });
    fixture.detectChanges();

    expect(trigger(fixture.nativeElement)).toBeNull();
  });
});
