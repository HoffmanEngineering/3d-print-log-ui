import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { TotalPrintCountComponent } from './total-print-count.component';

describe('TotalPrintCountComponent', () => {
  let component: TotalPrintCountComponent;
  let fixture: ComponentFixture<TotalPrintCountComponent>;

  beforeEach(
    waitForAsync(() => {
      TestBed.configureTestingModule({
        declarations: [TotalPrintCountComponent],
      }).compileComponents();
    })
  );

  beforeEach(() => {
    fixture = TestBed.createComponent(TotalPrintCountComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
