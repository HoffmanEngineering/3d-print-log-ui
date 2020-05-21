import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { EditPrintDetailComponent } from './edit-print-detail.component';

describe('PrintDetailComponent', () => {
  let component: EditPrintDetailComponent;
  let fixture: ComponentFixture<EditPrintDetailComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [EditPrintDetailComponent],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(EditPrintDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
