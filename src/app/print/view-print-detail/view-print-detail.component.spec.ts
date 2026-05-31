import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { of } from 'rxjs';
import currency from 'currency.js';

import { ViewPrintDetailComponent } from './view-print-detail.component';
import { PrintService } from 'src/app/core/services/print.service';
import { AuthService } from 'src/app/core/services/auth.service';
import { MetaTagService } from 'src/app/core/services/meta-tag.service';
import { UserSettingService } from 'src/app/core/services/user-setting.service';
import { DurationPipe } from 'src/app/shared/pipes/duration.pipe';
import { FilamentColorSwatchStylePipe } from 'src/app/shared/pipes/filament-color-swatch-style.pipe';
import { LocaleDatePipe } from 'src/app/shared/pipes/locale-date.pipe';

describe('ViewPrintDetailComponent', () => {
  let component: ViewPrintDetailComponent;
  let fixture: ComponentFixture<ViewPrintDetailComponent>;

  const mockPrint = {
    id: 1,
    title: 'Test Print',
    startDate: new Date(),
    status: 0,
    notes: '',
    images: [],
    comments: [],
    printer: { make: 'Prusa', model: 'MK3S', name: '' },
  };

  const mockUser = {
    id: 'user1',
    displayName: 'Test User',
    profilePicture: '',
  };

  beforeEach(waitForAsync(() => {
    const mockPrintService = jasmine.createSpyObj<PrintService>(
      'PrintService',
      ['addPrintComment', 'calculateElectricityCost']
    );

    mockPrintService.calculateElectricityCost.and.returnValue({
      valid: true,
      cost: currency(0.5),
      formattedCost: '$0.50',
      symbol: '$',
      wattageW: 150,
      usesDefaultWattage: false,
      printTimeHours: 2,
    });

    const mockAuthService = jasmine.createSpyObj<AuthService>(
      'AuthService',
      [],
      {
        userProfile$: of(null),
      }
    );

    const mockMetaService = jasmine.createSpyObj<MetaTagService>(
      'MetaTagService',
      ['setTitle', 'setSocialMediaTags']
    );

    const mockUserSettingService = jasmine.createSpyObj<UserSettingService>(
      'UserSettingService',
      ['getCurrentUsersSettingByType']
    );
    mockUserSettingService.getCurrentUsersSettingByType.and.returnValue(
      Promise.resolve(null)
    );

    TestBed.configureTestingModule({
      declarations: [ViewPrintDetailComponent, DurationPipe, LocaleDatePipe],
      imports: [RouterTestingModule, FilamentColorSwatchStylePipe],
      providers: [
        { provide: PrintService, useValue: mockPrintService },
        { provide: AuthService, useValue: mockAuthService },
        { provide: MetaTagService, useValue: mockMetaService },
        { provide: UserSettingService, useValue: mockUserSettingService },
        {
          provide: ActivatedRoute,
          useValue: {
            data: of({
              printers: [],
              print: { print: mockPrint, user: mockUser },
              preferredCurrencySymbolSetting: { value: '$' },
              defaultElectricityKwhRateSetting: { value: 0.12 },
              defaultElectricityWattageSetting: { value: 150 },
            }),
          },
        },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ViewPrintDetailComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('should render thumbnail strip when multiple images exist', () => {
    // Set printImages before the first detectChanges to avoid NG0100
    // (imageCount binding on app-image-carousel would change 0 → 2 after check)
    component.printImages = [
      { id: 1, isDefault: true, displayOrder: 0 },
      { id: 2, isDefault: false, displayOrder: 1 },
    ];
    component.selectedImage = component.printImages[0];
    fixture.detectChanges();
    const thumbnailStrip = fixture.nativeElement.querySelector(
      'app-image-thumbnail-strip'
    );
    expect(thumbnailStrip).toBeTruthy();
  });

  it('should update selectedImage when onImageSelected is called', () => {
    fixture.detectChanges();
    const testImage = { id: 2, isDefault: false, displayOrder: 1 };
    component.onImageSelected(testImage);
    expect(component.selectedImage).toEqual(testImage);
  });

  describe('carousel navigation', () => {
    beforeEach(() => {
      const mockPrintWithImages = {
        ...mockPrint,
        images: [
          { id: 1, isDefault: true, displayOrder: 0 },
          { id: 2, isDefault: false, displayOrder: 1 },
        ],
      };

      TestBed.inject(ActivatedRoute).data = of({
        printers: [],
        print: { print: mockPrintWithImages, user: mockUser },
        preferredCurrencySymbolSetting: { value: '$' },
        defaultElectricityKwhRateSetting: { value: 0.12 },
        defaultElectricityWattageSetting: { value: 150 },
      }) as any;

      fixture = TestBed.createComponent(ViewPrintDetailComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();
    });

    it('should initialise selectedImageIndex to the default image index', () => {
      expect(component.selectedImageIndex).toBe(0);
    });

    it('should update selectedImageIndex when onCarouselIndexChange is called', () => {
      component.onCarouselIndexChange(1);
      expect(component.selectedImageIndex).toBe(1);
      expect(component.selectedImage).toBe(component.printImages[1]);
    });

    it('should update selectedImageIndex when onImageSelected is called', () => {
      component.onImageSelected(component.printImages[1]);
      expect(component.selectedImageIndex).toBe(1);
    });
  });
});
