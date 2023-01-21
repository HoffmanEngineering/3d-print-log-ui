import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatMomentDateModule } from '@angular/material-moment-adapter';
import { MatLegacyAutocompleteModule as MatAutocompleteModule } from '@angular/material/legacy-autocomplete';
import { MatLegacyCheckboxModule as MatCheckboxModule } from '@angular/material/legacy-checkbox';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatLegacyInputModule as MatInputModule } from '@angular/material/legacy-input';
import { MatLegacySelectModule as MatSelectModule } from '@angular/material/legacy-select';
import { ActivatedRoute } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { ToastrService } from 'ngx-toastr';
import { of } from 'rxjs';
import { FilamentService } from 'src/app/core/services/filament.service';
import { LoggingService } from 'src/app/core/services/logging.service';
import { UserSettingService } from 'src/app/core/services/user-setting.service';

import { FilamentDetailComponent } from './filament-detail.component';

describe('FilamentDetailComponent', () => {
  let component: FilamentDetailComponent;
  let fixture: ComponentFixture<FilamentDetailComponent>;

  beforeEach(async () => {
    const mockFilamentService = jasmine.createSpyObj<FilamentService>(
      'FilamentService',
      ['getCurrentUserFilamentSummaries']
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
        MatMomentDateModule,
        MatAutocompleteModule,
      ],
      providers: [
        { provide: FilamentService, useValue: mockFilamentService },
        { provide: ToastrService, useValue: mockToastrservice },
        { provide: UserSettingService, useValue: mockUserSettingService },
        { provide: LoggingService, useValue: mockLogger },
        {
          provide: ActivatedRoute,
          useValue: {
            data: of({
              filament: null,
              materials: [],
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
});
