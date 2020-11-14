import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { DocsAboutComponent } from './docs-about.component';

describe('DocsAboutComponent', () => {
  let component: DocsAboutComponent;
  let fixture: ComponentFixture<DocsAboutComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ DocsAboutComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(DocsAboutComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
