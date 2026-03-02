import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import {
  NO_ERRORS_SCHEMA,
  Signal,
  WritableSignal,
  signal,
} from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute, Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { ToastrService } from 'ngx-toastr';
import { of } from 'rxjs';
import {
  PrintDetail,
  PrintService,
  PrintStatus,
} from 'src/app/core/services/print.service';
import { UserSettingService } from 'src/app/core/services/user-setting.service';
import { EditPrintDetailComponent } from './edit-print-detail.component';

import { MatMomentDateModule } from '@angular/material-moment-adapter';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatDialogModule } from '@angular/material/dialog';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { LoggingService } from 'src/app/core/services/logging.service';
import { PrinterService } from 'src/app/core/services/printer.service';
import { PrinterRedirectPromptService } from '../services/printer-redirect-prompt.service';
import { GoogleAnalyticsService } from 'src/app/core/services/google-analytics.service';
import { SubscriptionService } from 'src/app/core/services/subscription.service';

describe('EditPrintDetailComponent', () => {
  let component: EditPrintDetailComponent;
  let fixture: ComponentFixture<EditPrintDetailComponent>;

  beforeEach(waitForAsync(() => {
    const mockPrintService = jasmine.createSpyObj<PrintService>(
      'PrintService',
      { addPrint: of(), calculatePrintCost: { valid: false, message: '' } }
    );

    const mockToastrService = jasmine.createSpyObj<ToastrService>(
      'ToastrService',
      ['success', 'error', 'warning', 'info']
    );

    const mockTitleService = jasmine.createSpyObj<Title>('Title', ['setTitle']);

    const mockUserSettingService = jasmine.createSpyObj<UserSettingService>(
      'UserSettingService',
      ['updateUserSetting']
    );

    const mockPrinterPromptService =
      jasmine.createSpyObj<PrinterRedirectPromptService>(
        'PrinterRedirectPromptService',
        {
          shouldShowAddPrinterPrompt: of(false),
        }
      );

    const mockLogger = jasmine.createSpyObj<LoggingService>('LoggingService', [
      'logException',
      'logEvent',
    ]);

    const mockPrinterService = jasmine.createSpyObj<PrinterService>(
      'PrinterService',
      { getLoadedFilamentForPrinter: of([]) }
    );

    const mockTrackingService = jasmine.createSpyObj<GoogleAnalyticsService>(
      'GoogleAnalyticsService',
      ['emitConversion']
    );

    const mockSubscriptionService = jasmine.createSpyObj<SubscriptionService>(
      'SubscriptionService',
      [],
      {
        isPro: signal(true) as Signal<boolean>,
        maxImagesPerPrint: signal(20) as Signal<number>,
        maxFilesPerPrint: signal(5) as Signal<number>,
        maxFileStorageBytes: signal(53687091200) as Signal<number>,
        usedFileStorageBytes: signal(0) as Signal<number>,
      }
    );

    TestBed.configureTestingModule({
      declarations: [EditPrintDetailComponent],
      imports: [
        RouterTestingModule,
        FormsModule,
        ReactiveFormsModule,
        MatInputModule,
        MatSelectModule,
        MatDatepickerModule,
        MatMomentDateModule,
        MatCheckboxModule,
        MatDialogModule,
      ],
      providers: [
        { provide: PrintService, useValue: mockPrintService },
        { provide: GoogleAnalyticsService, useValue: mockTrackingService },
        { provide: PrinterService, useValue: mockPrinterService },
        { provide: ToastrService, useValue: mockToastrService },
        { provide: Title, useValue: mockTitleService },
        { provide: UserSettingService, useValue: mockUserSettingService },
        {
          provide: PrinterRedirectPromptService,
          useValue: mockPrinterPromptService,
        },
        { provide: LoggingService, useValue: mockLogger },
        { provide: SubscriptionService, useValue: mockSubscriptionService },
        {
          provide: ActivatedRoute,
          useValue: {
            data: of({
              printers: [],
              lastSelectedPrinterSetting: null,
              defaultPrintViewStatusSetting: null,
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
    }).compileComponents();
  }));

  beforeEach(waitForAsync(() => {
    fixture = TestBed.createComponent(EditPrintDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  }, 10000);

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
        estimatedFilamentUsageMg: null,
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
      let toastrService: jasmine.SpyObj<ToastrService>;
      let isProSignal: WritableSignal<boolean>;
      let maxImagesSignal: WritableSignal<number>;

      beforeEach(() => {
        toastrService = TestBed.inject(
          ToastrService
        ) as jasmine.SpyObj<ToastrService>;
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

        expect(toastrService.warning).toHaveBeenCalledOnceWith(
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

        expect(toastrService.info).toHaveBeenCalledOnceWith(
          'Free accounts allow 5 images per print. Upgrade to Pro for more.',
          'Image Limit Reached'
        );
        expect(toastrService.warning).not.toHaveBeenCalled();
      });
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
    it('should reset saving to false after handleSaveSuccess', () => {
      const router = TestBed.inject(Router);
      spyOn(router, 'navigate').and.returnValue(Promise.resolve(true));

      component.saving = true;
      component['handleSaveSuccess']({ id: 1 } as any);

      expect(component.saving).toBe(false);
    });
  });
});
