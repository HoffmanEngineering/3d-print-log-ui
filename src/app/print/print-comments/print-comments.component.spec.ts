import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { PrintCommentsComponent } from './print-comments.component';

describe('PrintCommentsComponent', () => {
  let component: PrintCommentsComponent;
  let fixture: ComponentFixture<PrintCommentsComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ PrintCommentsComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(PrintCommentsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
