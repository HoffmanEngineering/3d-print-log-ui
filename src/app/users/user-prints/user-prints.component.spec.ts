import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { UserPrintsComponent } from './user-prints.component';

describe('UserPrintsComponent', () => {
  let component: UserPrintsComponent;
  let fixture: ComponentFixture<UserPrintsComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ UserPrintsComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(UserPrintsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
