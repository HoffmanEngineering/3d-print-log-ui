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
      declarations: [NavbarComponent],
      imports: [RouterTestingModule, MatMenuModule],
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
});
