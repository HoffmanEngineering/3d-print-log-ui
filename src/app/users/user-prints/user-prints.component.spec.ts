import type { MockedObject } from 'vitest';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NgModel } from '@angular/forms';
import { MatSelect } from '@angular/material/select';
import { By } from '@angular/platform-browser';
import { ActivatedRoute, convertToParamMap, ParamMap } from '@angular/router';
import { BehaviorSubject, of } from 'rxjs';
import { LoggingService } from 'src/app/core/services/logging.service';
import {
  PrintService,
  PrintStatus,
  PrintSummary,
} from 'src/app/core/services/print.service';
import { PagedList } from 'src/app/core/types/paging';

import { UserPrintsComponent } from './user-prints.component';

describe('UserPrintsComponent', () => {
  let fixture: ComponentFixture<UserPrintsComponent>;
  let component: UserPrintsComponent;
  let printService: MockedObject<PrintService>;
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
    printService = {
      getPrintSummaries: vi.fn().mockName('PrintService.getPrintSummaries'),
    } as unknown as MockedObject<PrintService>;
    printService.getPrintSummaries.mockReturnValue(page(1, 2, [1, 2]));
    queryParams = new BehaviorSubject(convertToParamMap({}));

    TestBed.configureTestingModule({
      imports: [UserPrintsComponent],
      providers: [
        { provide: PrintService, useValue: printService },
        { provide: ActivatedRoute, useValue: { queryParamMap: queryParams } },
        {
          provide: LoggingService,
          useValue: {
            logEvent: vi.fn().mockName('LoggingService.logEvent'),
          },
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
    expect(printService.getPrintSummaries).toHaveBeenCalledTimes(1);
    expect(printService.getPrintSummaries).toHaveBeenCalledWith(
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
    expect(component.showLoadMore()).toBe(true);
  });

  it('appends the next page and hides Load more after the last one', async () => {
    printService.getPrintSummaries.mockReturnValue(page(2, 2, [3]));

    await component.loadNextPage();

    expect(vi.mocked(printService.getPrintSummaries).mock.lastCall[0]).toBe(2);
    expect(component.prints().map((p) => p.id)).toEqual([1, 2, 3]);
    expect(component.showLoadMore()).toBe(false);
  });

  it('starts over from the first page when the search in the URL changes', () => {
    printService.getPrintSummaries.mockReturnValue(page(1, 1, [9]));

    queryParams.next(convertToParamMap({ searchText: 'benchy' }));

    const args = vi.mocked(printService.getPrintSummaries).mock.lastCall;
    expect(args[0]).toBe(1);
    expect(args[2]).toBe('benchy');
    expect(component.prints().map((p) => p.id)).toEqual([9]);
  });

  it('keeps the search from the URL on first load', () => {
    queryParams.next(convertToParamMap({ searchText: 'benchy' }));
    printService.getPrintSummaries.mockClear();
    const opened = TestBed.createComponent(UserPrintsComponent);
    opened.componentRef.setInput('userId', 7);
    opened.detectChanges();

    expect(opened.componentInstance.searchText()).toBe('benchy');
    const args = vi.mocked(printService.getPrintSummaries).mock.lastCall;
    expect(args[2]).toBe('benchy');
    expect(args[8]).toBe(7);
  });

  it('clears the search and reloads when switched to another user', () => {
    component.searchText.set('benchy');
    printService.getPrintSummaries.mockReturnValue(page(1, 1, [4]));

    fixture.componentRef.setInput('userId', 8);
    fixture.detectChanges();

    const args = vi.mocked(printService.getPrintSummaries).mock.lastCall;
    expect(args[2]).toBe('');
    expect(args[8]).toBe(8);
    expect(component.prints().map((p) => p.id)).toEqual([4]);
  });

  describe('after Load More', () => {
    // Mimics the API: echoes the requested page and never clamps it
    // (PagedList.CreateAsync). 25 prints in all, 12 of them Failed.
    beforeEach(() => {
      printService.getPrintSummaries.mockImplementation(((
        pageNumber: number,
        size: number,
        search: string,
        status: PrintStatus | null
      ) => {
        const total = status === PrintStatus.Failed ? 12 : 25;
        const ids = Array.from({ length: total }, (_, i) => i + 1).slice(
          (pageNumber - 1) * size,
          pageNumber * size
        );
        return page(pageNumber, Math.ceil(total / size), ids);
      }) as never);
    });

    it('starts from the first page when a Status is chosen', async () => {
      await component.loadNextPage();
      await component.loadNextPage();
      fixture.detectChanges();
      expect(component.pageNumber).toBe(3);

      // Through the template's (ngModelChange), as a user's pick does.
      fixture.debugElement
        .query(By.directive(MatSelect))
        .injector.get(NgModel)
        .viewToModelUpdate(PrintStatus.Failed);
      await fixture.whenStable();
      fixture.detectChanges();

      const args = vi.mocked(printService.getPrintSummaries).mock.lastCall!;
      expect(args[3]).toBe(PrintStatus.Failed);
      expect(args[0]).toBe(1);
      expect(cards()).toBe(10);
    });

    it('starts from the first page for another user', async () => {
      await component.loadNextPage();

      fixture.componentRef.setInput('userId', 8);
      fixture.detectChanges();

      const args = vi.mocked(printService.getPrintSummaries).mock.lastCall!;
      expect(args[8]).toBe(8);
      expect(args[0]).toBe(1);
    });
  });

  it('reloads unfiltered when the search is cleared from the URL', () => {
    queryParams.next(convertToParamMap({ searchText: 'benchy' }));
    fixture.detectChanges();
    printService.getPrintSummaries.mockClear();
    printService.getPrintSummaries.mockReturnValue(page(1, 1, [5]));

    // An emptied box sets searchText to '' and navigates the param away.
    component.searchText.set('');
    queryParams.next(convertToParamMap({}));
    fixture.detectChanges();

    expect(printService.getPrintSummaries).toHaveBeenCalledTimes(1);
    const args = vi.mocked(printService.getPrintSummaries).mock.lastCall!;
    expect(args[0]).toBe(1);
    expect(args[2]).toBe('');
    expect(component.prints().map((p) => p.id)).toEqual([5]);
  });

  describe('the rendered list', () => {
    it('shows each print with a Load More button', () => {
      expect(cards()).toBe(2);
      expect(loadMore()).toBeDefined();
    });

    it('shows the next page and drops Load More after the last one', async () => {
      printService.getPrintSummaries.mockReturnValue(page(2, 2, [3]));

      await component.loadNextPage();
      fixture.detectChanges();

      expect(cards()).toBe(3);
      expect(loadMore()).toBeUndefined();
    });

    it('shows the new results when the search in the URL changes', () => {
      printService.getPrintSummaries.mockReturnValue(page(1, 1, [9]));

      queryParams.next(convertToParamMap({ searchText: 'benchy' }));
      fixture.detectChanges();

      expect(cards()).toBe(1);
    });
  });
});
