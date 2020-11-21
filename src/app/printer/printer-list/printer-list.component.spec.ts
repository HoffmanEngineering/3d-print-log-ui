import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { PrinterListComponent } from './printer-list.component';

xdescribe('PrinterListComponent', () => {
  let component: PrinterListComponent;
  let fixture: ComponentFixture<PrinterListComponent>;

  beforeEach(
    waitForAsync(() => {
      TestBed.configureTestingModule({
        declarations: [PrinterListComponent],
      }).compileComponents();
    })
  );

  beforeEach(() => {
    fixture = TestBed.createComponent(PrinterListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
