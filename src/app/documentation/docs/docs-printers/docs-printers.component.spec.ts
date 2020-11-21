import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { DocsPrintersComponent } from './docs-printers.component';

describe('DocsPrintersComponent', () => {
  let component: DocsPrintersComponent;
  let fixture: ComponentFixture<DocsPrintersComponent>;

  beforeEach(
    waitForAsync(() => {
      TestBed.configureTestingModule({
        declarations: [DocsPrintersComponent],
      }).compileComponents();
    })
  );

  beforeEach(() => {
    fixture = TestBed.createComponent(DocsPrintersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
