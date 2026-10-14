import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import {
  FeedService,
  PrintFeedSummary,
} from 'src/app/core/services/feed.service';

import { PrintSummaryCardComponent } from 'src/app/shared/print-summary-card/print-summary-card.component';
import { FeedListComponent } from './feed-list.component';

describe('FeedListComponent', () => {
  let fixture: ComponentFixture<FeedListComponent>;
  let component: FeedListComponent;
  let feedService: jasmine.SpyObj<FeedService>;

  const item = (id: number, createdDate: string) =>
    ({
      id,
      createdDate: new Date(createdDate),
      createdBy: { id: 1, displayName: 'Ada', profilePicture: '' },
    }) as unknown as PrintFeedSummary;

  const text = () => (fixture.nativeElement as HTMLElement).textContent;

  beforeEach(() => {
    feedService = jasmine.createSpyObj<FeedService>('FeedService', ['GetFeed']);
    feedService.GetFeed.and.returnValue(
      of([item(1, '2026-10-03T00:00:00Z'), item(2, '2026-10-02T00:00:00Z')])
    );
    TestBed.configureTestingModule({
      imports: [FeedListComponent],
      providers: [{ provide: FeedService, useValue: feedService }],
    }).overrideComponent(FeedListComponent, {
      remove: { imports: [PrintSummaryCardComponent] },
      add: { schemas: [NO_ERRORS_SCHEMA] },
    });
    fixture = TestBed.createComponent(FeedListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('loads the newest prints on arrival', () => {
    expect(feedService.GetFeed).toHaveBeenCalledTimes(1);
    expect(component.feed().map((p) => p.id)).toEqual([1, 2]);
    expect(component.loading()).toBeFalse();
  });

  it('continues from the oldest print shown', () => {
    feedService.GetFeed.and.returnValue(of([item(3, '2026-10-01T00:00:00Z')]));

    component.loadMore();

    expect(feedService.GetFeed).toHaveBeenCalledWith(
      new Date('2026-10-02T00:00:00Z')
    );
    expect(component.feed().map((p) => p.id)).toEqual([1, 2, 3]);
  });

  it('says so when there is nothing older', () => {
    feedService.GetFeed.and.returnValue(of([]));

    component.loadMore();
    fixture.detectChanges();

    expect(component.hasMore()).toBeFalse();
    expect(text()).toContain("You're all caught up!");
  });

  it('stops asking for more once the end is reached', () => {
    component.hasMore.set(false);

    component.onScroll();

    expect(feedService.GetFeed).toHaveBeenCalledTimes(1);
  });
});
