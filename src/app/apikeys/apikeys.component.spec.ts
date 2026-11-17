import type { Mock, MockedObject } from 'vitest';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { ToastrService } from 'ngx-toastr';
import { of, Subject, throwError } from 'rxjs';
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
  let dialog: { open: Mock };

  const existing = { id: 'k1', description: 'Klipper' } as UserApiKeySummary;
  const el = () => fixture.nativeElement as HTMLElement;
  const text = () => el().textContent;
  const button = (label: string) =>
    Array.from(el().querySelectorAll('button')).find(
      (b) =>
        b.textContent!.trim() === label ||
        b.getAttribute('aria-label') === label
    )!;
  const shownSecret = () =>
    (el().querySelector('.private-key input') as HTMLInputElement | null)
      ?.value ?? null;

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
    dialog = { open: vi.fn().mockName('MatDialog.open') };

    TestBed.configureTestingModule({
      imports: [ApikeysComponent],
      providers: [
        { provide: ApiKeyService, useValue: apiKeys },
        { provide: MatDialog, useValue: dialog },
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

  it('removes a deleted key once the delete is confirmed', () => {
    summaries.next([existing]);
    apiKeys.deleteApiKey.mockReturnValue(of(undefined as never));
    dialog.open.mockReturnValue({ afterClosed: () => of(true) });

    component.deleteKey(existing);

    expect(apiKeys.deleteApiKey).toHaveBeenCalledWith('k1');
    expect(component.keys()).toEqual([]);
  });

  it('asks before deleting a key, and keeps it when the dialog is dismissed', () => {
    summaries.next([{ ...existing, description: 'Klipper <garage>' }]);
    fixture.detectChanges();
    dialog.open.mockReturnValue({ afterClosed: () => of(undefined) });

    button('Delete API Key').click();
    fixture.detectChanges();

    expect(dialog.open).toHaveBeenCalledTimes(1);
    expect(dialog.open.mock.lastCall![1].data.body).toContain(
      'Klipper &lt;garage&gt;'
    );
    expect(apiKeys.deleteApiKey).not.toHaveBeenCalled();
    expect(component.keys().length).toBe(1);
  });

  it('creates one key when Submit is clicked twice', () => {
    summaries.next([]);
    const created = new Subject<never>();
    apiKeys.createNewApiKey.mockReturnValue(created);
    component.startAddNewKey();
    fixture.detectChanges();

    const submit = button('Submit');
    submit.click();
    fixture.detectChanges();
    expect(submit.disabled).toBe(true);
    submit.click();
    fixture.detectChanges();

    expect(apiKeys.createNewApiKey).toHaveBeenCalledTimes(1);
  });

  it('lets Submit be used again after a failed create', () => {
    summaries.next([]);
    apiKeys.createNewApiKey.mockReturnValue(
      throwError(() => new Error('offline'))
    );
    component.startAddNewKey();
    fixture.detectChanges();

    button('Submit').click();
    fixture.detectChanges();

    expect(button('Submit').disabled).toBe(false);
  });

  it('keeps a new key and its secret when the first list load lands after it', () => {
    apiKeys.createNewApiKey.mockReturnValue(
      of({ id: 'k2', description: 'Octo', publicKey: 'the-secret' } as never)
    );
    component.startAddNewKey();
    fixture.detectChanges();
    button('Submit').click();
    fixture.detectChanges();
    expect(shownSecret()).toBe('the-secret');

    // The first GET went out before the create, so it answers without the new key.
    summaries.next([existing]);
    fixture.detectChanges();

    expect(component.keys().map((k) => k.id)).toEqual(['k2', 'k1']);
    expect(shownSecret()).toBe('the-secret');
  });
});
