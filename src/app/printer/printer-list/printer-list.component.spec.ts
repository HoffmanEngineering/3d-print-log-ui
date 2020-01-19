import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { PrinterListComponent } from './printer-list.component';

describe('PrinterListComponent', () => {
  let component: PrinterListComponent;
  let fixture: ComponentFixture<PrinterListComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ PrinterListComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(PrinterListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
