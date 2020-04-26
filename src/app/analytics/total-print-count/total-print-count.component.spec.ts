import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { TotalPrintCountComponent } from './total-print-count.component';

describe('TotalPrintCountComponent', () => {
  let component: TotalPrintCountComponent;
  let fixture: ComponentFixture<TotalPrintCountComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [TotalPrintCountComponent],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(TotalPrintCountComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
