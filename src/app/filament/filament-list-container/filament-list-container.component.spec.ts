import { EMPTY } from 'rxjs';
import { FilamentListContainerComponent } from './filament-list-container.component';

// Isolated unit tests for pure methods — no TestBed needed
describe('FilamentListContainerComponent (isolated)', () => {
  let component: FilamentListContainerComponent;

  // Minimal router stub: constructor subscribes to router.events at construction time
  const routerStub = {
    events: EMPTY,
    navigate: (..._args: unknown[]) => Promise.resolve(true),
  };
  const activatedRouteStub = {};

  beforeEach(() => {
    // Construct with minimal stubs — only testing pure methods
    component = new FilamentListContainerComponent(
      activatedRouteStub as any, // ActivatedRoute
      null as any, // FilamentService
      null as any, // Title
      routerStub as any, // Router
      null as any, // MatDialog
      null as any // ToastrService
    );
  });

  describe('toggleFilterPanel', () => {
    it('opens the filter panel when closed', () => {
      component.isFilterPanelOpen = false;
      component.toggleFilterPanel();
      expect(component.isFilterPanelOpen).toBeTrue();
    });

    it('closes the filter panel when open', () => {
      component.isFilterPanelOpen = true;
      component.toggleFilterPanel();
      expect(component.isFilterPanelOpen).toBeFalse();
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
      spyOn(component, 'updateFilter');

      component.resetFilters();

      expect(component.searchText).toBe('');
      expect(component.showFavoritesOnly).toBeFalse();
      expect(component.showLoadedFilamentOnly).toBeFalse();
      expect(component.includeInactive).toBeFalse();
      expect(component.filterByMaterialCategory).toBe('');
      expect(component.filterByStorageLocation).toBe('');
      expect(component.currentPage).toBe(1);
    });

    it('calls updateFilter after resetting', () => {
      spyOn(component, 'updateFilter');
      component.resetFilters();
      expect(component.updateFilter).toHaveBeenCalled();
    });
  });

  describe('navigateToFilament', () => {
    it('navigates to the filament detail route', () => {
      spyOn(routerStub, 'navigate');
      component.navigateToFilament('abc-123');
      expect(routerStub.navigate).toHaveBeenCalledWith(
        ['abc-123'],
        jasmine.objectContaining({ relativeTo: jasmine.anything() })
      );
    });
  });
});
