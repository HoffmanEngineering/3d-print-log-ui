import { TestBed } from '@angular/core/testing';
import { CurrencySymbolResolverService } from './currency-symbol-resolver.service';
import { UserSettingService } from 'src/app/core/services/user-setting.service';

describe('CurrencySymbolResolverService', () => {
  let service: CurrencySymbolResolverService;
  let settings: jasmine.SpyObj<UserSettingService>;

  beforeEach(() => {
    settings = jasmine.createSpyObj<UserSettingService>('UserSettingService', [
      'getCurrentUsersSettingByType',
    ]);
    TestBed.configureTestingModule({
      providers: [{ provide: UserSettingService, useValue: settings }],
    });
    service = TestBed.inject(CurrencySymbolResolverService);
  });

  it('resolves null instead of rejecting when the settings call fails', async () => {
    settings.getCurrentUsersSettingByType.and.returnValue(
      Promise.reject(new Error('500 from settings endpoint'))
    );

    // Must not reject: this runs on the public prints/:id route, and a rejected
    // resolver cancels navigation and bounces the visitor to / (#66).
    await expectAsync(service.resolve(null as any, null as any)).toBeResolvedTo(
      null
    );
  });
});
