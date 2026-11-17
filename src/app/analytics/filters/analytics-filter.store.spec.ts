import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { PrintStatus } from 'src/app/core/services/print.service';
import {
  AnalyticsFilterStore,
  resolvePresetRange,
} from './analytics-filter.store';

describe('resolvePresetRange', () => {
  const now = new Date('2026-07-15T18:30:00.000Z');

  it('makes ranges half-open so toDate is the exclusive end', () => {
    const { fromDate, toDate } = resolvePresetRange('today', now, null, null);

    // Start of today through start of tomorrow, never 23:59:59.999.
    expect(new Date(toDate!).getTime() - new Date(fromDate!).getTime()).toBe(
      86400000
    );
  });

  it('returns nulls for all-time so the API treats it as unbounded', () => {
    expect(resolvePresetRange('all', now, null, null)).toEqual({
      fromDate: null,
      toDate: null,
    });
  });

  it('spans 30 days for last30', () => {
    const { fromDate, toDate } = resolvePresetRange('last30', now, null, null);
    const days =
      (new Date(toDate!).getTime() - new Date(fromDate!).getTime()) / 86400000;
    expect(days).toBe(30);
  });

  it('uses the custom bounds and makes the end exclusive', () => {
    const { fromDate, toDate } = resolvePresetRange(
      'custom',
      now,
      new Date('2026-03-01T00:00:00'),
      new Date('2026-03-03T00:00:00')
    );

    const days =
      (new Date(toDate!).getTime() - new Date(fromDate!).getTime()) / 86400000;
    expect(days).toBe(3); // 1st, 2nd and 3rd inclusive
  });
});

describe('AnalyticsFilterStore', () => {
  let store: AnalyticsFilterStore;
  let router: Router;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [AnalyticsFilterStore, provideRouter([])],
    });
    store = TestBed.inject(AnalyticsFilterStore);
    router = TestBed.inject(Router);
  });

  it('defaults to the last 30 days', () => {
    expect(store.preset()).toBe('last30');
    expect(store.filter().fromDate).not.toBeNull();
  });

  it('reports the caller timezone so the API buckets by local days', () => {
    expect(store.filter().timeZone).toBe(
      Intl.DateTimeFormat().resolvedOptions().timeZone
    );
  });

  it('writes filter state to the URL', () => {
    const spy = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    store.setPrinterIds([3, 1]);

    expect(spy).toHaveBeenCalled();
    const params = vi.mocked(spy).mock.lastCall[1]!.queryParams as Record<
      string,
      unknown
    >;
    expect(params['printerIds']).toBe('1,3'); // deduped and sorted
  });

  it('restores state from the URL', () => {
    store.initFromUrl({
      preset: 'last7',
      printerIds: '2,5',
      statuses: `${PrintStatus.Failed}`,
      comparePrevious: 'true',
    });

    expect(store.preset()).toBe('last7');
    expect(store.printerIds()).toEqual([2, 5]);
    expect(store.statuses()).toEqual([PrintStatus.Failed]);
    expect(store.comparePrevious()).toBe(true);
  });

  it('ignores malformed URL values rather than throwing', () => {
    store.initFromUrl({ preset: 'nonsense', printerIds: 'abc,,7' });

    expect(store.preset()).toBe('last30');
    expect(store.printerIds()).toEqual([7]);
  });

  it('drops material and project ids that are not GUIDs, and statuses that do not exist', () => {
    // The API answers a malformed GUID or an unknown status with a 400, which turned a stale or
    // hand-edited link into an error page instead of an unfiltered one.
    const guid = '3f2504e0-4f89-11d3-9a0c-0305e82c3301';
    const upper = 'A1B2C3D4-E5F6-4A7B-8C9D-0E1F2A3B4C5D';

    store.initFromUrl({
      filamentIds: `${guid},not-a-guid,123`,
      projectIds: `{${guid}},${upper},${guid}x`,
      statuses: `${PrintStatus.Success},0,7,99,-1,${PrintStatus.PartialSuccess}`,
    });

    expect(store.filamentIds()).toEqual([guid]);
    expect(store.projectIds()).toEqual([upper]);
    expect(store.statuses()).toEqual([
      PrintStatus.Success,
      PrintStatus.PartialSuccess,
    ]);
  });

  it('counts active filters for the mobile chip badge, excluding the date range', () => {
    vi.spyOn(router, 'navigate').mockResolvedValue(true);

    store.setPrinterIds([1]);
    store.setStatuses([PrintStatus.Success, PrintStatus.Failed]);

    expect(store.activeChipCount()).toBe(3);
  });

  it('clearAll resets every filter but keeps the date preset', () => {
    vi.spyOn(router, 'navigate').mockResolvedValue(true);

    store.setPrinterIds([1]);
    store.setPreset('last7');

    store.clearAll();

    expect(store.printerIds()).toEqual([]);
    expect(store.preset()).toBe('last7');
  });
});
