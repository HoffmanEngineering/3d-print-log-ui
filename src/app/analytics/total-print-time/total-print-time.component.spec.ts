import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { TotalPrintTimeComponent } from './total-print-time.component';

describe('TotalPrintTimeComponent', () => {
  let component: TotalPrintTimeComponent;
  let fixture: ComponentFixture<TotalPrintTimeComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ TotalPrintTimeComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(TotalPrintTimeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
