import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { PrintsByStatusComponent } from './prints-by-status.component';

describe('PrintsByStatusComponent', () => {
  let component: PrintsByStatusComponent;
  let fixture: ComponentFixture<PrintsByStatusComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ PrintsByStatusComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(PrintsByStatusComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
