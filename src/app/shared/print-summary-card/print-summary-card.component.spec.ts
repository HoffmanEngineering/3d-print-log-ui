import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { PrintSummaryCardComponent } from './print-summary-card.component';

xdescribe('PrintSummaryCardComponent', () => {
  let component: PrintSummaryCardComponent;
  let fixture: ComponentFixture<PrintSummaryCardComponent>;

  beforeEach(
    waitForAsync(() => {
      TestBed.configureTestingModule({
        declarations: [PrintSummaryCardComponent],
      }).compileComponents();
    })
  );

  beforeEach(() => {
    fixture = TestBed.createComponent(PrintSummaryCardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
