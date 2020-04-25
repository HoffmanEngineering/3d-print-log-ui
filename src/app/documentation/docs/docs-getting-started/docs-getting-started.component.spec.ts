import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { DocsGettingStartedComponent } from './docs-getting-started.component';

describe('DocsGettingStartedComponent', () => {
  let component: DocsGettingStartedComponent;
  let fixture: ComponentFixture<DocsGettingStartedComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ DocsGettingStartedComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(DocsGettingStartedComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
