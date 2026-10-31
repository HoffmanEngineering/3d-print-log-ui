import { ChangeDetectorRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MatBottomSheet } from '@angular/material/bottom-sheet';
import { MatDialog } from '@angular/material/dialog';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { EMPTY } from 'rxjs';
import { FilamentService } from 'src/app/core/services/filament.service';
import { LoggingService } from 'src/app/core/services/logging.service';
import { TagReaderService } from 'src/app/core/services/tag-reader.service';
import { FilamentListContainerComponent } from './filament-list-container.component';

// Isolated unit tests for pure methods — no component fixture needed
describe('FilamentListContainerComponent (isolated)', () => {
  let component: FilamentListContainerComponent;

  // Minimal router stub: constructor subscribes to router.events at construction time
  const routerStub = {
    events: EMPTY,
    navigate: (..._args: unknown[]) => Promise.resolve(true),
  };

  beforeEach(() => {
    // Construct with minimal stubs — only testing pure methods
    TestBed.configureTestingModule({
      providers: [
        // Built outside a view, so there is none to mark: a no-op stands in.
        {
          provide: ChangeDetectorRef,
          useValue: { markForCheck: () => undefined },
        },
        { provide: ActivatedRoute, useValue: {} },
        { provide: FilamentService, useValue: null },
        { provide: Title, useValue: null },
        { provide: Router, useValue: routerStub },
        { provide: MatDialog, useValue: null },
        { provide: ToastrService, useValue: null },
        { provide: MatBottomSheet, useValue: null },
        { provide: LoggingService, useValue: null },
        { provide: TagReaderService, useValue: { available: () => false } },
      ],
    });
    component = TestBed.runInInjectionContext(
      () => new FilamentListContainerComponent()
    );
  });

  describe('toggleFilterPanel', () => {
    it('opens the filter panel when closed', () => {
      component.isFilterPanelOpen = false;
      component.toggleFilterPanel();
      expect(component.isFilterPanelOpen).toBe(true);
    });

    it('closes the filter panel when open', () => {
      component.isFilterPanelOpen = true;
      component.toggleFilterPanel();
      expect(component.isFilterPanelOpen).toBe(false);
    });
  });

  describe('activeFilterCount', () => {
    it('returns 0 when no filters are active', () => {
      component.showFavoritesOnly = false;
      component.showLoadedFilamentOnly = false;
      component.includeInactive = false;
      component.filterByMaterialCategory = '';
      expect(component.activeFilterCount).toBe(0);
    });

    it('counts showFavoritesOnly', () => {
      component.showFavoritesOnly = true;
      component.showLoadedFilamentOnly = false;
      component.includeInactive = false;
      component.filterByMaterialCategory = '';
      expect(component.activeFilterCount).toBe(1);
    });

    it('counts showLoadedFilamentOnly', () => {
      component.showFavoritesOnly = false;
      component.showLoadedFilamentOnly = true;
      component.includeInactive = false;
      component.filterByMaterialCategory = '';
      expect(component.activeFilterCount).toBe(1);
    });

    it('counts includeInactive', () => {
      component.showFavoritesOnly = false;
      component.showLoadedFilamentOnly = false;
      component.includeInactive = true;
      component.filterByMaterialCategory = '';
      expect(component.activeFilterCount).toBe(1);
    });

    it('counts filterByMaterialCategory when set', () => {
      component.showFavoritesOnly = false;
      component.showLoadedFilamentOnly = false;
      component.includeInactive = false;
      component.filterByMaterialCategory = 'PLA';
      expect(component.activeFilterCount).toBe(1);
    });

    it('counts filterByStorageLocation when set', () => {
      component.showFavoritesOnly = false;
      component.showLoadedFilamentOnly = false;
      component.includeInactive = false;
      component.filterByMaterialCategory = '';
      component.filterByStorageLocation = 'Box 1';
      expect(component.activeFilterCount).toBe(1);
    });

    it('counts all five active filters', () => {
      component.showFavoritesOnly = true;
      component.showLoadedFilamentOnly = true;
      component.includeInactive = true;
      component.filterByMaterialCategory = 'PETG';
      component.filterByStorageLocation = 'Box 1';
      expect(component.activeFilterCount).toBe(5);
    });
  });

  describe('resetFilters', () => {
    it('resets all filter fields to defaults', () => {
      component.searchText = 'test';
      component.showFavoritesOnly = true;
      component.showLoadedFilamentOnly = true;
      component.includeInactive = true;
      component.filterByMaterialCategory = 'PLA';
      component.filterByStorageLocation = 'Box 2';

      // Stub updateFilter so it doesn't throw (router is null)
      vi.spyOn(component, 'updateFilter').mockReturnValue(undefined);

      component.resetFilters();

      expect(component.searchText).toBe('');
      expect(component.showFavoritesOnly).toBe(false);
      expect(component.showLoadedFilamentOnly).toBe(false);
      expect(component.includeInactive).toBe(false);
      expect(component.filterByMaterialCategory).toBe('');
      expect(component.filterByStorageLocation).toBe('');
      expect(component.currentPage()).toBe(1);
    });

    it('calls updateFilter after resetting', () => {
      vi.spyOn(component, 'updateFilter').mockReturnValue(undefined);
      component.resetFilters();
      expect(component.updateFilter).toHaveBeenCalled();
    });
  });

  describe('navigateToFilament', () => {
    it('navigates to the filament detail route', () => {
      vi.spyOn(routerStub, 'navigate').mockReturnValue(undefined);
      component.navigateToFilament('abc-123');
      expect(routerStub.navigate).toHaveBeenCalledWith(
        ['abc-123'],
        expect.objectContaining({ relativeTo: expect.anything() })
      );
    });
  });
});
