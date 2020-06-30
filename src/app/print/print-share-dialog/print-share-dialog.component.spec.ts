import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { PrintShareDialogComponent } from './print-share-dialog.component';

xdescribe('PrintShareDialogComponent', () => {
  let component: PrintShareDialogComponent;
  let fixture: ComponentFixture<PrintShareDialogComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [PrintShareDialogComponent],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(PrintShareDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
