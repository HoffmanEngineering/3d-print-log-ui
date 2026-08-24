import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { NO_ERRORS_SCHEMA, signal } from '@angular/core';
import { MatMenuModule } from '@angular/material/menu';
import { RouterTestingModule } from '@angular/router/testing';
import { of } from 'rxjs';
import { AuthService } from 'src/app/core/services/auth.service';
import { SubscriptionService } from 'src/app/core/services/subscription.service';
import { NavbarComponent } from './navbar.component';

describe('NavbarComponent', () => {
  let component: NavbarComponent;
  let fixture: ComponentFixture<NavbarComponent>;

  beforeEach(waitForAsync(() => {
    const mockAuthService: Partial<AuthService> = {
      userProfile$: of(null),
    };
    const mockSubscriptionService = {
      isPro: signal(false),
    };
    TestBed.configureTestingModule({
      imports: [NavbarComponent, RouterTestingModule, MatMenuModule],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: SubscriptionService, useValue: mockSubscriptionService },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(NavbarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // The navbar used to render a second copy of the links for narrow screens
  // behind a matchMedia check. matchMedia is always false while prerendering, so
  // the static HTML shipped the wide-screen links and the client added the
  // narrow-screen copy on top, leaving two "About" buttons - the prerendered one
  // dead to clicks. There is only ever one copy now.
  it('renders a single About menu trigger', () => {
    const aboutTriggers = (
      fixture.nativeElement as HTMLElement
    ).querySelectorAll('button.mat-mdc-menu-trigger');

    const aboutButtons = Array.from(aboutTriggers).filter((button) =>
      button.textContent?.trim().startsWith('About')
    );

    expect(aboutButtons.length).toBe(1);
  });
});
