import { TestBed } from '@angular/core/testing';
import { MAT_DATE_LOCALE, NativeDateAdapter } from '@angular/material/core';
import { CivilDateAdapter } from './civil-date-adapter';

describe('CivilDateAdapter', () => {
  let adapter: CivilDateAdapter;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        CivilDateAdapter,
        { provide: MAT_DATE_LOCALE, useValue: 'en-US' },
      ],
    });
    adapter = TestBed.inject(CivilDateAdapter);
  });

  it('parses a typed YYYY-MM-DD as a local calendar day', () => {
    const parsed = adapter.parse('2026-02-01')!;

    expect(parsed.getFullYear()).toBe(2026);
    expect(parsed.getMonth()).toBe(1);
    expect(parsed.getDate()).toBe(1);
  });

  it('does not lose a day the way the base adapter does west of UTC', () => {
    // The base adapter routes through Date.parse, which reads a bare ISO date as UTC
    // midnight. In any negative offset its local date is the PREVIOUS day.
    const base = TestBed.runInInjectionContext(() => new NativeDateAdapter());
    const viaBase = base.parse('2026-02-01', null) as Date;
    const viaCivil = adapter.parse('2026-02-01')!;

    expect(viaCivil.getDate()).toBe(1);
    if (viaCivil.getTimezoneOffset() > 0) {
      // West of UTC the two disagree, which is the whole reason this adapter exists.
      expect(viaBase.getDate()).not.toBe(viaCivil.getDate());
    }
  });

  it('still accepts a locale-formatted date through the base adapter', () => {
    const parsed = adapter.parse('2/1/2026') as Date;

    expect(parsed).toBeTruthy();
    expect(parsed.getFullYear()).toBe(2026);
    expect(parsed.getMonth()).toBe(1);
    expect(parsed.getDate()).toBe(1);
  });

  it('rejects an impossible civil date instead of rolling it forward', () => {
    // Date.parse('2026-02-30') does NOT fail — it rolls forward to March 2. So the adapter
    // has to reject civil-shaped-but-unreal input itself rather than delegating.
    const parsed = adapter.parse('2026-02-30') as Date;

    expect(Number.isNaN(parsed.getTime()))
      .withContext('2026-02-30 must be invalid, not March 2')
      .toBeTrue();
    expect(
      Number.isNaN((adapter.parse('2026-13-01') as Date).getTime())
    ).toBeTrue();
  });

  it('passes through null and empty input', () => {
    expect(adapter.parse('')).toBeNull();
    expect(adapter.parse(null)).toBeNull();
  });
});
