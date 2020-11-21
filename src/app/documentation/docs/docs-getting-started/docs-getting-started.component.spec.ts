import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { DocsGettingStartedComponent } from './docs-getting-started.component';

xdescribe('DocsGettingStartedComponent', () => {
  let component: DocsGettingStartedComponent;
  let fixture: ComponentFixture<DocsGettingStartedComponent>;

  beforeEach(
    waitForAsync(() => {
      TestBed.configureTestingModule({
        declarations: [DocsGettingStartedComponent],
      }).compileComponents();
    })
  );

  beforeEach(() => {
    fixture = TestBed.createComponent(DocsGettingStartedComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
