import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InlineEmailNoticeComponent } from './inline-email-notice.component';

describe('InlineEmailNoticeComponent', () => {
  let fixture: ComponentFixture<InlineEmailNoticeComponent>;
  let host: HTMLElement;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [InlineEmailNoticeComponent] });
    fixture = TestBed.createComponent(InlineEmailNoticeComponent);
    fixture.detectChanges();
    host = fixture.nativeElement as HTMLElement;
  });

  it('renders the notice copy', () => {
    expect(host.textContent).toContain(
      "We'll email you a few tips while you get set up, plus a monthly recap."
    );
  });

  it('links to the email settings in a new tab', () => {
    const link = host.querySelector('a') as HTMLAnchorElement;

    expect(link.textContent?.trim()).toBe('Email settings');
    expect(link.getAttribute('href')).toBe('/settings#email');
    expect(link.target).toBe('_blank');
    expect(link.rel).toContain('noopener');
  });
});
