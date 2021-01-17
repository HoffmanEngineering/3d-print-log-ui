import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatMomentDateModule } from '@angular/material-moment-adapter';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { ActivatedRoute } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { ToastrService } from 'ngx-toastr';
import { of } from 'rxjs';
import { FilamentService } from 'src/app/core/services/filament.service';

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
