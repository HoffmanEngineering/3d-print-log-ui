import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, ParamMap } from '@angular/router';
import { BehaviorSubject, of } from 'rxjs';
import { LoggingService } from 'src/app/core/services/logging.service';
import {
  PrintService,
  PrintSummary,
} from 'src/app/core/services/print.service';
import { PagedList } from 'src/app/core/types/paging';

import { UserPrintsComponent } from './user-prints.component';

describe('UserPrintsComponent', () => {
  let fixture: ComponentFixture<UserPrintsComponent>;
  let component: UserPrintsComponent;
  let printService: jasmine.SpyObj<PrintService>;
  let queryParams: BehaviorSubject<ParamMap>;

  const cards = () =>
    (fixture.nativeElement as HTMLElement).querySelectorAll(
      'app-print-summary-card'
    ).length;
  const loadMore = () =>
    Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('button')
    ).find((b) => b.textContent!.includes('Load More'));

  const page = (currentPage: number, totalPages: number, ids: number[]) =>
    of({
      items: ids.map((id) => ({ id }) as PrintSummary),
      paging: { currentPage, totalPages },
    } as unknown as PagedList<PrintSummary>);

  beforeEach(() => {
    printService = jasmine.createSpyObj<PrintService>('PrintService', [
      'getPrintSummaries',
    ]);
    printService.getPrintSummaries.and.returnValue(page(1, 2, [1, 2]));
    queryParams = new BehaviorSubject(convertToParamMap({}));

    TestBed.configureTestingModule({
      imports: [UserPrintsComponent],
      providers: [
        { provide: PrintService, useValue: printService },
        { provide: ActivatedRoute, useValue: { queryParamMap: queryParams } },
        {
          provide: LoggingService,
          useValue: jasmine.createSpyObj('LoggingService', ['logEvent']),
        },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    });
    fixture = TestBed.createComponent(UserPrintsComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('userId', 7);
    fixture.detectChanges();
  });

  it("loads the first page of the user's prints", () => {
    expect(printService.getPrintSummaries).toHaveBeenCalledOnceWith(
      1,
      10,
      '',
      null,
      [],
      [],
      undefined,
      undefined,
      7
    );
    expect(component.prints().map((p) => p.id)).toEqual([1, 2]);
    expect(component.showLoadMore()).toBeTrue();
  });

  it('appends the next page and hides Load more after the last one', async () => {
    printService.getPrintSummaries.and.returnValue(page(2, 2, [3]));

    await component.loadNextPage();

    expect(printService.getPrintSummaries.calls.mostRecent().args[0]).toBe(2);
    expect(component.prints().map((p) => p.id)).toEqual([1, 2, 3]);
    expect(component.showLoadMore()).toBeFalse();
  });

  it('starts over from the first page when the search in the URL changes', () => {
    printService.getPrintSummaries.and.returnValue(page(1, 1, [9]));

    queryParams.next(convertToParamMap({ searchText: 'benchy' }));

    const args = printService.getPrintSummaries.calls.mostRecent().args;
    expect(args[0]).toBe(1);
    expect(args[2]).toBe('benchy');
    expect(component.prints().map((p) => p.id)).toEqual([9]);
  });

  it('clears the search and reloads when switched to another user', () => {
    component.searchText.set('benchy');
    printService.getPrintSummaries.and.returnValue(page(1, 1, [4]));

    fixture.componentRef.setInput('userId', 8);
    fixture.detectChanges();

    const args = printService.getPrintSummaries.calls.mostRecent().args;
    expect(args[2]).toBe('');
    expect(args[8]).toBe(8);
    expect(component.prints().map((p) => p.id)).toEqual([4]);
  });

  describe('the rendered list', () => {
    it('shows each print with a Load More button', () => {
      expect(cards()).toBe(2);
      expect(loadMore()).toBeDefined();
    });

    it('shows the next page and drops Load More after the last one', async () => {
      printService.getPrintSummaries.and.returnValue(page(2, 2, [3]));

      await component.loadNextPage();
      fixture.detectChanges();

      expect(cards()).toBe(3);
      expect(loadMore()).toBeUndefined();
    });

    it('shows the new results when the search in the URL changes', () => {
      printService.getPrintSummaries.and.returnValue(page(1, 1, [9]));

      queryParams.next(convertToParamMap({ searchText: 'benchy' }));
      fixture.detectChanges();

      expect(cards()).toBe(1);
    });
  });
});
