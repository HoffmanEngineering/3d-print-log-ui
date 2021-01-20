import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  MatDialogModule,
  MatDialogRef,
  MAT_DIALOG_DATA,
} from '@angular/material/dialog';
import { LoggingService } from 'src/app/core/services/logging.service';

import { FilamentSearchModalComponent } from './filament-search-modal.component';

describe('FilamentSearchModalComponent', () => {
  let component: FilamentSearchModalComponent;
  let fixture: ComponentFixture<FilamentSearchModalComponent>;

  beforeEach(async () => {
    const mockLogger = jasmine.createSpyObj<LoggingService>('LoggingService', [
      'logEvent',
    ]);

    await TestBed.configureTestingModule({
      declarations: [FilamentSearchModalComponent],
      imports: [MatDialogModule],
      providers: [
        { provide: LoggingService, useValue: mockLogger },
        { provide: MatDialogRef, useValue: {} },
        { provide: MAT_DIALOG_DATA, useValue: [] },
      ],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(FilamentSearchModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
