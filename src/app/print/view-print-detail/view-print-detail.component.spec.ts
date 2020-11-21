import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { ViewPrintDetailComponent } from './view-print-detail.component';

xdescribe('ViewPrintDetailComponent', () => {
  let component: ViewPrintDetailComponent;
  let fixture: ComponentFixture<ViewPrintDetailComponent>;

  beforeEach(
    waitForAsync(() => {
      TestBed.configureTestingModule({
        declarations: [ViewPrintDetailComponent],
      }).compileComponents();
    })
  );

  beforeEach(() => {
    fixture = TestBed.createComponent(ViewPrintDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
