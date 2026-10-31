import type { MockedObject } from 'vitest';
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
  let apiKeys: MockedObject<ApiKeyService>;
  let summaries: Subject<UserApiKeySummary[]>;

  const existing = { id: 'k1', description: 'Klipper' } as UserApiKeySummary;
  const text = () => (fixture.nativeElement as HTMLElement).textContent;

  beforeEach(() => {
    summaries = new Subject();
    apiKeys = {
      getApiKeySummaryForUser: vi
        .fn()
        .mockName('ApiKeyService.getApiKeySummaryForUser'),
      createNewApiKey: vi.fn().mockName('ApiKeyService.createNewApiKey'),
      deleteApiKey: vi.fn().mockName('ApiKeyService.deleteApiKey'),
    } as unknown as MockedObject<ApiKeyService>;
    apiKeys.getApiKeySummaryForUser.mockReturnValue(summaries);

    TestBed.configureTestingModule({
      imports: [ApikeysComponent],
      providers: [
        { provide: ApiKeyService, useValue: apiKeys },
        {
          provide: ToastrService,
          useValue: {
            success: vi.fn().mockName('ToastrService.success'),
            error: vi.fn().mockName('ToastrService.error'),
          },
        },
        {
          provide: MetaTagService,
          useValue: {
            setTitle: vi.fn().mockName('MetaTagService.setTitle'),
          },
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
    apiKeys.createNewApiKey.mockReturnValue(
      of({ id: 'k2', description: 'Octo', publicKey: 'secret' } as never)
    );
    component.startAddNewKey();
    component.newKeyDescription = 'Octo';

    component.addNewKey();

    expect(apiKeys.createNewApiKey).toHaveBeenCalledTimes(1);

    expect(apiKeys.createNewApiKey).toHaveBeenCalledWith('Octo');
    expect(component.keys().map((k) => k.id)).toEqual(['k2', 'k1']);
    expect(
      (
        component.keys()[0] as {
          privateKey?: string;
        }
      ).privateKey
    ).toBe('secret');
    expect(component.addingKey()).toBe(false);
  });

  it('removes a deleted key', () => {
    summaries.next([existing]);
    apiKeys.deleteApiKey.mockReturnValue(of(undefined as never));

    component.deleteKey('k1');

    expect(component.keys()).toEqual([]);
  });
});
