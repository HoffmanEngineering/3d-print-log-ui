import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import {
  Component,
  NO_ERRORS_SCHEMA,
  signal,
  WritableSignal,
} from '@angular/core';
import { MatMenuModule } from '@angular/material/menu';
import { RouterTestingModule } from '@angular/router/testing';
import { BehaviorSubject } from 'rxjs';
import {
  AuthService,
  UserProfileInfo,
} from 'src/app/core/services/auth.service';
import { SubscriptionService } from 'src/app/core/services/subscription.service';
import { NotificationBellComponent } from '../notification-bell/notification-bell.component';
import { NavbarComponent } from './navbar.component';

/** The real bell loads notifications and achievements; the navbar only places it. */
@Component({ selector: 'app-notification-bell', template: '' })
class NotificationBellStubComponent {}

describe('NavbarComponent', () => {
  let component: NavbarComponent;
  let fixture: ComponentFixture<NavbarComponent>;
  let profile$: BehaviorSubject<UserProfileInfo | null>;
  let loggedIn: WritableSignal<boolean | null>;

  beforeEach(waitForAsync(() => {
    profile$ = new BehaviorSubject<UserProfileInfo | null>(null);
    loggedIn = signal<boolean | null>(false);
    const mockAuthService: Partial<AuthService> = {
      userProfile$: profile$.asObservable(),
      isLoggedIn: loggedIn,
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
    })
      .overrideComponent(NavbarComponent, {
        remove: { imports: [NotificationBellComponent] },
        add: { imports: [NotificationBellStubComponent] },
      })
      .compileComponents();
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

  // The narrow-screen link set lives inside <mat-menu>, whose content Material
  // only stamps out when the menu opens. So the collapsed copy costs nothing in
  // the prerendered HTML and cannot re-introduce the duplicate-links bug above.
  it('renders the collapsed-nav trigger without stamping its menu content', () => {
    const host = fixture.nativeElement as HTMLElement;

    expect(host.querySelectorAll('.nav-menu-trigger').length).toBe(1);
    expect(host.textContent).not.toContain('Documentation');
  });

  // app.component.scss, styles.scss and the analytics filter bar all offset
  // content by a hard-coded toolbar height, so the row must never wrap or grow.
  it('keeps the link row on a single line', () => {
    const navLinks = (fixture.nativeElement as HTMLElement).querySelector(
      '.nav-links'
    ) as HTMLElement;

    const styles = getComputedStyle(navLinks);

    expect(styles.flexWrap).toBe('nowrap');
    expect(styles.justifyContent).toBe('flex-start');
  });

  describe('the account area', () => {
    const host = () => fixture.nativeElement as HTMLElement;
    const signIn = () => {
      loggedIn.set(true);
      profile$.next({
        id: 3,
        profilePicture: 'https://example.com/me.png',
      } as UserProfileInfo);
      fixture.detectChanges();
    };

    it('offers Log In to a signed-out visitor', () => {
      expect(host().querySelector('#loginButton')).not.toBeNull();
      expect(host().querySelector('img.profile-picture')).toBeNull();
    });

    it("swaps Log In for the user's picture once they sign in", () => {
      signIn();

      expect(host().querySelector('#loginButton')).toBeNull();
      expect(
        host().querySelector<HTMLImageElement>('img.profile-picture')!.src
      ).toBe('https://example.com/me.png');
    });

    it('puts Log In back when the user signs out', () => {
      signIn();

      loggedIn.set(false);
      profile$.next(null);
      fixture.detectChanges();

      expect(host().querySelector('#loginButton')).not.toBeNull();
    });
  });
});
