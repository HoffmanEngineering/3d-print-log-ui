import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { of } from 'rxjs';

import { ViewPrintDetailComponent } from './view-print-detail.component';
import { PrintService } from 'src/app/core/services/print.service';
import { AuthService } from 'src/app/core/services/auth.service';
import { MetaTagService } from 'src/app/core/services/meta-tag.service';
import { DurationPipe } from 'src/app/shared/pipes/duration.pipe';

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
      ['addPrintComment']
    );

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

    TestBed.configureTestingModule({
      declarations: [ViewPrintDetailComponent, DurationPipe],
      imports: [RouterTestingModule],
      providers: [
        { provide: PrintService, useValue: mockPrintService },
        { provide: AuthService, useValue: mockAuthService },
        { provide: MetaTagService, useValue: mockMetaService },
        {
          provide: ActivatedRoute,
          useValue: {
            data: of({
              printers: [],
              print: { print: mockPrint, user: mockUser },
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
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render thumbnail strip when multiple images exist', () => {
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
