import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { PrintImageComponent } from './print-image.component';

describe('PrintImageComponent', () => {
  let component: PrintImageComponent;
  let fixture: ComponentFixture<PrintImageComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ PrintImageComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(PrintImageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
