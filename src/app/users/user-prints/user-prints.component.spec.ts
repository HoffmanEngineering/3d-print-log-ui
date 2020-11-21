import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { UserPrintsComponent } from './user-prints.component';

xdescribe('UserPrintsComponent', () => {
  let component: UserPrintsComponent;
  let fixture: ComponentFixture<UserPrintsComponent>;

  beforeEach(
    waitForAsync(() => {
      TestBed.configureTestingModule({
        declarations: [UserPrintsComponent],
      }).compileComponents();
    })
  );

  beforeEach(() => {
    fixture = TestBed.createComponent(UserPrintsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
