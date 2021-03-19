import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AccountDeactivationBannerComponent } from './account-deactivation-banner.component';

xdescribe('AccountDeactivationBannerComponent', () => {
  let component: AccountDeactivationBannerComponent;
  let fixture: ComponentFixture<AccountDeactivationBannerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [AccountDeactivationBannerComponent],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(AccountDeactivationBannerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
