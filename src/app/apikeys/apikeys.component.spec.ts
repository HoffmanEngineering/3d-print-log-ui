import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ToastrService } from 'ngx-toastr';
import { of, Subject } from 'rxjs';
import {
  ApiKeyService,
  UserApiKeySummary,
} from '../core/services/api-key.service';
import { MetaTagService } from '../core/services/meta-tag.service';
import { PushPermissionPromptService } from '../core/services/push-permission-prompt.service';

import { ApikeysComponent } from './apikeys.component';

describe('ApikeysComponent', () => {
  let component: ApikeysComponent;
  let fixture: ComponentFixture<ApikeysComponent>;
  let apiKeys: jasmine.SpyObj<ApiKeyService>;
  let summaries: Subject<UserApiKeySummary[]>;

  const existing = { id: 'k1', description: 'Klipper' } as UserApiKeySummary;
  const text = () => (fixture.nativeElement as HTMLElement).textContent;

  beforeEach(() => {
    summaries = new Subject();
    apiKeys = jasmine.createSpyObj<ApiKeyService>('ApiKeyService', [
      'getApiKeySummaryForUser',
      'createNewApiKey',
      'deleteApiKey',
    ]);
    apiKeys.getApiKeySummaryForUser.and.returnValue(summaries);

    TestBed.configureTestingModule({
      declarations: [ApikeysComponent],
      providers: [
        { provide: ApiKeyService, useValue: apiKeys },
        {
          provide: ToastrService,
          useValue: jasmine.createSpyObj('ToastrService', ['success', 'error']),
        },
        {
          provide: MetaTagService,
          useValue: jasmine.createSpyObj('MetaTagService', ['setTitle']),
        },
        {
          provide: PushPermissionPromptService,
          useValue: { promptInContext: () => Promise.resolve() },
        },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    });
    fixture = TestBed.createComponent(ApikeysComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('shows Loading until the keys arrive', () => {
    expect(text()).toContain('Loading...');

    summaries.next([existing]);
    fixture.detectChanges();

    expect(text()).not.toContain('Loading...');
    expect(component.keys()).toEqual([existing]);
  });

  it('puts a new key first, with its secret, and closes the form', () => {
    summaries.next([existing]);
    apiKeys.createNewApiKey.and.returnValue(
      of({ id: 'k2', description: 'Octo', publicKey: 'secret' } as never)
    );
    component.startAddNewKey();
    component.newKeyDescription = 'Octo';

    component.addNewKey();

    expect(apiKeys.createNewApiKey).toHaveBeenCalledOnceWith('Octo');
    expect(component.keys().map((k) => k.id)).toEqual(['k2', 'k1']);
    expect((component.keys()[0] as { privateKey?: string }).privateKey).toBe(
      'secret'
    );
    expect(component.addingKey()).toBeFalse();
  });

  it('removes a deleted key', () => {
    summaries.next([existing]);
    apiKeys.deleteApiKey.and.returnValue(of(undefined as never));

    component.deleteKey('k1');

    expect(component.keys()).toEqual([]);
  });
});
