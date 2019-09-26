import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { PrintDetailComponent } from './print-detail.component';

describe('PrintDetailComponent', () => {
  let component: PrintDetailComponent;
  let fixture: ComponentFixture<PrintDetailComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ PrintDetailComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(PrintDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
