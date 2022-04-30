import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { DocsPrintsComponent } from './docs-prints.component';

describe('DocsPrintsComponent', () => {
  let component: DocsPrintsComponent;
  let fixture: ComponentFixture<DocsPrintsComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [DocsPrintsComponent],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(DocsPrintsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
