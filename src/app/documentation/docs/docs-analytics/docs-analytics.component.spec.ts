import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { DocsAnalyticsComponent } from './docs-analytics.component';

describe('DocsAnalyticsComponent', () => {
  let component: DocsAnalyticsComponent;
  let fixture: ComponentFixture<DocsAnalyticsComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [DocsAnalyticsComponent],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(DocsAnalyticsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('documents every tab', () => {
    const text = fixture.nativeElement.textContent as string;
    [
      'Overview',
      'Activity',
      'Printers',
      'Materials',
      'Costs',
      'Accuracy',
    ].forEach((tab) => expect(text).withContext(tab).toContain(tab));
  });

  it('explains that waste excludes partial successes', () => {
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('partial');
    expect(text.toLowerCase()).toContain('waste');
  });

  it('states that costs use current prices', () => {
    expect(
      (fixture.nativeElement.textContent as string).toLowerCase()
    ).toContain("today's prices");
  });

  it('no longer documents the retired single-metric panels', () => {
    const text = fixture.nativeElement.textContent as string;
    expect(text).not.toContain('Total Print Time Panel');
    expect(text).not.toContain('Total Filament Used Panel');
    expect(text).not.toContain('View Legend');
  });

  it('never shows a raw coverage reason code to the reader', () => {
    const text = fixture.nativeElement.textContent as string;
    [
      'CurrencyMismatch',
      'PriceMissing',
      'SampleTooSmall',
      'DurationEstimated',
    ].forEach((code) => expect(text).withContext(code).not.toContain(code));
  });
});
