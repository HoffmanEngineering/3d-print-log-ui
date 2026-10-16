import { SimpleDialogData } from 'src/app/shared/simple-dialog/simple-dialog.component';
import { Clipboard } from '@angular/cdk/clipboard';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { of } from 'rxjs';
import { LoggingService } from 'src/app/core/services/logging.service';
import { PrinterCategory } from 'src/app/core/services/printer-categories.service';
import { environment } from 'src/environments/environment';
import { PrinterSpoolmanComponent } from './printer-spoolman.component';

describe('PrinterSpoolmanComponent', () => {
  let fixture: ComponentFixture<PrinterSpoolmanComponent>;
  let httpMock: HttpTestingController;
  let dialog: jasmine.SpyObj<MatDialog>;
  let dialogInstance: { title?: string; body?: string; yesText?: string };
  let confirm: boolean | undefined;
  let toastr: jasmine.SpyObj<ToastrService>;
  let logging: jasmine.SpyObj<LoggingService>;
  let clipboard: jasmine.SpyObj<Clipboard>;

  const api = environment.printLogApiUrl;
  const listUrl = `${api}/api/SpoolmanConnections`;
  const connectUrl = `${api}/api/Printers/3/spoolman-connection`;

  const fff = { nickname: 'FFF' } as PrinterCategory;
  const sla = { nickname: 'SLA' } as PrinterCategory;

  const block =
    '[spoolman]\nserver: https://printer-c2:AbC_123-xyz@api.3dprintlog.com/spoolman\n';

  const connection = (overrides: Record<string, unknown> = {}) => ({
    id: 'c1',
    printerId: 3,
    printerName: 'Voron',
    name: 'Voron',
    createdDate: '2026-10-01T12:00:00',
    lastSeenAt: null,
    state: 'active',
    disabledReason: null,
    disabledAt: null,
    revokedAt: null,
    ...overrides,
  });

  const created = (overrides: Record<string, unknown> = {}) => ({
    ...connection({ id: 'c2', createdDate: '2026-10-14T09:00:00Z' }),
    secret: 'AbC_123-xyz',
    serverUrl: 'https://printer-c2:AbC_123-xyz@api.3dprintlog.com/spoolman',
    configBlock: block,
    ...overrides,
  });

  beforeEach(async () => {
    confirm = true;
    dialogInstance = {};
    dialog = jasmine.createSpyObj<MatDialog>('MatDialog', ['open']);
    dialog.open.and.callFake(
      () =>
        ({
          componentInstance: dialogInstance,
          afterClosed: () => of(confirm),
        }) as any
    );
    toastr = jasmine.createSpyObj<ToastrService>('ToastrService', [
      'success',
      'error',
    ]);
    logging = jasmine.createSpyObj<LoggingService>('LoggingService', [
      'logEvent',
      'logException',
    ]);
    clipboard = jasmine.createSpyObj<Clipboard>('Clipboard', ['copy']);
    clipboard.copy.and.returnValue(true);

    // The real SpoolmanConnectionService, over HttpTestingController.
    await TestBed.configureTestingModule({
      imports: [PrinterSpoolmanComponent, NoopAnimationsModule],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: MatDialog, useValue: dialog },
        { provide: ToastrService, useValue: toastr },
        { provide: LoggingService, useValue: logging },
        { provide: Clipboard, useValue: clipboard },
      ],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(PrinterSpoolmanComponent);
    fixture.componentRef.setInput('printerId', 3);
    fixture.componentRef.setInput('category', fff);
  });

  afterEach(() => httpMock.verify());

  const el = () => fixture.nativeElement as HTMLElement;
  const q = (testId: string) =>
    el().querySelector<HTMLElement>(`[data-testid="${testId}"]`);
  const squash = (e: Element | null | undefined) =>
    e?.textContent?.replace(/\s+/g, ' ').trim() ?? '';

  /** Renders with GET /api/SpoolmanConnections answering `body`. */
  const render = (body: unknown[]) => {
    expect(() => fixture.detectChanges()).not.toThrow();
    httpMock.expectOne(listUrl).flush(body);
    fixture.detectChanges();
  };

  const clickConnect = () => {
    q('spoolman-connect')!.click();
    fixture.detectChanges();
  };

  it('offers Connect Spoolman on an FDM printer with no connection', () => {
    render([]);

    expect(q('spoolman-connect')).not.toBeNull();
    expect(q('spoolman-config-block')).toBeNull();
    const docs = el().querySelector('a[href="/docs/klipper-spoolman"]');
    expect(docs).not.toBeNull();
  });

  it('says in the intro that prints are logged too', () => {
    render([]);

    const intro = squash(el().querySelector('section p.hint'));
    expect(intro).toContain('log every print');
  });

  it('tells the reader to delete an old [notifier 3d_print_log] section when the block has one', () => {
    render([]);
    clickConnect();
    httpMock.expectOne(connectUrl).flush(
      created({
        configBlock: `${block}
[notifier 3d_print_log]
url: jsons://x
`,
      })
    );
    fixture.detectChanges();

    const note = squash(q('spoolman-notifier-note'));
    expect(note).toContain('[notifier 3d_print_log]');
    expect(note).toContain('delete');
    expect(squash(q('spoolman-config'))).not.toContain('only has [spoolman]');
  });

  it('says the block has only [spoolman] when printlog-bridge logs the prints', () => {
    render([]);
    clickConnect();
    httpMock.expectOne(connectUrl).flush(created());
    fixture.detectChanges();

    const note = squash(q('spoolman-notifier-note'));
    expect(note).toContain(
      "printlog-bridge logs this printer's prints, so this block has only [spoolman]."
    );
    expect(note).not.toContain('delete');
    expect(squash(q('spoolman-config'))).not.toContain(
      'If printlog-bridge is running for this printer'
    );
  });

  it('keeps the printlog-bridge hint when the block has a notifier section', () => {
    render([]);
    clickConnect();
    httpMock.expectOne(connectUrl).flush(
      created({
        configBlock: `${block}
[notifier 3d_print_log]
`,
      })
    );
    fixture.detectChanges();

    expect(squash(q('spoolman-config'))).toContain(
      'If printlog-bridge is running for this printer'
    );
  });

  it('ignores another printer’s connection and a revoked one', () => {
    render([
      connection({ id: 'x', printerId: 9 }),
      connection({ id: 'y', state: 'revoked', revokedAt: '2026-10-02T00:00' }),
    ]);

    expect(q('spoolman-connect')).not.toBeNull();
    expect(q('spoolman-status')).toBeNull();
  });

  it('renders nothing and asks for nothing on a printer that is not FDM', () => {
    fixture.componentRef.setInput('category', sla);
    fixture.detectChanges();

    httpMock.expectNone(listUrl);
    expect(el().querySelector('section')).toBeNull();
  });

  it('shows the returned [spoolman] block with the steps and a can’t-be-shown-again warning', () => {
    render([]);
    clickConnect();

    const req = httpMock.expectOne(connectUrl);
    expect(req.request.method).toBe('POST');
    req.flush(created(), { status: 201, statusText: 'Created' });
    fixture.detectChanges();

    expect(q('spoolman-config-block')!.textContent).toBe(block);
    expect(squash(q('spoolman-config'))).toContain("can't be shown again");
    expect(squash(q('spoolman-config'))).toContain('moonraker.conf');
    expect(squash(q('spoolman-config'))).toContain('Save & Restart');
    expect(logging.logEvent).toHaveBeenCalledWith(
      'PrinterSpoolman_Connected',
      jasmine.objectContaining({ reconnect: false })
    );
  });

  it('shows the block once: Done hides it for good and the list never carries it', () => {
    render([]);
    clickConnect();
    httpMock.expectOne(connectUrl).flush(created());
    fixture.detectChanges();
    expect(q('spoolman-config-block')).not.toBeNull();

    q('spoolman-config-done')!.click();
    fixture.detectChanges();

    expect(q('spoolman-config-block')).toBeNull();
    expect(el().textContent).not.toContain('AbC_123-xyz');
    // The connection itself stays, now in its connected state.
    expect(squash(q('spoolman-status'))).toBe('Never connected');

    // A fresh visit to the page reads the list, which has no secret to show.
    const again = TestBed.createComponent(PrinterSpoolmanComponent);
    again.componentRef.setInput('printerId', 3);
    again.componentRef.setInput('category', fff);
    again.detectChanges();
    httpMock.expectOne(listUrl).flush([connection({ id: 'c2' })]);
    again.detectChanges();
    const root = again.nativeElement as HTMLElement;
    expect(
      root.querySelector('[data-testid="spoolman-config-block"]')
    ).toBeNull();
    expect(root.textContent).not.toContain('AbC_123-xyz');
  });

  it('copies the exact block', () => {
    render([]);
    clickConnect();
    httpMock.expectOne(connectUrl).flush(created());
    fixture.detectChanges();

    q('spoolman-copy')!.click();

    expect(clipboard.copy).toHaveBeenCalledOnceWith(block);
    expect(toastr.success).toHaveBeenCalled();
    expect(logging.logEvent).toHaveBeenCalledWith(
      'PrinterSpoolman_Copied',
      jasmine.anything()
    );
  });

  it('shows the upgrade prompt, not a generic error, when the Free limit is reached', () => {
    render([]);
    clickConnect();
    httpMock.expectOne(connectUrl).flush(
      {
        type: 'https://tools.ietf.org/html/rfc9110#section-15.5.4',
        title: 'Spoolman connection limit reached',
        status: 403,
        detail: 'The Free plan includes 1 connected printer.',
        code: 'spoolman_connection_limit',
        limit: 1,
      },
      { status: 403, statusText: 'Forbidden' }
    );
    fixture.detectChanges();

    const prompt = q('spoolman-limit');
    expect(prompt).not.toBeNull();
    expect(squash(prompt)).toContain('Free includes 1 Spoolman printer');
    expect(prompt!.querySelector('a[href="/subscription"]')).not.toBeNull();
    expect(toastr.error).not.toHaveBeenCalled();
    expect(q('spoolman-config-block')).toBeNull();
  });

  it('shows any other failure as an error toast', () => {
    render([]);
    clickConnect();
    httpMock
      .expectOne(connectUrl)
      .flush(null, { status: 500, statusText: 'Server Error' });
    fixture.detectChanges();

    expect(toastr.error).toHaveBeenCalled();
    expect(q('spoolman-limit')).toBeNull();
  });

  it('shows a connected printer’s name and when it was last seen', () => {
    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString();
    render([connection({ name: 'Voron 2.4', lastSeenAt: twoMinutesAgo })]);

    expect(squash(q('spoolman-name'))).toBe('Voron 2.4');
    expect(squash(q('spoolman-status'))).toMatch(
      /^Connected · last seen 2 min/
    );
    expect(q('spoolman-connect')).toBeNull();
    expect(q('spoolman-reconnect')).not.toBeNull();
    expect(squash(q('spoolman-reconnect'))).toBe('Change secret');
    expect(q('spoolman-disconnect')).not.toBeNull();
  });

  it('says a connection that never connected has never connected', () => {
    render([connection()]);
    expect(squash(q('spoolman-status'))).toBe('Never connected');
  });

  it('shows a disabled connection as paused, with an upgrade link', () => {
    render([
      connection({
        state: 'disabled',
        disabledReason: 'tier',
        disabledAt: '2026-10-05T00:00:00',
      }),
    ]);

    const paused = q('spoolman-paused');
    expect(paused).not.toBeNull();
    expect(squash(paused)).toContain(
      'Paused: Free includes 1 Spoolman printer'
    );
    expect(paused!.querySelector('a[href="/subscription"]')).not.toBeNull();
    expect(q('spoolman-reconnect')).toBeNull();
    expect(q('spoolman-disconnect')).not.toBeNull();
  });

  it('changes the secret after a confirmation and shows the new block', () => {
    render([connection()]);

    q('spoolman-reconnect')!.click();
    fixture.detectChanges();

    expect(dialog.open).toHaveBeenCalledTimes(1);
    const data = dialog.open.calls.mostRecent().args[1]
      ?.data as SimpleDialogData;
    expect(data.title).toBe("Change this printer's Spoolman secret?");
    expect(data.body).toContain('Only do this if you lost the');
    expect(data.body).toContain('moonraker.log');
    expect(data.body).toContain('until you paste the new block');
    expect(data.yesText).toBe('Change secret');
    expect(data.yesColor).toBe('warn');
    expect(data.noText).toBe('Cancel');
    httpMock
      .expectOne(connectUrl)
      .flush(created({ configBlock: block.replace('AbC', 'New') }));
    fixture.detectChanges();

    expect(q('spoolman-config-block')!.textContent).toBe(
      block.replace('AbC', 'New')
    );
    expect(logging.logEvent).toHaveBeenCalledWith(
      'PrinterSpoolman_Connected',
      jasmine.objectContaining({ reconnect: true })
    );
  });

  it('does not disconnect when the confirmation is cancelled', () => {
    render([connection()]);
    confirm = false;

    q('spoolman-disconnect')!.click();
    fixture.detectChanges();

    expect(dialog.open).toHaveBeenCalledTimes(1);
    httpMock.expectNone(`${listUrl}/c1`);
    expect(q('spoolman-status')).not.toBeNull();
  });

  it('disconnects after a confirmation and refreshes', () => {
    render([connection()]);

    q('spoolman-disconnect')!.click();
    fixture.detectChanges();

    expect(dialog.open).toHaveBeenCalledTimes(1);
    expect(
      (dialog.open.calls.mostRecent().args[1]?.data as SimpleDialogData).yesText
    ).toBe('Disconnect');
    const del = httpMock.expectOne(`${listUrl}/c1`);
    expect(del.request.method).toBe('DELETE');
    del.flush(null, { status: 204, statusText: 'No Content' });
    httpMock
      .expectOne(listUrl)
      .flush([connection({ state: 'revoked', revokedAt: '2026-10-14T00:00' })]);
    fixture.detectChanges();

    expect(q('spoolman-connect')).not.toBeNull();
    expect(q('spoolman-status')).toBeNull();
    expect(logging.logEvent).toHaveBeenCalledWith(
      'PrinterSpoolman_Disconnected',
      jasmine.anything()
    );
  });

  it('tells a Snapmaker U1 owner to turn on Advanced Mode, with a link to the guide section', () => {
    fixture.componentRef.setInput('make', 'Snapmaker');
    fixture.componentRef.setInput('model', 'U1');
    render([]);

    const note = q('spoolman-u1-note');
    expect(note).not.toBeNull();
    const text = squash(note);
    expect(text).toContain('turn on Advanced Mode (Maintenance)');
    expect(text).toContain('puts back its stock config when it restarts');
    expect(text).not.toContain('waiting on a test');
    expect(text).not.toContain('printlog-bridge');
    const link = note!.querySelector('a')!;
    expect(link.getAttribute('href')).toBe('/docs/snapmaker-u1#spoolman');
  });

  it('shows no U1 note on another printer', () => {
    fixture.componentRef.setInput('make', 'Voron');
    fixture.componentRef.setInput('model', '2.4');
    render([]);
    expect(q('spoolman-u1-note')).toBeNull();
  });

  it('offers a retry, not a Connect button, when the list cannot load', () => {
    fixture.detectChanges();
    httpMock
      .expectOne(listUrl)
      .flush(null, { status: 500, statusText: 'Server Error' });
    fixture.detectChanges();

    expect(q('spoolman-connect')).toBeNull();
    q('spoolman-retry')!.click();
    httpMock.expectOne(listUrl).flush([]);
    fixture.detectChanges();
    expect(q('spoolman-connect')).not.toBeNull();
  });
});
