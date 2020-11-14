import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { DocsAnalyticsComponent } from './docs-analytics.component';

describe('DocsAnalyticsComponent', () => {
  let component: DocsAnalyticsComponent;
  let fixture: ComponentFixture<DocsAnalyticsComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ DocsAnalyticsComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(DocsAnalyticsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
