import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { LoggingService } from 'src/app/core/services/logging.service';

import { PrintEmptyStateComponent } from './print-empty-state.component';

describe('PrintEmptyStateComponent', () => {
  let fixture: ComponentFixture<PrintEmptyStateComponent>;
  let component: PrintEmptyStateComponent;
  let mockLogger: jasmine.SpyObj<LoggingService>;

  const heading = () =>
    (
      fixture.debugElement.query(By.css('.empty-state__heading'))
        .nativeElement as HTMLElement
    ).textContent.trim();

  const message = () =>
    (
      fixture.debugElement.query(By.css('.empty-state__message'))
        .nativeElement as HTMLElement
    ).textContent.trim();

  beforeEach(async () => {
    mockLogger = jasmine.createSpyObj<LoggingService>('LoggingService', [
      'logEvent',
      'logException',
    ]);

    await TestBed.configureTestingModule({
      imports: [PrintEmptyStateComponent],
      providers: [
        provideRouter([]),
        { provide: LoggingService, useValue: mockLogger },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PrintEmptyStateComponent);
    component = fixture.componentInstance;
  });

  describe('when nothing is filtered', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should show the first-run heading', () => {
      expect(component.isFiltered()).toBeFalse();
      expect(heading()).toEqual('Log your first print');
    });

    it('should not tell the user to try a different search', () => {
      expect(message().toLowerCase()).not.toContain('different search');
    });

    it('should offer add print and import g-code actions', () => {
      expect(
        fixture.debugElement.query(By.css('[data-cy="empty-state-add-print"]'))
      ).toBeTruthy();
      expect(
        fixture.debugElement.query(
          By.css('[data-cy="empty-state-import-gcode"]')
        )
      ).toBeTruthy();
    });

    it('should emit importGcode and log the event', () => {
      const emitted = jasmine.createSpy('importGcode');
      component.importGcode.subscribe(emitted);

      (
        fixture.debugElement.query(
          By.css('[data-cy="empty-state-import-gcode"]')
        ).nativeElement as HTMLButtonElement
      ).click();

      expect(emitted).toHaveBeenCalled();
      expect(mockLogger.logEvent).toHaveBeenCalledWith(
        'PrintEmptyState_ImportGcode'
      );
    });

    it('should log when the add print action is used', () => {
      (
        fixture.debugElement.query(By.css('[data-cy="empty-state-add-print"]'))
          .nativeElement as HTMLButtonElement
      ).click();

      expect(mockLogger.logEvent).toHaveBeenCalledWith(
        'PrintEmptyState_AddPrint'
      );
    });
  });

  describe('when filters are active', () => {
    it('should mention a single filter in the singular', () => {
      fixture.componentRef.setInput('activeFilterCount', 1);
      fixture.detectChanges();

      expect(heading()).toEqual('No prints match your filters');
      expect(message()).toContain('1 active filter');
      expect(message()).not.toContain('filters');
    });

    it('should mention both the filter count and the search term', () => {
      fixture.componentRef.setInput('activeFilterCount', 3);
      fixture.componentRef.setInput('searchText', '  benchy  ');
      fixture.detectChanges();

      expect(message()).toContain('3 active filters');
      expect(message()).toContain('a search for "benchy"');
    });

    it('should treat a search term alone as filtered', () => {
      fixture.componentRef.setInput('searchText', 'benchy');
      fixture.detectChanges();

      expect(component.isFiltered()).toBeTrue();
      expect(message()).toContain('a search for "benchy"');
      expect(message()).not.toContain('active filter');
    });

    it('should treat whitespace-only search text as no search', () => {
      fixture.componentRef.setInput('searchText', '   ');
      fixture.detectChanges();

      expect(component.hasSearch()).toBeFalse();
      expect(heading()).toEqual('Log your first print');
    });

    it('should emit clearFilters and log the event', () => {
      fixture.componentRef.setInput('activeFilterCount', 2);
      fixture.detectChanges();

      const emitted = jasmine.createSpy('clearFilters');
      component.clearFilters.subscribe(emitted);

      (
        fixture.debugElement.query(
          By.css('[data-cy="empty-state-clear-filters"]')
        ).nativeElement as HTMLButtonElement
      ).click();

      expect(emitted).toHaveBeenCalled();
      expect(mockLogger.logEvent).toHaveBeenCalledWith(
        'PrintEmptyState_ClearFilters',
        { activeFilterCount: 2, hasSearch: false }
      );
    });
  });
});
