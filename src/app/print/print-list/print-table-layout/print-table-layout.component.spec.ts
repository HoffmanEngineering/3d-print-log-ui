import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PrintTableLayoutComponent } from './print-table-layout.component';

xdescribe('PrintTableLayoutComponent', () => {
  let component: PrintTableLayoutComponent;
  let fixture: ComponentFixture<PrintTableLayoutComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [PrintTableLayoutComponent],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(PrintTableLayoutComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
