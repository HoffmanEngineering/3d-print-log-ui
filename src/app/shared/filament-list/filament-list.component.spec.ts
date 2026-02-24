import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { FilamentListComponent } from './filament-list.component';
import { FilamentService } from 'src/app/core/services/filament.service';
import { MaterialCategoryService } from 'src/app/core/services/material-categories.service';

describe('FilamentListComponent', () => {
  let component: FilamentListComponent;
  let fixture: ComponentFixture<FilamentListComponent>;

  const mockFilamentService = jasmine.createSpyObj<FilamentService>(
    'FilamentService',
    ['getCurrentUserFilamentSummaries', 'changeFavorite']
  );
  mockFilamentService.getCurrentUserFilamentSummaries.and.returnValue(
    of({
      items: [],
      paging: { currentPage: 1, pageSize: 10, totalCount: 0 },
    } as any)
  );

  const mockMaterialCategoryService =
    jasmine.createSpyObj<MaterialCategoryService>('MaterialCategoryService', [
      'getMaterialCategories',
    ]);
  mockMaterialCategoryService.getMaterialCategories.and.returnValue(of([]));

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [FilamentListComponent],
      providers: [
        { provide: FilamentService, useValue: mockFilamentService },
        {
          provide: MaterialCategoryService,
          useValue: mockMaterialCategoryService,
        },
      ],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(FilamentListComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  describe('isFilterPanelOpen', () => {
    it('should default to true when viewport is >= 600px', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1024,
      });
      const c = new FilamentListComponent(
        mockFilamentService,
        mockMaterialCategoryService
      );
      expect(c.isFilterPanelOpen).toBeTrue();
    });

    it('should default to false when viewport is < 600px', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 400,
      });
      const c = new FilamentListComponent(
        mockFilamentService,
        mockMaterialCategoryService
      );
      expect(c.isFilterPanelOpen).toBeFalse();
    });

    it('toggleFilterPanel should flip the value', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1024,
      });
      const c = new FilamentListComponent(
        mockFilamentService,
        mockMaterialCategoryService
      );
      expect(c.isFilterPanelOpen).toBeTrue();
      c.toggleFilterPanel();
      expect(c.isFilterPanelOpen).toBeFalse();
      c.toggleFilterPanel();
      expect(c.isFilterPanelOpen).toBeTrue();
    });
  });

  describe('activeFilterCount', () => {
    beforeEach(() => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1024,
      });
    });

    it('should return 0 when no filters are active', () => {
      const c = new FilamentListComponent(
        mockFilamentService,
        mockMaterialCategoryService
      );
      expect(c.activeFilterCount).toBe(0);
    });

    it('should count includeInactive', () => {
      const c = new FilamentListComponent(
        mockFilamentService,
        mockMaterialCategoryService
      );
      c.includeInactive = true;
      expect(c.activeFilterCount).toBe(1);
    });

    it('should count showFavoritesOnly', () => {
      const c = new FilamentListComponent(
        mockFilamentService,
        mockMaterialCategoryService
      );
      c.showFavoritesOnly = true;
      expect(c.activeFilterCount).toBe(1);
    });

    it('should count showLoadedFilamentOnly', () => {
      const c = new FilamentListComponent(
        mockFilamentService,
        mockMaterialCategoryService
      );
      c.showLoadedFilamentOnly = true;
      expect(c.activeFilterCount).toBe(1);
    });

    it('should count non-empty filterByMaterialCategory', () => {
      const c = new FilamentListComponent(
        mockFilamentService,
        mockMaterialCategoryService
      );
      c['_filterByMaterialCategory'] = 'PLA';
      expect(c.activeFilterCount).toBe(1);
    });

    it('should count all active filters together', () => {
      const c = new FilamentListComponent(
        mockFilamentService,
        mockMaterialCategoryService
      );
      c.includeInactive = true;
      c.showFavoritesOnly = true;
      c.showLoadedFilamentOnly = true;
      c['_filterByMaterialCategory'] = 'PETG';
      expect(c.activeFilterCount).toBe(4);
    });
  });
});
