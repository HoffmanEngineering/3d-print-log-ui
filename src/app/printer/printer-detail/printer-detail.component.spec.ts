import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { PrinterDetailComponent } from './printer-detail.component';

xdescribe('PrinterDetailComponent', () => {
  let component: PrinterDetailComponent;
  let fixture: ComponentFixture<PrinterDetailComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [PrinterDetailComponent],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(PrinterDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
