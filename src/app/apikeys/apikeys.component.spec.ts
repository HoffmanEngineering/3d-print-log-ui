import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ToastrService } from 'ngx-toastr';
import { of } from 'rxjs';
import { ApiKeyService } from '../core/services/api-key.service';
import { MetaTagService } from '../core/services/meta-tag.service';

import { ApikeysComponent } from './apikeys.component';

describe('ApikeysComponent', () => {
  let component: ApikeysComponent;
  let fixture: ComponentFixture<ApikeysComponent>;

  beforeEach(async () => {
    const mockApiKeyService = jasmine.createSpyObj<ApiKeyService>(
      'ApiKeyService',
      {
        getApiKeySummaryForUser: of([]),
      }
    );
    const mockToastrService = jasmine.createSpyObj<ToastrService>(
      'ToastrService',
      ['success', 'error']
    );
    const mockMetaTagService = jasmine.createSpyObj<MetaTagService>(
      'MetaTagService',
      {
        setTitle: undefined,
      }
    );
    await TestBed.configureTestingModule({
      declarations: [ApikeysComponent],
      providers: [
        { provide: ApiKeyService, useValue: mockApiKeyService },
        { provide: ToastrService, useValue: mockToastrService },
        { provide: MetaTagService, useValue: mockMetaTagService },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ApikeysComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
