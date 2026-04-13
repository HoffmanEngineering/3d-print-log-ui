import { TestBed } from '@angular/core/testing';
import { DOCUMENT } from '@angular/common';
import { ThemeService, ThemeMode } from './theme.service';

describe('ThemeService', () => {
  let service: ThemeService;
  let mockDocument: Document;
  let mockMediaQuery: { matches: boolean; addEventListener: jasmine.Spy };

  function buildService(
    savedMode: string | null = null,
    osPrefersDark = false
  ) {
    localStorage.clear();
    if (savedMode) localStorage.setItem('theme-mode', savedMode);

    mockMediaQuery = {
      matches: osPrefersDark,
      addEventListener: jasmine.createSpy(),
    };
    spyOn(window, 'matchMedia').and.returnValue(mockMediaQuery as any);

    mockDocument = document;
    mockDocument.body.className = '';

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [ThemeService, { provide: DOCUMENT, useValue: mockDocument }],
    });
    service = TestBed.inject(ThemeService);
  }

  it('defaults to system mode when localStorage is empty', () => {
    buildService(null);
    expect(service.mode()).toBe('system');
  });

  it('loads saved mode from localStorage', () => {
    buildService('dark');
    expect(service.mode()).toBe('dark');
  });

  it('setMode(dark) adds dark-theme class to body', () => {
    buildService();
    service.setMode('dark');
    expect(mockDocument.body.classList.contains('dark-theme')).toBeTrue();
  });

  it('setMode(dark) writes to localStorage', () => {
    buildService();
    service.setMode('dark');
    expect(localStorage.getItem('theme-mode')).toBe('dark');
  });

  it('setMode(light) removes dark-theme class from body', () => {
    buildService('dark');
    mockDocument.body.classList.add('dark-theme');
    service.setMode('light');
    expect(mockDocument.body.classList.contains('dark-theme')).toBeFalse();
  });

  it('setMode(system) adds dark-theme when OS prefers dark', () => {
    buildService(null, true /* osPrefersDark */);
    service.setMode('system');
    expect(mockDocument.body.classList.contains('dark-theme')).toBeTrue();
  });

  it('setMode(system) removes dark-theme when OS prefers light', () => {
    buildService(null, false /* osPrefersDark */);
    mockDocument.body.classList.add('dark-theme');
    service.setMode('system');
    expect(mockDocument.body.classList.contains('dark-theme')).toBeFalse();
  });

  it('initialize() registers media query change listener', () => {
    buildService();
    service.initialize();
    expect(mockMediaQuery.addEventListener).toHaveBeenCalledWith(
      'change',
      jasmine.any(Function)
    );
  });

  it('media query change re-applies theme only when mode is system', () => {
    buildService('dark', false);
    service.initialize();
    const [, listener] = mockMediaQuery.addEventListener.calls.first().args;

    // OS switches to dark — should NOT change class since mode is 'dark', not 'system'
    mockDocument.body.classList.remove('dark-theme');
    mockMediaQuery.matches = true;
    listener();
    expect(mockDocument.body.classList.contains('dark-theme')).toBeFalse();
  });

  it('media query change applies dark-theme when mode is system and OS switches to dark', () => {
    buildService('system', false);
    service.initialize();
    const [, listener] = mockMediaQuery.addEventListener.calls.first().args;

    mockMediaQuery.matches = true;
    listener();
    expect(mockDocument.body.classList.contains('dark-theme')).toBeTrue();
  });
});
