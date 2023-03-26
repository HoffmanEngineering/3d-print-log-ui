import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PrinterMaintenanceComponent } from './printer-maintenance.component';

xdescribe('PrinterMaintenanceComponent', () => {
  let component: PrinterMaintenanceComponent;
  let fixture: ComponentFixture<PrinterMaintenanceComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [PrinterMaintenanceComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(PrinterMaintenanceComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
