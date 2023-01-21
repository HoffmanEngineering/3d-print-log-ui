import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { ToastrService } from 'ngx-toastr';
import { FeedbackService } from 'src/app/core/services/feedback.service';

import { ParserUnavailableDialogComponent } from './parser-unavailable-dialog.component';

describe('ParserUnavailableDialogComponent', () => {
  let component: ParserUnavailableDialogComponent;
  let fixture: ComponentFixture<ParserUnavailableDialogComponent>;

  beforeEach(async () => {
    const mockFeedbackService = jasmine.createSpyObj<FeedbackService>(
      'FeedbackService',
      ['addFeedback']
    );
    const mockToastrService = jasmine.createSpyObj<ToastrService>(
      'ToastrService',
      ['success']
    );

    await TestBed.configureTestingModule({
      declarations: [ParserUnavailableDialogComponent],
      providers: [
        { provide: FeedbackService, useValue: mockFeedbackService },
        { provide: ToastrService, useValue: mockToastrService },
        { provide: MatDialogRef, useValue: {} },
        { provide: MAT_DIALOG_DATA, useValue: { supportedSlicers: 'Cura' } },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ParserUnavailableDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
