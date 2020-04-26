import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { TotalFilamentUsedComponent } from './total-filament-used.component';

describe('TotalFilamentUsedComponent', () => {
  let component: TotalFilamentUsedComponent;
  let fixture: ComponentFixture<TotalFilamentUsedComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ TotalFilamentUsedComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(TotalFilamentUsedComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
