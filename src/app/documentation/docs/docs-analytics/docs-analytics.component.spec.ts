import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { DocsAnalyticsComponent } from './docs-analytics.component';

describe('DocsAnalyticsComponent', () => {
  let component: DocsAnalyticsComponent;
  let fixture: ComponentFixture<DocsAnalyticsComponent>;

  beforeEach(async(() => {
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
