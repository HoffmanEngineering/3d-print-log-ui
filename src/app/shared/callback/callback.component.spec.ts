import { TestBed } from '@angular/core/testing';
import { AuthService } from 'src/app/core/services/auth.service';

import { CallbackComponent } from './callback.component';

describe('CallbackComponent', () => {
  it('finishes the Auth0 login when the redirect lands here', () => {
    const auth = {
      handleAuthCallback: vi.fn().mockName('AuthService.handleAuthCallback'),
    };
    TestBed.configureTestingModule({
      imports: [CallbackComponent],
      providers: [{ provide: AuthService, useValue: auth }],
    });

    TestBed.createComponent(CallbackComponent).detectChanges();

    expect(auth.handleAuthCallback).toHaveBeenCalledTimes(1);
  });
});
