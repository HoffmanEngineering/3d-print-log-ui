import type { MockedObject } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Subject, of, throwError } from 'rxjs';
import {
  PrintService,
  PrintTimelineEvent,
} from 'src/app/core/services/print.service';
import { PrintTimelineComponent } from './print-timeline.component';

describe('PrintTimelineComponent', () => {
  let fixture: ComponentFixture<PrintTimelineComponent>;
  let printService: MockedObject<PrintService>;

  const event = (fields: Partial<PrintTimelineEvent>): PrintTimelineEvent => ({
    id: 1,
    type: 'started',
    occurredAt: '2026-11-27T10:00:00Z',
    ...fields,
  });

  const render = async (events: PrintTimelineEvent[]) => {
    printService.getPrintTimeline.mockReturnValue(of(events));
    fixture.componentRef.setInput('printId', 9);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  };

  beforeEach(async () => {
    printService = {
      getPrintTimeline: vi.fn(),
    } as unknown as MockedObject<PrintService>;
    await TestBed.configureTestingModule({
      imports: [PrintTimelineComponent],
      providers: [{ provide: PrintService, useValue: printService }],
    }).compileComponents();
    fixture = TestBed.createComponent(PrintTimelineComponent);
  });

  it('labels each kind of entry', async () => {
    const el = await render([
      event({ id: 1, type: 'started', source: 'moonraker' }),
      event({
        id: 2,
        type: 'claimed',
        occurredAt: '2026-11-27T10:01:00Z',
        code: 'moonraker',
      }),
      event({
        id: 3,
        type: 'paused',
        occurredAt: '2026-11-27T10:10:00Z',
        endedAt: '2026-11-27T10:16:00Z',
      }),
      event({
        id: 4,
        type: 'failure',
        occurredAt: '2026-11-27T11:00:00Z',
        code: 'klippy_shutdown',
        message: 'Klipper shutdown',
      }),
      event({
        id: 5,
        type: 'finished',
        occurredAt: '2026-11-27T11:00:00Z',
        code: 'Failed',
      }),
    ]);

    expect(printService.getPrintTimeline).toHaveBeenCalledWith(9);
    const text = el.textContent ?? '';
    expect(text).toContain('Started');
    expect(text).toContain('Claimed by moonraker');
    expect(text).toContain('Paused for 6 min');
    expect(text).toContain('Failed: Klipper shutdown');
    expect(text).toContain('klippy_shutdown');
    expect(text).toContain('Finished: Failed');
  });

  it('says a pause still open is still going', async () => {
    const el = await render([event({ type: 'paused', endedAt: null })]);
    expect(el.textContent).toContain('Paused (still paused)');
  });

  it('spells canceled the American way', async () => {
    const el = await render([event({ type: 'finished', code: 'Cancelled' })]);
    expect(el.textContent).toContain('Finished: Canceled');
  });

  it('renders nothing when the print has no timeline', async () => {
    const el = await render([]);
    expect(el.querySelector('section')).toBeNull();
  });

  it('renders nothing when the API has no timeline', async () => {
    printService.getPrintTimeline.mockReturnValue(
      throwError(() => ({ status: 404 }))
    );
    fixture.componentRef.setInput('printId', 9);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('section')).toBeNull();
  });

  it('shows entries that arrive after the first render', async () => {
    const answer = new Subject<PrintTimelineEvent[]>();
    printService.getPrintTimeline.mockReturnValue(answer);
    fixture.componentRef.setInput('printId', 9);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    answer.next([event({ type: 'started' })]);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Started');
  });
});
