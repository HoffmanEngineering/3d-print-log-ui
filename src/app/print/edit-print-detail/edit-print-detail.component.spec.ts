import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { NO_ERRORS_SCHEMA } from '@angular/core';
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
      ['success', 'error', 'warning']
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

  describe('Image Management', () => {
    it('should enforce 5 image limit in detectFiles', () => {
      // Add 5 mock images to the form
      for (let i = 0; i < 5; i++) {
        const mockImage = component['createItem']({
          id: i + 1,
          url: `data:image/png;base64,test${i}`,
          isDefault: i === 0,
          displayOrder: i,
        });
        component.images.push(mockImage);
      }

      expect(component.images.length).toBe(5);

      // Try to add more - should be blocked
      const mockEvent = {
        target: {
          files: [new File([''], 'test.png', { type: 'image/png' })],
        },
      } as unknown as Event;

      component.detectFiles(mockEvent);

      // Should still be 5 (limit enforced)
      expect(component.images.length).toBe(5);
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

    it('should not set isDragOver when at 5-image limit', () => {
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
