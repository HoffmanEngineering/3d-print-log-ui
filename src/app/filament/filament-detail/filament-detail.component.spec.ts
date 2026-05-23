import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MAT_DATE_LOCALE, MatNativeDateModule } from '@angular/material/core';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatChipsModule } from '@angular/material/chips';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { ActivatedRoute } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { ToastrService } from 'ngx-toastr';
import { of } from 'rxjs';
import {
  ColorPatternType,
  FilamentService,
} from 'src/app/core/services/filament.service';
import { LoggingService } from 'src/app/core/services/logging.service';
import { UserSettingService } from 'src/app/core/services/user-setting.service';

import { FilamentDetailComponent } from './filament-detail.component';

describe('FilamentDetailComponent', () => {
  let component: FilamentDetailComponent;
  let fixture: ComponentFixture<FilamentDetailComponent>;

  beforeEach(async () => {
    const mockFilamentService = jasmine.createSpyObj<FilamentService>(
      'FilamentService',
      {
        getFilamentBrands: of({ brands: [] }),
        getFilamentPurchaseLocations: of({ purchaseLocations: [] }),
        getFilamentStorageLocations: of({ storageLocations: [] }),
      }
    );

    const mockToastrservice = jasmine.createSpyObj<ToastrService>(
      'ToastrService',
      ['success']
    );

    const mockUserSettingService = jasmine.createSpyObj<UserSettingService>(
      'UserSettingService',
      ['updateUserSetting']
    );

    const mockLogger = jasmine.createSpyObj<LoggingService>('LoggingService', [
      'logException',
      'logEvent',
    ]);

    await TestBed.configureTestingModule({
      declarations: [FilamentDetailComponent],
      imports: [
        RouterTestingModule,
        FormsModule,
        ReactiveFormsModule,
        MatInputModule,
        MatSelectModule,
        MatDatepickerModule,
        MatCheckboxModule,
        MatNativeDateModule,
        MatAutocompleteModule,
        MatButtonToggleModule,
        MatChipsModule,
      ],
      providers: [
        { provide: FilamentService, useValue: mockFilamentService },
        { provide: ToastrService, useValue: mockToastrservice },
        { provide: UserSettingService, useValue: mockUserSettingService },
        { provide: LoggingService, useValue: mockLogger },
        { provide: MAT_DATE_LOCALE, useValue: 'en-US' },
        {
          provide: ActivatedRoute,
          useValue: {
            data: of({
              filament: null,
              materials: [],
              materialCategories: [],
            }),
          },
        },
      ],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(FilamentDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('color pattern form', () => {
    it('adds a second color control when switching to Gradient', () => {
      component.filamentForm
        .get('colorPattern')!
        .setValue(ColorPatternType.Gradient);
      component.onColorPatternChange();

      const colorsArray = component.colorsFormArray;
      expect(colorsArray.length).toBe(2);
    });

    it('allows adding color stops for Rainbow up to 8', () => {
      component.filamentForm
        .get('colorPattern')!
        .setValue(ColorPatternType.Rainbow);
      component.onColorPatternChange();

      // Start with 2
      expect(component.colorsFormArray.length).toBe(2);

      // Add 6 more
      for (let i = 0; i < 6; i++) component.addColorStop();
      expect(component.colorsFormArray.length).toBe(8);

      // Can't add beyond 8
      component.addColorStop();
      expect(component.colorsFormArray.length).toBe(8);
    });
  });
});
