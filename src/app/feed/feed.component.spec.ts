import { NO_ERRORS_SCHEMA } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { FeedComponent } from './feed.component';

describe('FeedComponent', () => {
  it('hosts the feed list', () => {
    TestBed.configureTestingModule({
      imports: [FeedComponent],
      schemas: [NO_ERRORS_SCHEMA],
    });

    const fixture = TestBed.createComponent(FeedComponent);
    fixture.detectChanges();

    expect(
      (fixture.nativeElement as HTMLElement).querySelector('app-feed-list')
    ).not.toBeNull();
  });
});
