import type { Mock, MockedObject } from 'vitest';
import { SidebarAdComponent } from '../../shared/ad/sidebar-ad.component';
import { AdComponent } from '../../shared/ad/ad.component';
import { FileAttachmentSectionComponent } from '../../shared/file-attachment-section/file-attachment-section.component';
import { ProjectSelectorComponent } from 'src/app/shared/project-selector/project-selector.component';
import { PrinterAvatarComponent } from '../../shared/printer-avatar/printer-avatar.component';
import { ImageThumbnailStripComponent } from '../../shared/image-thumbnail-strip/image-thumbnail-strip.component';
import { PrintImageComponent } from '../../shared/print-image/print-image.component';
import { ImageCarouselComponent } from '../../shared/image-carousel/image-carousel.component';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import {
  NO_ERRORS_SCHEMA,
  Signal,
  WritableSignal,
  signal,
} from '@angular/core';
import {
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
} from '@angular/forms';
import { By, Title } from '@angular/platform-browser';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { ToastrService } from 'ngx-toastr';
import { Observable, of, Subject, throwError } from 'rxjs';
import {
  PrintDetail,
  PrintFilamentSourceMeasurement,
  PrintService,
  PrintStatus,
} from 'src/app/core/services/print.service';
import {
  UserSettingService,
  UserSettingType,
} from 'src/app/core/services/user-setting.service';
import { EditPrintDetailComponent } from './edit-print-detail.component';
import { RESIN_BOTTLE } from 'src/app/print/testing/resin-print-fixtures';
import { OTHER_FILAMENT } from 'src/app/core/services/file-parsers/core/print-detail-defaults';
import { FilamentSummary } from 'src/app/core/services/filament.service';

import { MAT_DATE_LOCALE, MatNativeDateModule } from '@angular/material/core';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatDialogModule } from '@angular/material/dialog';
import { MatInputModule } from '@angular/material/input';
import { MatSelect, MatSelectModule } from '@angular/material/select';
import { LoggingService } from 'src/app/core/services/logging.service';
import {
  PrinterSummary,
  PrinterService,
} from 'src/app/core/services/printer.service';
import { AchievementService } from 'src/app/core/services/achievement.service';
import { OnboardingService } from 'src/app/onboarding/onboarding.service';
import { GoogleAnalyticsService } from 'src/app/core/services/google-analytics.service';
import { SubscriptionService } from 'src/app/core/services/subscription.service';
import { FilamentColorSwatchStylePipe } from 'src/app/shared/pipes/filament-color-swatch-style.pipe';
import {
  PrinterCatalogService,
  PrinterModel,
} from 'src/app/core/services/printer-catalog.service';
import {
  ProjectService,
  ProjectStatus,
  ProjectViewStatus,
} from 'src/app/core/services/project.service';

describe('EditPrintDetailComponent', () => {
  let component: EditPrintDetailComponent;
  let fixture: ComponentFixture<EditPrintDetailComponent>;

  beforeEach(async () => {
    const mockPrintService = {
      addPrint: vi.fn().mockName('PrintService.addPrint').mockReturnValue(of()),
      patchPrint: vi
        .fn()
        .mockName('PrintService.patchPrint')
        .mockReturnValue(of()),
      calculatePrintCost: vi
        .fn()
        .mockName('PrintService.calculatePrintCost')
        .mockReturnValue({ valid: false, message: '' }),
      calculateElectricityCost: vi
        .fn()
        .mockName('PrintService.calculateElectricityCost')
        .mockReturnValue({ valid: false, message: '' }),
    };

    const mockToastrService = {
      success: vi.fn().mockName('ToastrService.success'),
      error: vi.fn().mockName('ToastrService.error'),
      warning: vi.fn().mockName('ToastrService.warning'),
      info: vi.fn().mockName('ToastrService.info'),
    };

    const mockTitleService = {
      setTitle: vi.fn().mockName('Title.setTitle'),
    };

    const mockUserSettingService = {
      updateUserSetting: vi
        .fn()
        .mockName('UserSettingService.updateUserSetting'),
      getCurrentUsersSettingByType: vi
        .fn()
        .mockName('UserSettingService.getCurrentUsersSettingByType'),
    };
    mockUserSettingService.getCurrentUsersSettingByType.mockReturnValue(
      Promise.resolve(null)
    );

    const mockOnboardingService = {
      status: vi
        .fn()
        .mockName('OnboardingService.status')
        .mockReturnValue(
          Promise.resolve({
            onboardingEligible: false,
            createdDate: null,
            emailVerified: true,
          })
        ),
      markWelcomeFinished: vi
        .fn()
        .mockName('OnboardingService.markWelcomeFinished')
        .mockReturnValue(Promise.resolve()),
    };

    const mockAchievementService = {
      me: vi
        .fn()
        .mockName('AchievementService.me')
        .mockReturnValue(of({ families: [] } as never)),
    };

    const mockLogger = {
      logException: vi.fn().mockName('LoggingService.logException'),
      logEvent: vi.fn().mockName('LoggingService.logEvent'),
    };

    const mockPrinterService = {
      getLoadedFilamentForPrinter: vi
        .fn()
        .mockName('PrinterService.getLoadedFilamentForPrinter')
        .mockReturnValue(of([])),
      getCurrentUserPrinterSummaries: vi
        .fn()
        .mockName('PrinterService.getCurrentUserPrinterSummaries')
        .mockReturnValue(of({ paging: {}, items: [] } as never)),
    };

    const mockTrackingService = {
      emitConversion: vi.fn().mockName('GoogleAnalyticsService.emitConversion'),
      eventEmitter: vi.fn().mockName('GoogleAnalyticsService.eventEmitter'),
    };

    const mockSubscriptionService = {
      isPro: signal(true) as Signal<boolean>,
      maxImagesPerPrint: signal(20) as Signal<number>,
      maxFilesPerPrint: signal(5) as Signal<number>,
      maxFileStorageBytes: signal(53687091200) as Signal<number>,
      usedFileStorageBytes: signal(0) as Signal<number>,
    };

    const mockCatalog = {
      match: vi
        .fn()
        .mockName('PrinterCatalogService.match')
        .mockReturnValue(of(null)),
      get: vi
        .fn()
        .mockName('PrinterCatalogService.get')
        .mockReturnValue(of(null)),
    };

    const mockProjectService = {
      createProject: vi.fn().mockName('ProjectService.createProject'),
    };

    await TestBed.configureTestingModule({
      imports: [
        RouterTestingModule,
        FormsModule,
        ReactiveFormsModule,
        MatInputModule,
        MatSelectModule,
        MatDatepickerModule,
        MatNativeDateModule,
        MatCheckboxModule,
        MatDialogModule,
        FilamentColorSwatchStylePipe,
        EditPrintDetailComponent,
      ],
      providers: [
        { provide: PrintService, useValue: mockPrintService },
        { provide: GoogleAnalyticsService, useValue: mockTrackingService },
        { provide: PrinterService, useValue: mockPrinterService },
        { provide: ToastrService, useValue: mockToastrService },
        { provide: Title, useValue: mockTitleService },
        { provide: UserSettingService, useValue: mockUserSettingService },
        { provide: OnboardingService, useValue: mockOnboardingService },
        { provide: AchievementService, useValue: mockAchievementService },
        { provide: LoggingService, useValue: mockLogger },
        { provide: SubscriptionService, useValue: mockSubscriptionService },
        { provide: ProjectService, useValue: mockProjectService },
        { provide: PrinterCatalogService, useValue: mockCatalog },
        { provide: MAT_DATE_LOCALE, useValue: 'en-US' },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { queryParamMap: convertToParamMap({}) },
            data: of({
              printers: [],
              lastSelectedPrinterSetting: null,
              defaultPrintViewStatusSetting: null,
              defaultFilamentPriceSetting: null,
              defaultElectricityKwhRateSetting: null,
              defaultElectricityWattageSetting: null,
              lastAllowCommentsSetting: null,
              lastMaterialMeasureSettings: {},
              preferredCurrencyNameSetting: null,
              print: { print: { printerId: 1, notes: '' } },
              currencies: {
                USD: {
                  name: 'United States Dollar',
                  demonym: 'US',
                  majorSingle: 'Dollar',
                  majorPlural: 'Dollars',
                  ISOnum: 840,
                  symbol: '$',
                  symbolNative: '$',
                  minorSingle: 'Cent',
                  minorPlural: 'Cents',
                  ISOdigits: 2,
                  decimals: 2,
                  numToBasic: 100,
                },
              },
            }),
          },
        },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    })
      .overrideComponent(EditPrintDetailComponent, {
        remove: {
          imports: [
            ImageCarouselComponent,
            PrintImageComponent,
            ImageThumbnailStripComponent,
            PrinterAvatarComponent,
            ProjectSelectorComponent,
            FileAttachmentSectionComponent,
            AdComponent,
            SidebarAdComponent,
          ],
        },
        add: { schemas: [NO_ERRORS_SCHEMA] },
      })
      .compileComponents();
  });

  beforeEach(async () => {
    fixture = TestBed.createComponent(EditPrintDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  }, 10000);

  // printlog-bridge#97: a resin row is edited in mL; no "≈ g" hint converted through density.
  describe('preferred-unit hint for a volume-sourced row', () => {
    const resinGroup = () =>
      new FormGroup({
        source: new FormControl(PrintFilamentSourceMeasurement.Volume),
        estimatedSource: new FormControl(PrintFilamentSourceMeasurement.Volume),
        volumeMl: new FormControl(42.5),
        estimatedVolumeMl: new FormControl(40),
        filament: new FormControl(RESIN_BOTTLE),
      }) as never;

    it('shows no converted weight or length', () => {
      for (const unit of [
        PrintFilamentSourceMeasurement.Weight,
        PrintFilamentSourceMeasurement.Length,
      ]) {
        component.preferredFilamentUnit.set(unit);
        expect(
          component.getPreferredUnitSecondaryDisplay(resinGroup(), false)
        ).toBeNull();
        expect(
          component.getPreferredUnitSecondaryDisplay(resinGroup(), true)
        ).toBeNull();
      }
    });

    it('still shows a filament row converted to mL', () => {
      component.preferredFilamentUnit.set(
        PrintFilamentSourceMeasurement.Volume
      );
      const group = new FormGroup({
        source: new FormControl(PrintFilamentSourceMeasurement.Weight),
        amountG: new FormControl(12.4),
        filament: new FormControl({
          materialDensityGramPerCubicCm: 1.24,
          diameterMm: 1.75,
        }),
      }) as never;
      expect(component.getPreferredUnitSecondaryDisplay(group, false)).toBe(
        '≈ 10.0mL'
      );
    });
  });

  it('should use maxImagesPerPrint from subscription service', () => {
    expect(component.maxImages()).toBe(20);
  });

  describe('Image Management', () => {
    it('should enforce image limit from subscription in detectFiles', () => {
      // Add 20 mock images to the form (matches mock maxImagesPerPrint signal value)
      for (let i = 0; i < 20; i++) {
        const mockImage = component['createItem']({
          id: i + 1,
          url: `data:image/png;base64,test${i}`,
          isDefault: i === 0,
          displayOrder: i,
        });
        component.images.push(mockImage);
      }

      expect(component.images.length).toBe(20);

      // Try to add more - should be blocked
      const mockEvent = {
        target: {
          files: [new File([''], 'test.png', { type: 'image/png' })],
        },
      } as unknown as Event;

      component.detectFiles(mockEvent);

      // Should still be 20 (limit enforced)
      expect(component.images.length).toBe(20);
    });

    it('should update displayOrder when onImagesReordered is called', () => {
      // Add mock images
      const image1 = component['createItem']({
        id: 1,
        url: 'url1',
        isDefault: true,
        displayOrder: 0,
      });
      const image2 = component['createItem']({
        id: 2,
        url: 'url2',
        isDefault: false,
        displayOrder: 1,
      });
      component.images.push(image1);
      component.images.push(image2);

      // Verify setup
      expect(component.images.length).toBe(2);
      expect(image1.value.id).toBe(1);
      expect(image2.value.id).toBe(2);

      // Reorder - swap the order (move image1 from index 0 to index 1)
      component.onImagesReordered({
        previousIndex: 0,
        currentIndex: 1,
      });

      // After reorder, array should have 2 elements and be reordered
      expect(component.images.length).toBe(2);
      // The first control should now have id=2 (image2)
      expect(component.images.at(0)?.value.id).toBe(2);
      expect(component.images.at(1)?.value.id).toBe(1);
      // DisplayOrder should be updated
      expect(component.images.at(0)?.value.displayOrder).toBe(0);
      expect(component.images.at(1)?.value.displayOrder).toBe(1);
    });

    it('should promote next image when default is deleted', () => {
      // Add mock images
      const image1 = component['createItem']({
        id: 1,
        url: 'url1',
        isDefault: true,
        displayOrder: 0,
      });
      const image2 = component['createItem']({
        id: 2,
        url: 'url2',
        isDefault: false,
        displayOrder: 1,
      });
      component.images.push(image1);
      component.images.push(image2);
      component.selectedImage = image1;

      // Delete the default image
      component.onImageDeleted({
        id: 1,
        url: 'url1',
        isDefault: true,
        displayOrder: 0,
      });

      // Image 2 should now be default
      expect(component.images.length).toBe(1);
      expect(component.images.at(0).value.isDefault).toBe(true);
      expect(component.selectedImage).toBe(component.images.at(0));
    });

    it('should set the correct image as default when two images share the same displayOrder', () => {
      // Two images with the same displayOrder (simulates race condition in upload)
      const image1 = component['createItem']({
        id: 10,
        url: 'url-a',
        isDefault: true,
        displayOrder: 0,
      });
      const image2 = component['createItem']({
        id: 11,
        url: 'url-b',
        isDefault: false,
        displayOrder: 0, // same displayOrder as image1 - collision
      });
      component.images.push(image1);
      component.images.push(image2);

      // Set image2 as default - must find it by id, not displayOrder
      component.onDefaultChanged({
        id: 11,
        url: 'url-b',
        isDefault: false,
        displayOrder: 0,
      });

      expect(component.images.at(0).value.isDefault).toBe(false); // image1 cleared
      expect(component.images.at(1).value.isDefault).toBe(true); // image2 set
    });

    it('should use the base64 data URL for a slicer snapshot image that has no ID', () => {
      const snapshotUrl = 'data:image/png;base64,abc123snapshot';

      const printWithSnapshot: PrintDetail = {
        id: null,
        title: 'Test Print',
        printerId: null,
        startDate: new Date(),
        estimatedPrintTimeInSeconds: null,
        printTimeInSeconds: null,
        filamentUsageMg: null,
        filamentType: '',
        notes: '',
        url: '',
        fileName: '',
        status: PrintStatus.Pending,
        viewStatus: null,
        images: [
          { id: null, isDefault: true, displayOrder: 0, url: snapshotUrl },
        ],
        allowComments: null,
        createdByUserId: null,
        comments: [],
        filamentUsage: [],
      };

      const form = component.buildFormFromPrintDetail(printWithSnapshot);
      const imagesArray = form.get('images') as any;

      expect(imagesArray.length).toBe(1);
      expect(imagesArray.at(0).value.url).toBe(snapshotUrl);
      expect(imagesArray.at(0).value.url).not.toContain('null');
      expect(form.get('estimatedFilamentUsageG')?.value).toBeNull();
    });

    it('should set isDragOver on drag events', () => {
      const mockDragEvent = {
        preventDefault: () => {},
        stopPropagation: () => {},
      } as DragEvent;

      component.onDragOver(mockDragEvent);
      expect(component.isDragOver).toBe(true);

      component.onDragLeave(mockDragEvent);
      expect(component.isDragOver).toBe(false);
    });

    it('should not set isDragOver when at subscription image limit', () => {
      // Fill to the subscription limit (mock maxImagesPerPrint = 20)
      for (let i = 0; i < 20; i++) {
        component.images.push(
          component['createItem']({
            id: i + 1,
            url: `url${i}`,
            isDefault: i === 0,
            displayOrder: i,
          })
        );
      }

      const mockDragEvent = {
        preventDefault: () => {},
        stopPropagation: () => {},
      } as DragEvent;

      component.onDragOver(mockDragEvent);
      expect(component.isDragOver).toBe(false);
    });

    it('should keep isDragOver true when onDragLeave fires with relatedTarget inside the drop zone', () => {
      const dropZone = document.createElement('div');
      const child = document.createElement('span');
      dropZone.appendChild(child);

      const mockDragEvent = {
        preventDefault: () => {},
        stopPropagation: () => {},
        currentTarget: dropZone,
        relatedTarget: child,
      } as unknown as DragEvent;

      component.isDragOver = true;
      component.onDragLeave(mockDragEvent);
      expect(component.isDragOver).toBe(true);
    });

    it('should clear isDragOver when onDragLeave fires with relatedTarget outside the drop zone', () => {
      const dropZone = document.createElement('div');
      const outside = document.createElement('span');

      const mockDragEvent = {
        preventDefault: () => {},
        stopPropagation: () => {},
        currentTarget: dropZone,
        relatedTarget: outside,
      } as unknown as DragEvent;

      component.isDragOver = true;
      component.onDragLeave(mockDragEvent);
      expect(component.isDragOver).toBe(false);
    });

    it('should update selectedImageIndex when onImagesReordered moves the selected image', () => {
      const image1 = component['createItem']({
        id: 1,
        url: 'url1',
        isDefault: true,
        displayOrder: 0,
      });
      const image2 = component['createItem']({
        id: 2,
        url: 'url2',
        isDefault: false,
        displayOrder: 1,
      });
      component.images.push(image1);
      component.images.push(image2);
      component['updateCachedImagesForStrip']();

      // Select image1 at index 0
      component.selectedImage = image1;
      component.selectedImageIndex = 0;

      // Move image1 from index 0 to index 1
      component.onImagesReordered({ previousIndex: 0, currentIndex: 1 });

      // image1 is now at index 1 in the strip
      expect(component.selectedImageIndex).toBe(1);
    });

    it('should update selectedImageIndex when a non-selected image deleted before selected image shifts its index', () => {
      const image1 = component['createItem']({
        id: 1,
        url: 'url1',
        isDefault: true,
        displayOrder: 0,
      });
      const image2 = component['createItem']({
        id: 2,
        url: 'url2',
        isDefault: false,
        displayOrder: 1,
      });
      const image3 = component['createItem']({
        id: 3,
        url: 'url3',
        isDefault: false,
        displayOrder: 2,
      });
      component.images.push(image1);
      component.images.push(image2);
      component.images.push(image3);
      component['updateCachedImagesForStrip']();

      // Select image3 at index 2
      component.selectedImage = image3;
      component.selectedImageIndex = 2;

      // Delete image2 (before image3 in the strip)
      component.onImageDeleted({
        id: 2,
        url: 'url2',
        isDefault: false,
        displayOrder: 1,
      });

      // image3 is now at index 1 after image2 is removed
      expect(component.selectedImageIndex).toBe(1);
    });

    describe('Toast branching on image limit', () => {
      let toastrService: MockedObject<ToastrService>;
      let isProSignal: WritableSignal<boolean>;
      let maxImagesSignal: WritableSignal<number>;

      beforeEach(() => {
        toastrService = TestBed.inject(
          ToastrService
        ) as MockedObject<ToastrService>;
        const subscriptionService = TestBed.inject(SubscriptionService);
        isProSignal =
          subscriptionService.isPro as unknown as WritableSignal<boolean>;
        maxImagesSignal =
          subscriptionService.maxImagesPerPrint as unknown as WritableSignal<number>;
      });

      afterEach(() => {
        // Restore defaults for other tests
        isProSignal.set(true);
        maxImagesSignal.set(20);
      });

      it('should call toastr.warning (not info) when a Pro user hits the image limit in detectFiles', () => {
        isProSignal.set(true);

        // Fill to the Pro limit (20 images)
        for (let i = 0; i < 20; i++) {
          component.images.push(
            component['createItem']({
              id: i + 1,
              url: `url${i}`,
              isDefault: i === 0,
              displayOrder: i,
            })
          );
        }

        const mockEvent = {
          target: {
            files: [new File([''], 'test.png', { type: 'image/png' })],
            value: '',
          },
        } as unknown as Event;

        component.detectFiles(mockEvent);

        expect(toastrService.warning).toHaveBeenCalledTimes(1);

        expect(toastrService.warning).toHaveBeenCalledWith(
          'Maximum 20 images allowed',
          'Limit Reached'
        );
        expect(toastrService.info).not.toHaveBeenCalled();
      });

      it('should call toastr.info (not warning) when a free user hits the image limit in detectFiles', () => {
        isProSignal.set(false);
        maxImagesSignal.set(5);

        // Fill to the free limit (5 images)
        for (let i = 0; i < 5; i++) {
          component.images.push(
            component['createItem']({
              id: i + 1,
              url: `url${i}`,
              isDefault: i === 0,
              displayOrder: i,
            })
          );
        }

        const mockEvent = {
          target: {
            files: [new File([''], 'test.png', { type: 'image/png' })],
            value: '',
          },
        } as unknown as Event;

        component.detectFiles(mockEvent);

        expect(toastrService.info).toHaveBeenCalledTimes(1);

        expect(toastrService.info).toHaveBeenCalledWith(
          'Free accounts allow 5 images per print. Upgrade to Pro for more.',
          'Image Limit Reached'
        );
        expect(toastrService.warning).not.toHaveBeenCalled();
      });
    });
  });

  describe('parseAsSeconds', () => {
    it('reads a typed duration as whole seconds', () => {
      expect(component.parseAsSeconds('1h 30m')).toBe(5400);
    });

    // A typo used to be saved as a print time of 0 seconds.
    it('treats text that is not a duration as no value', () => {
      expect(component.parseAsSeconds('soon')).toBeNull();
    });
  });

  describe('Completion date/time calculation', () => {
    // Start: Feb 18 2026 22:41:46 with 963ms sub-second noise from the API
    const START_DATE_WITH_MS = new Date(2026, 1, 18, 22, 41, 46, 963);
    const START_TIME_STR = '22:41:46';
    // Completion: Feb 19 2026 14:30:00 → 15h 48m 14s after start (when ms is stripped)
    const COMPLETION_DATE = new Date(2026, 1, 19); // midnight local
    const COMPLETION_TIME_STR = '14:30:00';
    const EXPECTED_PRINT_TIME = '15h 48m 14s ';

    beforeEach(() => {
      component.printForm.get('startDate').setValue(START_DATE_WITH_MS);
      component.printForm.get('startTime').setValue(START_TIME_STR);
    });

    describe('getCombinedStartDateTime', () => {
      it('should strip sub-second precision so diff calculations are not off by a second', () => {
        const result = component.getCombinedStartDateTime();
        expect(result.getMilliseconds()).toBe(0);
      });

      it('should combine the startDate and startTime fields correctly', () => {
        const result = component.getCombinedStartDateTime();
        expect(result.getHours()).toBe(22);
        expect(result.getMinutes()).toBe(41);
        expect(result.getSeconds()).toBe(46);
      });
    });

    describe('updateActualCompletedTimeOnly — time entered before date', () => {
      it('should store the time even when no completion date is set yet', () => {
        component.updateActualCompletedTimeOnly(COMPLETION_TIME_STR);

        expect(component['rawCompletionTime']).toBe(COMPLETION_TIME_STR);
        expect(component.actualCompletedDate).toBeNull();
        expect(
          component.printForm.controls.printTimeInSeconds.value
        ).toBeFalsy();
      });

      it('should apply the previously stored time when a date is subsequently entered', () => {
        component.updateActualCompletedTimeOnly(COMPLETION_TIME_STR);
        component.updateActualCompletedDateOnly(COMPLETION_DATE);

        expect(component.getActualCompletedTimeOnly()).toBe(
          COMPLETION_TIME_STR
        );
        expect(component.actualCompletedDate).not.toBeNull();
      });

      it('should calculate the correct printTimeInSeconds when time is entered before date', () => {
        component.updateActualCompletedTimeOnly(COMPLETION_TIME_STR);
        component.updateActualCompletedDateOnly(COMPLETION_DATE);

        expect(component.printForm.controls.printTimeInSeconds.value).toBe(
          EXPECTED_PRINT_TIME
        );
      });
    });

    describe('updateActualCompletedDateOnly then updateActualCompletedTimeOnly — normal order', () => {
      it('should calculate the correct printTimeInSeconds when date is entered before time', () => {
        component.updateActualCompletedDateOnly(COMPLETION_DATE);
        component.updateActualCompletedTimeOnly(COMPLETION_TIME_STR);

        expect(component.printForm.controls.printTimeInSeconds.value).toBe(
          EXPECTED_PRINT_TIME
        );
      });

      it('should show the user-entered date in getActualCompletedDateOnly, not the computed date', () => {
        // Pre-fix: actualCompletedDate drifted to Feb 18 due to ms truncation;
        // the date picker then showed Feb 18 instead of Feb 19.
        component.updateActualCompletedDateOnly(COMPLETION_DATE);

        const pickerDate = component.getActualCompletedDateOnly();
        expect(pickerDate).not.toBeNull();
        expect(pickerDate.getMonth()).toBe(1); // February (0-indexed)
        expect(pickerDate.getDate()).toBe(19); // Must be 19, not 18
      });

      it('should show the user-entered time in getActualCompletedTimeOnly', () => {
        component.updateActualCompletedDateOnly(COMPLETION_DATE);
        component.updateActualCompletedTimeOnly(COMPLETION_TIME_STR);

        expect(component.getActualCompletedTimeOnly()).toBe(
          COMPLETION_TIME_STR
        );
      });
    });

    describe('getActualCompletedDate — seeding from existing printTimeInSeconds on load', () => {
      it('should seed rawCompletionDate and rawCompletionTime when a print with existing printTimeInSeconds is loaded', () => {
        component.printForm.controls.printTimeInSeconds.setValue('1h 30m 0s');
        component.getActualCompletedDate();

        expect(component['rawCompletionDate']).not.toBeNull();
        expect(component['rawCompletionTime']).not.toBeNull();
        expect(component.actualCompletedDate).not.toBeNull();
      });

      it('should not overwrite rawCompletionDate once the user has set it via the date picker', () => {
        // Seed from load
        component.printForm.controls.printTimeInSeconds.setValue('1h 0m 0s');
        component.getActualCompletedDate();
        const seededDate = component['rawCompletionDate'];

        // User then picks a new date
        const userPickedDate = new Date(2026, 1, 20);
        component.updateActualCompletedDateOnly(userPickedDate);

        expect(component['rawCompletionDate']).not.toEqual(seededDate);
        expect(component['rawCompletionDate'].getDate()).toBe(20);
      });
    });

    describe('setActualCompletedDateToNow', () => {
      it('should populate rawCompletionDate and rawCompletionTime with the current datetime', () => {
        const before = new Date();
        component.setActualCompletedDateToNow();
        const after = new Date();

        const rawDate = component['rawCompletionDate'];
        const rawTime = component['rawCompletionTime'];

        expect(rawDate).not.toBeNull();
        expect(rawDate.getTime()).toBeGreaterThanOrEqual(before.getTime());
        expect(rawDate.getTime()).toBeLessThanOrEqual(after.getTime());
        expect(rawTime).toMatch(/^\d{2}:\d{2}:\d{2}$/);
      });
    });
  });

  describe('Save handling', () => {
    it("keeps each usage row's slot through the form", () => {
      component.printForm = component.buildFormFromPrintDetail({
        ...component.printDetail!,
        filamentUsage: [
          {
            id: 'a3f1c2d4-0000-4000-8000-000000000001',
            filament: null,
            slot: 2,
            lengthInM: 1.5,
            source: PrintFilamentSourceMeasurement.Length,
            estimatedSource: PrintFilamentSourceMeasurement.Length,
          },
        ],
      });

      expect(component.getPrintFromForm().filamentUsage[0].slot).toBe(2);
    });

    it('carries the resolved print curaSettingId into the saved print', () => {
      component.printDetail = {
        ...component.printDetail!,
        curaSettingId: 'setting-1',
      };

      expect(component.getPrintFromForm().curaSettingId).toBe('setting-1');
    });

    it('should reset saving to false after handleSaveSuccess', () => {
      const router = TestBed.inject(Router);
      vi.spyOn(router, 'navigate').mockReturnValue(Promise.resolve(true));

      component.saving.set(true);
      component['handleSaveSuccess']({ id: 1 } as any);

      expect(component.saving()).toBe(false);
    });
  });

  describe('once a response arrives', () => {
    it('re-enables Submit when the save fails', () => {
      const submit = () =>
        (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>(
          '#edit-print-submit-btn'
        )!;
      component.saving.set(true);
      fixture.detectChanges();
      expect(submit().disabled, 'saving').toBe(true);

      const logger = TestBed.inject(LoggingService) as unknown as Record<
        string,
        unknown
      >;
      logger['logTrace'] = vi.fn();
      component['handleSaveError'](new Error('500'), { id: null } as never);
      fixture.detectChanges();

      expect(submit().disabled).toBe(false);
    });

    it('tells the user when the save fails, not just stops the spinner', () => {
      const toastr = TestBed.inject(
        ToastrService
      ) as MockedObject<ToastrService>;
      const logger = TestBed.inject(LoggingService) as unknown as Record<
        string,
        unknown
      >;
      logger['logTrace'] = vi.fn();

      component['handleSaveError'](new Error('400'), { id: null } as never);

      expect(toastr.error).toHaveBeenCalledWith(
        "Your print wasn't saved. Check the form and try again.",
        'Save failed'
      );
    });

    it('lists the material loaded in a newly chosen printer', () => {
      const loaded = new Subject<unknown>();
      (
        TestBed.inject(PrinterService) as MockedObject<PrinterService>
      ).getLoadedFilamentForPrinter.mockReturnValue(loaded as never);
      // Choosing a printer also remembers it as the last one used.
      const settings = TestBed.inject(UserSettingService) as unknown as Record<
        string,
        unknown
      >;
      settings['addUserSetting'] = vi.fn().mockReturnValue(of({}));
      settings['updateUserSetting'] = vi.fn().mockReturnValue(of({}));
      component.printForm.get('id')!.setValue(null);
      component.printForm.get('printerId')!.setValue(2);
      fixture.detectChanges();

      loaded.next([
        {
          id: 'pf-1',
          filament: {
            id: 'spool-1',
            displayName: 'Prusament Galaxy Black',
            materialType: 'PLA',
          },
        },
      ]);
      fixture.detectChanges();

      expect((fixture.nativeElement as HTMLElement).textContent).toContain(
        'Prusament Galaxy Black'
      );
    });

    describe('remaining amounts of a loaded spool', () => {
      const showLoaded = (remaining: Record<string, number | null>) => {
        const loaded = new Subject<unknown>();
        (
          TestBed.inject(PrinterService) as MockedObject<PrinterService>
        ).getLoadedFilamentForPrinter.mockReturnValue(loaded as never);
        const settings = TestBed.inject(
          UserSettingService
        ) as unknown as Record<string, unknown>;
        settings['addUserSetting'] = vi.fn().mockReturnValue(of({}));
        settings['updateUserSetting'] = vi.fn().mockReturnValue(of({}));
        component.printForm.get('id')!.setValue(null);
        component.printForm.get('printerId')!.setValue(2);
        fixture.detectChanges();

        loaded.next([
          {
            id: 'pf-1',
            filament: {
              id: 'spool-1',
              displayName: 'Prusament Galaxy Black',
              colorName: '',
              materialType: 'PLA',
              ...remaining,
            },
          },
        ]);
        fixture.detectChanges();
        return (fixture.nativeElement as HTMLElement).textContent!;
      };

      it('says Not tracked once, not 0, for a spool with no starting weight', () => {
        const text = showLoaded({
          filamentRemaining: null,
          filamentLengthRemainingInM: null,
          filamentVolumeRemainingInMl: null,
        });

        expect(text.match(/Not tracked/g)?.length).toBe(1);
        expect(text).not.toContain('(g) remaining');
        expect(text).not.toContain('(m) remaining');
        expect(text).not.toContain('(mL) remaining');
      });

      it('shows grams, meters and milliliters for a tracked spool', () => {
        const text = showLoaded({
          filamentRemaining: 250000,
          filamentLengthRemainingInM: 84,
          filamentVolumeRemainingInMl: 201,
        });

        expect(text).toContain('250 (g) remaining');
        expect(text).toContain('84 (m) remaining');
        expect(text).toContain('201 (mL) remaining');
        expect(text).not.toContain('Not tracked');
      });
    });
  });

  // #263: an existing print saves with PATCH, sending only what the user changed, so a form opened
  // before a connector completed the print cannot revert the connector's status, duration and usage.
  describe('Saving an existing print', () => {
    let printService: MockedObject<PrintService>;
    let projectService: MockedObject<ProjectService>;
    let editor: ComponentFixture<EditPrintDetailComponent> | undefined;

    const usageRow = {
      id: 'a3f1c2d4-0000-4000-8000-000000000001',
      filament: null,
      slot: null,
      estimatedAmountMg: 20000,
      estimatedLengthInM: null,
      estimatedVolumeMl: null,
      estimatedSource: PrintFilamentSourceMeasurement.Weight,
      amountMg: null,
      lengthInM: null,
      volumeMl: null,
      source: PrintFilamentSourceMeasurement.Weight,
      notes: '',
    };

    // As the API returns it: a string start date with sub-second precision, a duration the
    // form reformats, and a usage row holding only an estimate.
    const existingPrint = {
      id: 5,
      title: 'Benchy',
      printerId: 1,
      startDate: '2026-10-10T12:00:00.734+00:00',
      estimatedPrintTimeInSeconds: 3725,
      printTimeInSeconds: null,
      estimatedFilamentUsageMg: null,
      filamentUsageMg: null,
      filamentType: null,
      filamentUsage: [usageRow],
      notes: 'first layer was fine',
      url: null,
      fileName: 'benchy.gcode',
      status: PrintStatus.Printing,
      viewStatus: 3,
      allowComments: true,
      allowFileDownloads: false,
      createdByUserId: 7,
      images: [],
      comments: [],
      externalSource: 'moonraker',
      externalId: 'voron-1:000042',
    } as unknown as PrintDetail;

    function openEditor(print: PrintDetail): EditPrintDetailComponent {
      const route = TestBed.inject(ActivatedRoute);
      let resolved: Record<string, unknown>;
      route.data.subscribe(
        (data) => (resolved = data as Record<string, unknown>)
      );
      (
        route as {
          data: Observable<unknown>;
        }
      ).data = of({
        ...resolved!,
        print: { print },
      });

      editor = TestBed.createComponent(EditPrintDetailComponent);
      editor.detectChanges();
      return editor.componentInstance;
    }

    beforeEach(() => {
      printService = TestBed.inject(PrintService) as MockedObject<PrintService>;
      printService.patchPrint.mockReturnValue(of({ id: 5 } as PrintDetail));
      projectService = TestBed.inject(
        ProjectService
      ) as MockedObject<ProjectService>;
      vi.spyOn(TestBed.inject(Router), 'navigate').mockReturnValue(
        Promise.resolve(true)
      );
    });

    afterEach(() => editor?.destroy());

    it('sends only the notes when only the notes were edited', () => {
      const form = openEditor(existingPrint);

      form.printForm.controls.notes.setValue('added a note');
      form.onSubmit();

      expect(printService.patchPrint).toHaveBeenCalledTimes(1);

      expect(printService.patchPrint).toHaveBeenCalledWith(5, {
        notes: 'added a note',
      });
      expect(printService.addPrint).not.toHaveBeenCalled();
    });

    it('sends nothing when nothing changed', () => {
      const form = openEditor(existingPrint);

      form.onSubmit();

      expect(printService.patchPrint).not.toHaveBeenCalled();
      expect(form.saving()).toBe(false);
    });

    it('clears a field the user emptied', () => {
      const form = openEditor(existingPrint);

      form.printForm.controls.notes.setValue('');
      form.onSubmit();

      expect(printService.patchPrint).toHaveBeenCalledTimes(1);

      expect(printService.patchPrint).toHaveBeenCalledWith(5, {
        clear: ['notes'],
      });
    });

    it('replaces the usage rows when a row was edited', () => {
      const form = openEditor(existingPrint);

      form.filamentUsage.at(0).get('amountG')!.setValue(21.5);
      form.onSubmit();

      const [, patch] = vi.mocked(printService.patchPrint).mock.lastCall;
      expect(Object.keys(patch)).toEqual(['filamentUsage']);
      expect(patch.filamentUsage![0].id).toBe(usageRow.id);
      expect(patch.filamentUsage![0].amountMg).toBe(21500);
      expect(patch.filamentUsage![0].estimatedAmountMg).toBe(20000);
    });

    // api#282: PATCH resets actualIsEstimate on every row unless the client sends it back.
    describe('a row a bridge logged as an estimate', () => {
      const bridgePrint = {
        ...existingPrint,
        filamentUsage: [
          { ...usageRow, amountMg: 18000, slot: 1, actualIsEstimate: true },
          {
            ...usageRow,
            id: 'a3f1c2d4-0000-4000-8000-000000000002',
            amountMg: 4000,
            slot: 2,
            actualIsEstimate: true,
          },
        ],
      } as unknown as PrintDetail;

      it('keeps the flag on the rows the user did not change', () => {
        const form = openEditor(bridgePrint);

        form.filamentUsage.at(1).get('notes')!.setValue('tray B1');
        form.onSubmit();

        const [, patch] = vi.mocked(printService.patchPrint).mock.lastCall;
        expect(patch.filamentUsage!.map((r) => r.actualIsEstimate)).toEqual([
          true,
          true,
        ]);
      });

      it('sends the row whose actual amount the user typed as measured', () => {
        const form = openEditor(bridgePrint);

        form.filamentUsage.at(0).get('amountG')!.setValue(17.25);
        form.onSubmit();

        const [, patch] = vi.mocked(printService.patchPrint).mock.lastCall;
        expect(patch.filamentUsage!.map((r) => r.actualIsEstimate)).toEqual([
          false,
          true,
        ]);
      });

      it('says the actual amount is an estimate', () => {
        openEditor(bridgePrint);

        const hints = (editor!.nativeElement as HTMLElement).querySelectorAll(
          '[data-testid="usage-estimate-hint"]'
        );
        expect(hints.length).toBe(2);
        expect(hints[0].textContent).toContain('estimate');
      });
    });

    // A print from before usage rows: the form shows its legacy fields as one row. Sending
    // filamentUsage (the rows, or [] once the row is deleted) is what makes the API clear the
    // legacy fields, so the view does not show both and a deleted row does not come back.
    describe('a legacy print', () => {
      const legacyPrint = {
        ...existingPrint,
        filamentUsage: [],
        filamentType: 'PLA',
        filamentUsageMg: 15000,
        estimatedFilamentUsageMg: 14000,
      } as unknown as PrintDetail;

      it('sends the converted row when it was edited', () => {
        const form = openEditor(legacyPrint);
        expect(form.filamentUsage.length).toBe(1);

        form.filamentUsage.at(0).get('amountG')!.setValue(16);
        form.onSubmit();

        const [id, patch] = vi.mocked(printService.patchPrint).mock.lastCall;
        expect(id).toBe(5);
        expect(Object.keys(patch)).toEqual(['filamentUsage']);
        expect(patch.filamentUsage!.length).toBe(1);
        expect(patch.filamentUsage![0].amountMg).toBe(16000);
        expect(patch.filamentUsage![0].estimatedAmountMg).toBe(14000);
      });

      it('sends an empty filamentUsage when the row was deleted', () => {
        const form = openEditor(legacyPrint);
        // The row holds usage, so removing it asks first; confirm.
        vi.spyOn(form.dialog, 'open').mockReturnValue({
          componentInstance: {},
          afterClosed: () => of(true),
        } as never);

        form.removeFilament(0);
        form.onSubmit();

        expect(form.filamentUsage.length).toBe(0);
        expect(printService.patchPrint).toHaveBeenCalledTimes(1);
        expect(printService.patchPrint).toHaveBeenCalledWith(5, {
          filamentUsage: [],
        });
      });

      it('shows the converted "Other" row as no spool: no remaining, no link', () => {
        openEditor(legacyPrint);
        editor!.detectChanges();
        const host = editor!.nativeElement as HTMLElement;

        expect(host.querySelector('.filament-name')!.textContent).toContain(
          'Other'
        );
        expect(host.textContent).not.toContain('Not tracked');
        expect(host.textContent).not.toContain('(g) remaining');
        expect(host.querySelector('a.filament-link')).toBeNull();
      });

      it('leaves the legacy usage alone when only another field changed', () => {
        const form = openEditor(legacyPrint);

        form.printForm.controls.notes.setValue('added a note');
        form.onSubmit();

        expect(printService.patchPrint).toHaveBeenCalledTimes(1);

        expect(printService.patchPrint).toHaveBeenCalledWith(5, {
          notes: 'added a note',
        });
      });
    });

    it('saves the start date the form showed when the print had none', () => {
      const form = openEditor({ ...existingPrint, startDate: null });

      form.onSubmit();

      const [, patch] = vi.mocked(printService.patchPrint).mock.lastCall;
      expect(Object.keys(patch)).toEqual(['startDate']);
      expect(patch.startDate).toEqual(form.getCombinedStartDateTime());
    });

    it('creates a new project first, then assigns it', () => {
      projectService.createProject.mockReturnValue(
        of({ id: 'project-9', name: 'Boats' } as never)
      );
      const form = openEditor(existingPrint);

      form.onProjectSelected({ type: 'new', newProjectName: 'Boats' });
      form.onSubmit();

      expect(projectService.createProject).toHaveBeenCalledTimes(1);

      expect(projectService.createProject).toHaveBeenCalledWith({
        name: 'Boats',
        status: ProjectStatus.InProgress,
        viewStatus: ProjectViewStatus.Private,
        startDateOverride: null,
        finishDateOverride: null,
      });
      expect(printService.patchPrint).toHaveBeenCalledTimes(1);
      expect(printService.patchPrint).toHaveBeenCalledWith(5, {
        projectId: 'project-9',
      });
    });
  });

  it('creates a new print with POST', () => {
    const printService = TestBed.inject(
      PrintService
    ) as MockedObject<PrintService>;

    component.printForm.controls.title.setValue('New print');
    component.filamentUsage.clear();
    component.onSubmit();

    expect(printService.addPrint).toHaveBeenCalledTimes(1);
    expect(printService.patchPrint).not.toHaveBeenCalled();
  });

  // The printers have to be in the route data BEFORE the first change detection: creating
  // the @for views afterwards makes dev mode's check-no-changes pass compare freshly
  // created bindings against their initial undefined and report NG0100.
  it('shows a printer avatar in each option of the printer picker', async () => {
    vi.useFakeTimers();
    const route = TestBed.inject(ActivatedRoute);
    let resolved: Record<string, unknown>;
    route.data.subscribe(
      (data) => (resolved = data as Record<string, unknown>)
    );
    (
      route as {
        data: Observable<unknown>;
      }
    ).data = of({
      ...resolved!,
      printers: [
        {
          id: 1,
          name: 'Voron 2.4',
          make: 'Formbot',
          model: 'Voron 2.4 350',
          isActive: true,
        },
      ] as PrinterSummary[],
    });

    const picker = TestBed.createComponent(EditPrintDetailComponent);
    picker.detectChanges();

    (
      picker.debugElement.query(
        By.css('#edit-print-printer .mat-mdc-select-trigger')
      ).nativeElement as HTMLElement
    ).click();
    picker.detectChanges();
    await vi.runAllTimersAsync();

    expect(
      document.querySelector('mat-option app-printer-avatar')
    ).toBeTruthy();

    picker.destroy();
  });

  describe('onboarding', () => {
    let editor: ComponentFixture<EditPrintDetailComponent> | undefined;
    let settings: Record<string, Mock>;
    let printerService: MockedObject<PrinterService>;
    let onboarding: MockedObject<OnboardingService>;
    let achievements: MockedObject<AchievementService>;
    let analytics: MockedObject<GoogleAnalyticsService>;

    const printer = (id: number, name: string): PrinterSummary =>
      ({
        id,
        name,
        make: 'Prusa',
        model: 'MK4',
        isActive: true,
      }) as PrinterSummary;

    // A print handed off from Cura: no id yet, but the slicer filled the title, the note and a
    // usage row with a resolved spool.
    const curaPrint = {
      id: null,
      title: 'Benchy from Cura',
      printerId: null,
      startDate: null,
      estimatedPrintTimeInSeconds: 3725,
      printTimeInSeconds: null,
      estimatedFilamentUsageMg: null,
      filamentUsageMg: null,
      filamentType: null,
      filamentUsage: [
        {
          id: null,
          filament: {
            id: 'spool-1',
            displayName: 'Prusament Galaxy Black',
            materialType: 'PLA',
          },
          slot: null,
          estimatedAmountMg: 12000,
          estimatedSource: PrintFilamentSourceMeasurement.Weight,
          amountMg: null,
          source: PrintFilamentSourceMeasurement.Weight,
          notes: '',
        },
      ],
      notes: 'Sliced at 0.2mm',
      url: null,
      fileName: 'benchy.gcode',
      status: PrintStatus.Printing,
      viewStatus: 3,
      allowComments: true,
      allowFileDownloads: false,
      images: [],
      comments: [],
      curaSettingId: 'cura-1',
    } as unknown as PrintDetail;

    const flushPromises = () => new Promise((r) => setTimeout(r));

    function openEditor(options: {
      print?: PrintDetail | null;
      printers?: PrinterSummary[];
      lastSelectedPrinterId?: number;
      query?: Record<string, string>;
      detectedPrinterNames?: string[];
    }): EditPrintDetailComponent {
      const route = TestBed.inject(ActivatedRoute) as unknown as {
        data: Observable<Record<string, unknown>>;
        snapshot: unknown;
      };
      let resolved: Record<string, unknown>;
      route.data.subscribe((data) => (resolved = data));
      route.data = of({
        ...resolved!,
        printers: options.printers ?? [],
        lastSelectedPrintSetting:
          options.lastSelectedPrinterId === undefined
            ? null
            : { id: 3, value: `${options.lastSelectedPrinterId}` },
        print: {
          print: options.print ?? null,
          user: null,
          detectedPrinterNames: options.detectedPrinterNames ?? [],
        },
      });
      route.snapshot = {
        queryParamMap: convertToParamMap(options.query ?? {}),
      };

      editor = TestBed.createComponent(EditPrintDetailComponent);
      editor.detectChanges();
      return editor.componentInstance;
    }

    function stubDialog(form: EditPrintDetailComponent) {
      const closed = new Subject<unknown>();
      const open = vi.spyOn(form.dialog, 'open').mockReturnValue({
        afterClosed: () => closed,
      } as never);
      return { open, closed };
    }

    /** The user picks an option from the open panel, as MatSelect reports it. */
    function choosePrinter(form: EditPrintDetailComponent, value: number) {
      const control = form.printForm.controls.printerId;
      form.onPrinterSelectOpenedChange(true);
      control.markAsDirty();
      control.setValue(value);
    }

    function writtenPrinterIds(): string[] {
      return [
        ...vi
          .mocked(settings['addUserSetting'])
          .mock.calls.filter(
            (c) => c[0] === UserSettingType.Prints_LastSelectedPrinterId
          )
          .map((c) => c[1] as string),
        ...vi
          .mocked(settings['updateUserSetting'])
          .mock.calls.map((c) => c[1] as string),
      ];
    }

    beforeEach(() => {
      settings = TestBed.inject(UserSettingService) as unknown as Record<
        string,
        Mock
      >;
      settings['addUserSetting'] = vi
        .fn()
        .mockReturnValue(of({ id: 3, value: '' }));
      settings['updateUserSetting'].mockReturnValue(of({ id: 3, value: '' }));
      printerService = TestBed.inject(
        PrinterService
      ) as MockedObject<PrinterService>;
      onboarding = TestBed.inject(
        OnboardingService
      ) as MockedObject<OnboardingService>;
      achievements = TestBed.inject(
        AchievementService
      ) as MockedObject<AchievementService>;
      analytics = TestBed.inject(
        GoogleAnalyticsService
      ) as MockedObject<GoogleAnalyticsService>;
      achievements.me.mockClear();
      vi.spyOn(TestBed.inject(Router), 'navigate').mockReturnValue(
        Promise.resolve(true)
      );
    });

    afterEach(() => editor?.destroy());

    describe('adding a printer from the printer select', () => {
      it('offers "+ Add a printer" after the printers', async () => {
        vi.useFakeTimers();
        openEditor({ printers: [printer(7, 'Mini')] });

        (
          editor!.debugElement.query(
            By.css('#edit-print-printer .mat-mdc-select-trigger')
          ).nativeElement as HTMLElement
        ).click();
        editor!.detectChanges();
        await vi.runAllTimersAsync();

        const options = Array.from(document.querySelectorAll('mat-option'));
        expect(options[options.length - 1].textContent).toContain(
          '+ Add a printer'
        );
        expect(
          options[options.length - 1].classList.contains('add-printer-option')
        ).toBe(true);
      });

      // Review Focus 1: a slicer hand-off must keep every field it filled.
      it('keeps the Cura fields and selects the new printer', async () => {
        const form = openEditor({
          print: curaPrint,
          printers: [printer(7, 'Mini')],
          lastSelectedPrinterId: 7,
        });
        const { open, closed } = stubDialog(form);
        const usageBefore = JSON.stringify(form.filamentUsage.getRawValue());
        printerService.getCurrentUserPrinterSummaries.mockReturnValue(
          of({
            paging: {},
            items: [printer(7, 'Mini'), printer(42, 'Core One')],
          } as never)
        );

        choosePrinter(form, -1);
        expect(
          form.printForm.controls.printerId.value,
          'restored while the dialog is open'
        ).toBe(7);
        await flushPromises();
        expect(open).toHaveBeenCalledTimes(1);
        expect(vi.mocked(open).mock.lastCall[1]!.data).toEqual({
          source: 'print-form',
          showEmailNotice: false,
        });

        closed.next({ id: 42 });
        closed.complete();
        editor!.detectChanges();
        await editor!.whenStable();
        editor!.detectChanges();

        expect(
          printerService.getCurrentUserPrinterSummaries
        ).toHaveBeenCalledWith(1, 100, undefined, false);
        expect(form.printers.map((p) => p.id)).toEqual([7, 42]);
        expect(form.printForm.controls.printerId.value).toBe(42);
        expect(form.printForm.controls.title.value).toBe('Benchy from Cura');
        expect(form.printForm.controls.notes.value).toBe('Sliced at 0.2mm');
        expect(JSON.stringify(form.filamentUsage.getRawValue())).toBe(
          usageBefore
        );
        expect(form.getPrintFromForm().curaSettingId).toBe('cura-1');
        expect(writtenPrinterIds()).not.toContain('-1');
        expect(writtenPrinterIds()).toContain('42');
        expect(
          printerService.getLoadedFilamentForPrinter
        ).not.toHaveBeenCalledWith(-1);
        expect(
          (editor!.nativeElement as HTMLElement).querySelector(
            '#edit-print-printer'
          )!.textContent
        ).toContain('Core One');
      });

      it('restores the previous printer when the dialog is canceled', async () => {
        const form = openEditor({
          printers: [printer(7, 'Mini')],
          lastSelectedPrinterId: 7,
        });
        const { open, closed } = stubDialog(form);

        choosePrinter(form, -1);
        await flushPromises();
        closed.next(undefined);
        closed.complete();

        expect(open).toHaveBeenCalledTimes(1);
        expect(form.printForm.controls.printerId.value).toBe(7);
        expect(
          printerService.getCurrentUserPrinterSummaries
        ).not.toHaveBeenCalled();
        expect(writtenPrinterIds()).toEqual([]);
      });

      it('tells the dialog to show the email notice to an eligible user', async () => {
        onboarding.status.mockResolvedValue({
          onboardingEligible: true,
          createdDate: '2026-10-18',
          emailVerified: false,
        });
        const form = openEditor({ printers: [printer(7, 'Mini')] });
        const { open } = stubDialog(form);

        choosePrinter(form, -1);
        await flushPromises();

        expect(vi.mocked(open).mock.lastCall[1]!.data).toEqual({
          source: 'print-form',
          showEmailNotice: true,
        });
      });
    });

    describe('canceling "+ Add a printer"', () => {
      it('leaves a pristine form pristine', async () => {
        const form = openEditor({
          printers: [printer(7, 'Mini')],
          lastSelectedPrinterId: 7,
        });
        const { open, closed } = stubDialog(form);
        expect(form.printForm.dirty).toBe(false);

        choosePrinter(form, -1);
        form.onPrinterSelectOpenedChange(false);
        await flushPromises();
        closed.next(undefined);
        closed.complete();

        expect(open).toHaveBeenCalledTimes(1);
        expect(form.printForm.controls.printerId.value).toBe(7);
        expect(form.printForm.dirty).toBe(false);
        expect(form.canDeactivate()).toBe(true);
      });

      it('keeps a form dirty that was already dirty', async () => {
        const form = openEditor({
          printers: [printer(7, 'Mini'), printer(8, 'Core One')],
          lastSelectedPrinterId: 7,
        });
        const { closed } = stubDialog(form);

        choosePrinter(form, 8);
        form.onPrinterSelectOpenedChange(false);
        choosePrinter(form, -1);
        await flushPromises();
        closed.next(undefined);

        expect(form.printForm.controls.printerId.value).toBe(8);
        expect(form.printForm.dirty).toBe(true);
      });

      it('opens no dialog when arrow keys reach it on the closed select', async () => {
        const form = openEditor({
          printers: [printer(7, 'Mini')],
          lastSelectedPrinterId: 7,
        });
        const { open } = stubDialog(form);
        editor!.detectChanges();
        const select = editor!.debugElement.query(By.css('#edit-print-printer'))
          .nativeElement as HTMLElement;

        select.focus();
        // MatSelect reads keyCode, which a KeyboardEvent init dict cannot set.
        const arrowDown = new KeyboardEvent('keydown', {
          key: 'ArrowDown',
          bubbles: true,
        });
        Object.defineProperty(arrowDown, 'keyCode', { get: () => 40 });
        const seen: (number | null)[] = [];
        form.printForm.controls.printerId.valueChanges.subscribe((v) =>
          seen.push(v)
        );
        // The first press activates the current printer, the second moves onto the sentinel.
        select.dispatchEvent(arrowDown);
        editor!.detectChanges();
        select.dispatchEvent(arrowDown);
        editor!.detectChanges();
        await flushPromises();

        expect(seen, 'the arrow key reached the sentinel').toContain(-1);

        expect(open).not.toHaveBeenCalled();
        expect(form.printForm.controls.printerId.value).toBe(7);
        expect(writtenPrinterIds()).not.toContain('-1');
        // The form's dirty state is not checked here: the first press re-selects the current
        // printer, and MatSelect reports that as a user change (as it did before this branch).
      });
    });

    describe('the onboarding status lookup', () => {
      it('is prefetched when a new print opens', () => {
        onboarding.status.mockClear();
        openEditor({ printers: [printer(7, 'Mini')] });

        expect(onboarding.status).toHaveBeenCalled();
      });

      it('opens the dialog without the notice when the lookup hangs past 3 s', async () => {
        vi.useFakeTimers();
        onboarding.status.mockReturnValue(new Promise(() => {}));
        const form = openEditor({ printers: [] });
        const { open } = stubDialog(form);

        void form.openAddPrinter();
        await vi.advanceTimersByTimeAsync(2999);
        expect(open).not.toHaveBeenCalled();
        await vi.advanceTimersByTimeAsync(1);
        await vi.advanceTimersByTimeAsync(0);

        expect(open).toHaveBeenCalledTimes(1);
        expect(vi.mocked(open).mock.lastCall[1]!.data).toEqual({
          source: 'print-form',
          showEmailNotice: false,
        });
        await vi.runAllTimersAsync();
      });

      it('can open the dialog again after dialog.open throws', async () => {
        const form = openEditor({ printers: [] });
        const open = vi.spyOn(form.dialog, 'open').mockImplementation(() => {
          throw new Error('boom');
        });

        await form.openAddPrinter();
        open.mockReturnValue({ afterClosed: () => new Subject() } as never);
        await form.openAddPrinter();

        expect(open).toHaveBeenCalledTimes(2);
      });
    });

    describe('with no printers', () => {
      it('shows an inline block instead of the select, which opens the dialog', async () => {
        const form = openEditor({ printers: [] });
        const { open } = stubDialog(form);
        const host = editor!.nativeElement as HTMLElement;

        expect(host.querySelector('#edit-print-printer')).toBeNull();
        const block = host.querySelector('.add-first-printer')!;
        expect(block.textContent).toContain(
          'Add the printer you printed this on'
        );

        (block.querySelector('button') as HTMLButtonElement).click();
        await flushPromises();

        expect(open).toHaveBeenCalledTimes(1);
      });

      it('shows the select once the first printer is added', async () => {
        const form = openEditor({ printers: [] });
        const { closed } = stubDialog(form);
        printerService.getCurrentUserPrinterSummaries.mockReturnValue(
          of({ paging: {}, items: [printer(42, 'Core One')] } as never)
        );

        await form.openAddPrinter();
        closed.next({ id: 42 });
        editor!.detectChanges();

        const host = editor!.nativeElement as HTMLElement;
        expect(host.querySelector('.add-first-printer')).toBeNull();
        expect(host.querySelector('#edit-print-printer')).not.toBeNull();
        expect(form.printForm.controls.printerId.value).toBe(42);
      });

      it('shows no toast', async () => {
        openEditor({ printers: [] });
        await flushPromises();

        const toastr = TestBed.inject(
          ToastrService
        ) as MockedObject<ToastrService>;
        expect(toastr.info).not.toHaveBeenCalled();
      });
    });

    describe('detecting the slicer printer', () => {
      let catalog: MockedObject<PrinterCatalogService>;
      let logger: MockedObject<LoggingService>;

      const X1C = 'bambu-lab-x1-carbon';
      const x1cModel = {
        id: X1C,
        make: 'Bambu Lab',
        model: 'X1 Carbon',
        technology: 'FDM',
      } as PrinterModel;
      const spoolA = {
        id: 'spool-a',
        displayName: 'Spool A',
      } as FilamentSummary;
      const spoolB = {
        id: 'spool-b',
        displayName: 'Spool B',
      } as FilamentSummary;
      const catalogPrinter = (
        id: number,
        catalogModelId: string | null,
        isActive = true
      ): PrinterSummary => ({
        ...printer(id, `Printer ${id}`),
        catalogModelId,
        isActive,
      });
      const detectedEvents = () =>
        vi
          .mocked(logger.logEvent)
          .mock.calls.filter((c) => c[0] === 'PrintForm_PrinterDetected')
          .map((c) => c[1]);
      const hint = () =>
        (editor!.nativeElement as HTMLElement).querySelector(
          '[data-testid="detected-printer-hint"]'
        );

      beforeEach(() => {
        catalog = TestBed.inject(
          PrinterCatalogService
        ) as MockedObject<PrinterCatalogService>;
        logger = TestBed.inject(LoggingService) as MockedObject<LoggingService>;
        catalog.match.mockClear();
        catalog.get.mockClear();
      });

      describe('a model the user owns', () => {
        beforeEach(() =>
          catalog.match.mockReturnValue(of({ id: X1C, confidence: 'exact' }))
        );

        it('preselects that printer without saving it as the last selected', () => {
          const form = openEditor({
            print: curaPrint,
            printers: [catalogPrinter(7, null), catalogPrinter(9, X1C)],
            lastSelectedPrinterId: 7,
            detectedPrinterNames: ['Bambu Lab X1 Carbon 0.4 nozzle'],
          });

          expect(catalog.match).toHaveBeenCalledTimes(1);

          expect(catalog.match).toHaveBeenCalledWith(
            'Bambu Lab X1 Carbon 0.4 nozzle'
          );
          expect(form.printForm.controls.printerId.value).toBe(9);
          expect(writtenPrinterIds()).toEqual([]);
          expect(hint()).toBeNull();
          expect(detectedEvents()).toEqual([
            { confidence: 'exact', owned: true, candidate: 0 },
          ]);
        });

        it('picks the newest active printer when several have that model', () => {
          const form = openEditor({
            print: curaPrint,
            printers: [
              catalogPrinter(9, X1C),
              catalogPrinter(12, X1C),
              catalogPrinter(15, X1C, false),
              catalogPrinter(20, null),
            ],
            lastSelectedPrinterId: 20,
            detectedPrinterNames: ['X1C'],
          });

          expect(form.printForm.controls.printerId.value).toBe(12);
        });

        it('leaves the other fields alone', () => {
          printerService.getLoadedFilamentForPrinter.mockImplementation(
            (id) => of(id === 9 ? [{ filament: spoolB }] : []) as never
          );
          const form = openEditor({
            print: curaPrint,
            printers: [catalogPrinter(7, null), catalogPrinter(9, X1C)],
            lastSelectedPrinterId: 7,
            detectedPrinterNames: ['X1C'],
          });

          expect(form.printForm.controls.title.value).toBe('Benchy from Cura');
          expect(form.printForm.controls.notes.value).toBe('Sliced at 0.2mm');
          expect(form.getPrintFromForm().curaSettingId).toBe('cura-1');
          const row = form.filamentUsage.at(0).getRawValue();
          expect(row.filament).toEqual(spoolB);
          expect(
            form.getPrintFromForm().filamentUsage[0].estimatedAmountMg
          ).toBe(12000);
          expect(form.printForm.dirty).toBe(false);
        });

        describe('the usage rows', () => {
          const slicerPrint = {
            ...curaPrint,
            curaSettingId: null,
            filamentUsage: [
              {
                ...curaPrint.filamentUsage[0],
                filament: OTHER_FILAMENT,
              },
            ],
          } as unknown as PrintDetail;

          it('refill from the detected printer, as a manual change does', () => {
            printerService.getLoadedFilamentForPrinter.mockImplementation(
              (id) =>
                of(
                  id === 7
                    ? [{ filament: spoolA }]
                    : id === 9
                      ? [{ filament: spoolB }]
                      : []
                ) as never
            );
            const form = openEditor({
              print: slicerPrint,
              printers: [catalogPrinter(7, null), catalogPrinter(9, X1C)],
              lastSelectedPrinterId: 7,
              detectedPrinterNames: ['X1C'],
            });

            expect(form.printForm.controls.printerId.value).toBe(9);
            expect(
              printerService.getLoadedFilamentForPrinter
            ).toHaveBeenCalledWith(9);
            expect(form.filamentUsage.at(0).get('filament')!.value).toEqual(
              spoolB
            );
            expect(form.filamentUsage.length).toBe(1);
            expect(writtenPrinterIds()).toEqual([]);
          });

          it('keep rows the user touched while the match was pending', () => {
            const match = new Subject<{
              id: string;
              confidence: string;
            }>();
            catalog.match.mockReturnValue(match);
            printerService.getLoadedFilamentForPrinter.mockImplementation(
              (id) => of(id === 9 ? [{ filament: spoolB }] : []) as never
            );
            const form = openEditor({
              print: slicerPrint,
              printers: [catalogPrinter(7, null), catalogPrinter(9, X1C)],
              lastSelectedPrinterId: 7,
              detectedPrinterNames: ['X1C'],
            });

            const filament = form.filamentUsage.at(0).get('filament')!;
            filament.setValue(spoolA);
            filament.markAsDirty();
            match.next({ id: X1C, confidence: 'exact' });

            expect(form.printForm.controls.printerId.value).toBe(9);
            expect(filament.value).toEqual(spoolA);
            expect(
              printerService.getLoadedFilamentForPrinter
            ).not.toHaveBeenCalledWith(9);
            expect(writtenPrinterIds()).toEqual([]);
          });

          it("drop the last-selected printer's spool when it lands after detection", () => {
            const printer7Spools = new Subject<unknown[]>();
            printerService.getLoadedFilamentForPrinter.mockImplementation(
              (id) =>
                (id === 7
                  ? printer7Spools
                  : of(id === 9 ? [{ filament: spoolB }] : [])) as never
            );
            const form = openEditor({
              print: slicerPrint,
              printers: [catalogPrinter(7, null), catalogPrinter(9, X1C)],
              lastSelectedPrinterId: 7,
              detectedPrinterNames: ['X1C'],
            });

            printer7Spools.next([{ filament: spoolA }]);

            expect(form.printForm.controls.printerId.value).toBe(9);
            expect(form.filamentUsage.at(0).get('filament')!.value).toEqual(
              spoolB
            );
          });
        });

        it('never overrides a printer the user already chose', () => {
          const match = new Subject<{
            id: string;
            confidence: string;
          }>();
          catalog.match.mockReturnValue(match);
          const form = openEditor({
            print: curaPrint,
            printers: [
              catalogPrinter(7, null),
              catalogPrinter(8, null),
              catalogPrinter(9, X1C),
            ],
            lastSelectedPrinterId: 7,
            detectedPrinterNames: ['X1C'],
          });

          choosePrinter(form, 8);
          match.next({ id: X1C, confidence: 'exact' });
          match.complete();

          expect(form.printForm.controls.printerId.value).toBe(8);
        });
      });

      describe('a model the user does not own', () => {
        beforeEach(() => {
          catalog.match.mockReturnValue(of({ id: X1C, confidence: 'alias' }));
          catalog.get.mockReturnValue(of(x1cModel));
        });

        it('shows the hint and keeps the printer', () => {
          const form = openEditor({
            print: curaPrint,
            printers: [catalogPrinter(7, null)],
            lastSelectedPrinterId: 7,
            detectedPrinterNames: ['Bambu Lab X1 Carbon 0.4 nozzle'],
          });
          editor!.detectChanges();

          expect(catalog.get).toHaveBeenCalledWith(X1C);
          expect(hint()!.textContent).toContain(
            'Detected: Bambu Lab X1 Carbon'
          );
          expect(form.printForm.controls.printerId.value).toBe(7);
          expect(detectedEvents()).toEqual([
            { confidence: 'alias', owned: false, candidate: 0 },
          ]);
        });

        it('paints the hint when the model arrives after the first render', () => {
          const model = new Subject<PrinterModel | null>();
          catalog.get.mockReturnValue(model);
          openEditor({
            print: curaPrint,
            printers: [catalogPrinter(7, null)],
            lastSelectedPrinterId: 7,
            detectedPrinterNames: ['X1C'],
          });
          expect(hint()).toBeNull();

          model.next(x1cModel);
          editor!.detectChanges();

          expect(hint()!.textContent).toContain(
            'Detected: Bambu Lab X1 Carbon'
          );
        });

        it('shows the hint to a user with no printers', () => {
          openEditor({
            print: curaPrint,
            printers: [],
            detectedPrinterNames: ['X1C'],
          });
          editor!.detectChanges();

          expect(hint()).not.toBeNull();
        });

        // Review Focus 1.
        it('"Add it" opens quick add on that model and selects the new printer, keeping the slicer fields', async () => {
          const form = openEditor({
            print: curaPrint,
            printers: [catalogPrinter(7, null)],
            lastSelectedPrinterId: 7,
            detectedPrinterNames: ['X1C'],
          });
          editor!.detectChanges();
          const { open, closed } = stubDialog(form);
          const usageBefore = JSON.stringify(form.filamentUsage.getRawValue());
          printerService.getCurrentUserPrinterSummaries.mockReturnValue(
            of({
              paging: {},
              items: [catalogPrinter(7, null), catalogPrinter(42, X1C)],
            } as never)
          );

          (hint()!.querySelector('button') as HTMLButtonElement).click();
          await flushPromises();

          expect(open).toHaveBeenCalledTimes(1);
          expect(vi.mocked(open).mock.lastCall[1]!.data).toEqual({
            source: 'print-form',
            showEmailNotice: false,
            initialModelId: X1C,
          });

          closed.next({ id: 42, catalogModelId: X1C });
          closed.complete();
          editor!.detectChanges();
          await editor!.whenStable();
          editor!.detectChanges();

          expect(form.printForm.controls.printerId.value).toBe(42);
          expect(form.printForm.controls.title.value).toBe('Benchy from Cura');
          expect(form.printForm.controls.notes.value).toBe('Sliced at 0.2mm');
          expect(JSON.stringify(form.filamentUsage.getRawValue())).toBe(
            usageBefore
          );
          expect(form.getPrintFromForm().curaSettingId).toBe('cura-1');
          expect(logger.logEvent).toHaveBeenCalledWith(
            'PrintForm_DetectedPrinterAdded'
          );
          expect(hint()).toBeNull();
        });

        it('logs no add when the user adds a different model', async () => {
          const form = openEditor({
            print: curaPrint,
            printers: [catalogPrinter(7, null)],
            lastSelectedPrinterId: 7,
            detectedPrinterNames: ['X1C'],
          });
          editor!.detectChanges();
          const { closed } = stubDialog(form);
          printerService.getCurrentUserPrinterSummaries.mockReturnValue(
            of({
              paging: {},
              items: [
                catalogPrinter(7, null),
                catalogPrinter(42, 'prusa-mk4s'),
              ],
            } as never)
          );

          (hint()!.querySelector('button') as HTMLButtonElement).click();
          await flushPromises();
          closed.next({ id: 42, catalogModelId: 'prusa-mk4s' });
          editor!.detectChanges();

          expect(form.printForm.controls.printerId.value).toBe(42);
          expect(hint()).not.toBeNull();
          expect(logger.logEvent).not.toHaveBeenCalledWith(
            'PrintForm_DetectedPrinterAdded'
          );
        });

        it('clears the hint when "+ Add a printer" adds that model', async () => {
          const form = openEditor({
            print: curaPrint,
            printers: [catalogPrinter(7, null)],
            lastSelectedPrinterId: 7,
            detectedPrinterNames: ['X1C'],
          });
          editor!.detectChanges();
          const { open, closed } = stubDialog(form);
          printerService.getCurrentUserPrinterSummaries.mockReturnValue(
            of({
              paging: {},
              items: [catalogPrinter(7, null), catalogPrinter(42, X1C)],
            } as never)
          );

          choosePrinter(form, -1);
          await flushPromises();
          expect(vi.mocked(open).mock.lastCall[1]!.data).toEqual({
            source: 'print-form',
            showEmailNotice: false,
          });
          closed.next({ id: 42, catalogModelId: X1C });
          editor!.detectChanges();

          expect(hint()).toBeNull();
          expect(logger.logEvent).toHaveBeenCalledWith(
            'PrintForm_DetectedPrinterAdded'
          );
        });

        it('keeps the hint when quick add is canceled', async () => {
          const form = openEditor({
            print: curaPrint,
            printers: [catalogPrinter(7, null)],
            lastSelectedPrinterId: 7,
            detectedPrinterNames: ['X1C'],
          });
          editor!.detectChanges();
          const { closed } = stubDialog(form);

          (hint()!.querySelector('button') as HTMLButtonElement).click();
          await flushPromises();
          closed.next(undefined);
          closed.complete();
          editor!.detectChanges();

          expect(form.printForm.controls.printerId.value).toBe(7);
          expect(hint()).not.toBeNull();
          expect(logger.logEvent).not.toHaveBeenCalledWith(
            'PrintForm_DetectedPrinterAdded'
          );
        });
      });

      // Review Focus 3: the catalog never blocks, and detection is silent.
      describe('when detection finds nothing', () => {
        function expectNothingChanged(form: EditPrintDetailComponent) {
          editor!.detectChanges();
          expect(hint()).toBeNull();
          expect(form.printForm.controls.printerId.value).toBe(7);
          expect(form.printForm.controls.title.value).toBe('Benchy from Cura');
          expect(form.printForm.dirty).toBe(false);
          expect(detectedEvents()).toEqual([]);
          expect(writtenPrinterIds()).toEqual([]);
        }

        const open = () =>
          openEditor({
            print: curaPrint,
            printers: [catalogPrinter(7, null), catalogPrinter(9, X1C)],
            lastSelectedPrinterId: 7,
            detectedPrinterNames: ['Mystery Printer 3000'],
          });

        it('changes nothing on no match', () => {
          catalog.match.mockReturnValue(of(null));
          const form = open();
          expect(catalog.get).not.toHaveBeenCalled();
          expectNothingChanged(form);
        });

        it('changes nothing when the match errors', () => {
          catalog.match.mockReturnValue(throwError(() => new Error('500')));
          expectNothingChanged(open());
        });

        it('changes nothing when the model lookup finds nothing', () => {
          catalog.match.mockReturnValue(
            of({ id: 'gone', confidence: 'exact' })
          );
          catalog.get.mockReturnValue(of(null));
          expectNothingChanged(open());
        });

        it('gives up after 3000 ms', async () => {
          vi.useFakeTimers();
          const match = new Subject<{
            id: string;
            confidence: string;
          }>();
          catalog.match.mockReturnValue(match);
          const form = open();

          await vi.advanceTimersByTimeAsync(3000);
          match.next({ id: X1C, confidence: 'exact' });

          expectNothingChanged(form);
          await vi.runAllTimersAsync();
        });

        it('still applies a match that lands just inside 3000 ms', async () => {
          vi.useFakeTimers();
          const match = new Subject<{
            id: string;
            confidence: string;
          }>();
          catalog.match.mockReturnValue(match);
          const form = open();

          await vi.advanceTimersByTimeAsync(2999);
          match.next({ id: X1C, confidence: 'exact' });

          expect(form.printForm.controls.printerId.value).toBe(9);
          await vi.runAllTimersAsync();
        });
      });

      // PrusaSlicer writes a vendor code as printer_model ("COREONE") and the readable profile
      // name as printer_settings_id, so the second candidate is the one that matches.
      describe('with several candidate names', () => {
        const prusaNames = ['COREONE', 'Prusa CORE One HF0.4 nozzle'];
        const CORE_ONE = 'prusa-core-one';
        const open = () =>
          openEditor({
            print: curaPrint,
            printers: [catalogPrinter(7, null), catalogPrinter(9, CORE_ONE)],
            lastSelectedPrinterId: 7,
            detectedPrinterNames: prusaNames,
          });

        it('tries them in order and uses the first that matches', () => {
          catalog.match.mockImplementation((name: string) =>
            of(
              name === 'COREONE' ? null : { id: CORE_ONE, confidence: 'alias' }
            )
          );
          const form = open();

          expect(vi.mocked(catalog.match).mock.calls).toEqual([
            ['COREONE'],
            ['Prusa CORE One HF0.4 nozzle'],
          ]);
          expect(form.printForm.controls.printerId.value).toBe(9);
          expect(detectedEvents()).toEqual([
            { confidence: 'alias', owned: true, candidate: 1 },
          ]);
        });

        it('moves past a candidate whose match errors', () => {
          catalog.match.mockImplementation((name: string) =>
            name === 'COREONE'
              ? throwError(() => new Error('500'))
              : of({ id: CORE_ONE, confidence: 'alias' })
          );
          const form = open();

          expect(catalog.match).toHaveBeenCalledTimes(2);
          expect(form.printForm.controls.printerId.value).toBe(9);
        });

        it('never asks about the next name once one matches', () => {
          catalog.match.mockReturnValue(
            of({ id: CORE_ONE, confidence: 'exact' })
          );
          const form = open();

          expect(catalog.match).toHaveBeenCalledTimes(1);

          expect(catalog.match).toHaveBeenCalledWith('COREONE');
          expect(form.printForm.controls.printerId.value).toBe(9);
          expect(detectedEvents()).toEqual([
            { confidence: 'exact', owned: true, candidate: 0 },
          ]);
        });

        it('changes nothing when no candidate matches', () => {
          catalog.match.mockReturnValue(of(null));
          const form = open();
          editor!.detectChanges();

          expect(catalog.match).toHaveBeenCalledTimes(2);
          expect(catalog.get).not.toHaveBeenCalled();
          expect(form.printForm.controls.printerId.value).toBe(7);
          expect(hint()).toBeNull();
          expect(detectedEvents()).toEqual([]);
          expect(writtenPrinterIds()).toEqual([]);
        });

        it('spends one 3000 ms budget on the whole sequence', async () => {
          vi.useFakeTimers();
          const first = new Subject<{
            id: string;
            confidence: string;
          } | null>();
          catalog.match.mockImplementation((name: string) =>
            name === 'COREONE'
              ? first
              : of({ id: CORE_ONE, confidence: 'exact' })
          );
          const form = open();

          await vi.advanceTimersByTimeAsync(3000);
          first.next(null);
          editor!.detectChanges();

          expect(catalog.match).toHaveBeenCalledTimes(1);

          expect(catalog.match).toHaveBeenCalledWith('COREONE');
          expect(form.printForm.controls.printerId.value).toBe(7);
          expect(hint()).toBeNull();
          expect(detectedEvents()).toEqual([]);
          await vi.runAllTimersAsync();
        });
      });

      it('does nothing once the form is gone', () => {
        const match = new Subject<{
          id: string;
          confidence: string;
        }>();
        catalog.match.mockReturnValue(match);
        const form = openEditor({
          print: curaPrint,
          printers: [catalogPrinter(7, null), catalogPrinter(9, X1C)],
          lastSelectedPrinterId: 7,
          detectedPrinterNames: ['X1C'],
        });

        editor!.destroy();
        expect(match.observed).toBe(false);
        expect(() =>
          match.next({ id: X1C, confidence: 'exact' })
        ).not.toThrow();

        expect(form.printForm.controls.printerId.value).toBe(7);
        expect(detectedEvents()).toEqual([]);
        expect(
          printerService.getLoadedFilamentForPrinter
        ).not.toHaveBeenCalledWith(9);
        editor = undefined;
      });

      it('does not run when editing an existing print', () => {
        openEditor({
          print: { ...curaPrint, id: 5, printerId: 7 } as PrintDetail,
          printers: [catalogPrinter(7, null), catalogPrinter(9, X1C)],
          detectedPrinterNames: ['X1C'],
        });
        expect(catalog.match).not.toHaveBeenCalled();
      });

      it('does not run without a detected name', () => {
        openEditor({
          print: curaPrint,
          printers: [catalogPrinter(7, null)],
          lastSelectedPrinterId: 7,
        });
        expect(catalog.match).not.toHaveBeenCalled();
      });
    });

    describe('onboarding=1', () => {
      it('pre-fills the title and the newest printer, and shows the strip', () => {
        const form = openEditor({
          printers: [
            printer(7, 'Mini'),
            printer(42, 'Core One'),
            printer(9, 'XL'),
          ],
          lastSelectedPrinterId: 7,
          query: { onboarding: '1' },
        });
        const host = editor!.nativeElement as HTMLElement;

        expect(form.onboardingMode()).toBe(true);
        expect(form.printForm.controls.title.value).toBe('My first print');
        expect(form.printForm.controls.printerId.value).toBe(42);
        const strip = host.querySelector('.onboarding-strip')!;
        expect(strip.textContent).toContain(
          'Getting started · Log your first print'
        );
        const back = strip.querySelector('a')!;
        expect(back.textContent).toContain('Back');
        expect(back.getAttribute('href')).toBe('/welcome?step=3');
      });

      it('keeps a title that is already there', () => {
        const form = openEditor({
          print: curaPrint,
          printers: [printer(7, 'Mini')],
          query: { onboarding: '1' },
        });

        expect(form.printForm.controls.title.value).toBe('Benchy from Cura');
      });

      it('shows no strip and an empty title without the param', () => {
        const form = openEditor({ printers: [printer(7, 'Mini')] });
        const host = editor!.nativeElement as HTMLElement;

        expect(form.onboardingMode()).toBe(false);
        expect(form.printForm.controls.title.value).toBe('');
        expect(host.querySelector('.onboarding-strip')).toBeNull();
      });
    });

    describe('saving a new print', () => {
      const earned = (keys: string[]) =>
        of({
          families: keys.map((key) => ({ key, tiers: [{ tier: 1 }] })),
        } as never);

      function saveNewPrint(form: EditPrintDetailComponent) {
        form['handleSaveSuccess']({ id: null } as never);
      }

      it('does not fire the conversion when the first print was already earned', () => {
        achievements.me.mockReturnValue(earned(['first-print']));
        const form = openEditor({ printers: [printer(7, 'Mini')] });

        saveNewPrint(form);

        expect(achievements.me).toHaveBeenCalledTimes(1);
        expect(analytics.emitConversion).not.toHaveBeenCalled();
      });

      it('fires the conversion for a first print', () => {
        achievements.me.mockReturnValue(earned(['first-printer']));
        const form = openEditor({ printers: [printer(7, 'Mini')] });

        saveNewPrint(form);

        expect(analytics.emitConversion).toHaveBeenCalledTimes(1);
      });

      it('fires the conversion when the achievements could not be read', () => {
        achievements.me.mockReturnValue(
          new Observable((s) => s.error(new Error('500')))
        );
        const form = openEditor({ printers: [printer(7, 'Mini')] });

        saveNewPrint(form);

        expect(analytics.emitConversion).toHaveBeenCalledTimes(1);
      });

      it('does not look up achievements for an existing print', () => {
        openEditor({
          print: { ...curaPrint, id: 5 } as PrintDetail,
          printers: [printer(7, 'Mini')],
        });

        expect(achievements.me).not.toHaveBeenCalled();
      });

      it('sends tutorial_complete for an eligible user on their first print', async () => {
        onboarding.status.mockResolvedValue({
          onboardingEligible: true,
          createdDate: '2026-10-18',
          emailVerified: true,
        });
        achievements.me.mockReturnValue(earned([]));
        const form = openEditor({ printers: [printer(7, 'Mini')] });

        saveNewPrint(form);
        await flushPromises();

        expect(analytics.eventEmitter).toHaveBeenCalledTimes(1);

        expect(analytics.eventEmitter).toHaveBeenCalledWith(
          'tutorial_complete',
          'engagement',
          'tutorial_complete'
        );
      });

      it('does not send tutorial_complete to an ineligible user', async () => {
        achievements.me.mockReturnValue(earned([]));
        const form = openEditor({ printers: [printer(7, 'Mini')] });

        saveNewPrint(form);
        await flushPromises();

        expect(analytics.eventEmitter).not.toHaveBeenCalled();
      });

      it('does not send tutorial_complete when the first print is unknown or earned', async () => {
        onboarding.status.mockResolvedValue({
          onboardingEligible: true,
          createdDate: '2026-10-18',
          emailVerified: true,
        });
        achievements.me.mockReturnValue(earned(['first-print']));
        const form = openEditor({ printers: [printer(7, 'Mini')] });
        saveNewPrint(form);
        form.hadFirstPrint = null;
        saveNewPrint(form);
        await flushPromises();

        expect(analytics.eventEmitter).not.toHaveBeenCalled();
      });

      it('marks the welcome finished', () => {
        const form = openEditor({ printers: [printer(7, 'Mini')] });

        saveNewPrint(form);

        expect(onboarding.markWelcomeFinished).toHaveBeenCalledTimes(1);
      });

      it('does not mark the welcome finished when an existing print is saved', () => {
        const form = openEditor({ printers: [printer(7, 'Mini')] });

        form['handleSaveSuccess']({ id: 5 } as never);

        expect(onboarding.markWelcomeFinished).not.toHaveBeenCalled();
        expect(analytics.emitConversion).not.toHaveBeenCalled();
      });
    });
  });
});
