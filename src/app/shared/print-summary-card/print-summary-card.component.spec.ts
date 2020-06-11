import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { PrintSummaryCardComponent } from './print-summary-card.component';

describe('PrintSummaryCardComponent', () => {
  let component: PrintSummaryCardComponent;
  let fixture: ComponentFixture<PrintSummaryCardComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ PrintSummaryCardComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(PrintSummaryCardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
