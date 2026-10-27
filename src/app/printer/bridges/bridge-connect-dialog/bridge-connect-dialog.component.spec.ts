import { Clipboard } from '@angular/cdk/clipboard';
import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  MAT_DIALOG_DATA,
  MatDialog,
  MatDialogRef,
} from '@angular/material/dialog';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { of, throwError } from 'rxjs';
import { BridgesService } from 'src/app/core/services/bridges.service';
import { LoggingService } from 'src/app/core/services/logging.service';
import { PrinterCatalogService } from 'src/app/core/services/printer-catalog.service';
import {
  PrinterDetail,
  PrinterService,
  PrinterSummarySimple,
} from 'src/app/core/services/printer.service';
import {
  OTHER_BRIDGE_KEY,
  TEST_BRIDGE_KEY,
  bridge,
  bridgePrinter,
  discovered,
} from '../testing/bridge-fixtures';
import {
  BridgeConnectDialogComponent,
  BridgeConnectDialogData,
} from './bridge-connect-dialog.component';

describe('BridgeConnectDialogComponent', () => {
  let bridges: jasmine.SpyObj<BridgesService>;
  let printers: jasmine.SpyObj<PrinterService>;
  let catalog: jasmine.SpyObj<PrinterCatalogService>;
  let dialog: jasmine.SpyObj<MatDialog>;
  let dialogRef: jasmine.SpyObj<MatDialogRef<BridgeConnectDialogComponent>>;
  let toastr: jasmine.SpyObj<ToastrService>;
  let logging: jasmine.SpyObj<LoggingService>;
  let fixture: ComponentFixture<BridgeConnectDialogComponent>;

  const garage = bridge();
  const attic = bridge({
    id: 9,
    name: 'Attic Pi',
    displayName: 'Attic Pi',
  });

  function summary(
    id: number,
    name: string,
    catalogModelId: string | null = null
  ): PrinterSummarySimple {
    return {
      id,
      name,
      make: 'Bambu Lab',
      model: name,
      isActive: true,
      catalogModelId,
      category: { id: 1, name: 'FDM', nickname: 'FDM' },
      loadedFilaments: [],
    } as unknown as PrinterSummarySimple;
  }

  async function create(data: Partial<BridgeConnectDialogData> = {}) {
    await TestBed.configureTestingModule({
      imports: [BridgeConnectDialogComponent, NoopAnimationsModule],
      providers: [
        provideRouter([]),
        { provide: BridgesService, useValue: bridges },
        { provide: PrinterService, useValue: printers },
        { provide: PrinterCatalogService, useValue: catalog },
        { provide: MatDialog, useValue: dialog },
        { provide: MatDialogRef, useValue: dialogRef },
        { provide: ToastrService, useValue: toastr },
        { provide: LoggingService, useValue: logging },
        {
          provide: Clipboard,
          useValue: { copy: jasmine.createSpy('copy').and.returnValue(true) },
        },
        {
          provide: MAT_DIALOG_DATA,
          useValue: {
            bridge: garage,
            discovered: discovered(),
            bridges: [garage, attic],
            watchedBy: new Map<number, number>([[3, 9]]),
            ...data,
          } satisfies BridgeConnectDialogData,
        },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(BridgeConnectDialogComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  function el(): HTMLElement {
    return fixture.nativeElement as HTMLElement;
  }

  function byTestId(id: string): HTMLElement | null {
    return el().querySelector(`[data-testid="${id}"]`);
  }

  function component() {
    return fixture.componentInstance;
  }

  function submit(): void {
    byTestId('connect-submit')!.click();
    fixture.detectChanges();
  }

  beforeEach(() => {
    bridges = jasmine.createSpyObj<BridgesService>('BridgesService', [
      'connect',
      'get',
      'setSecret',
      'clearSecret',
    ]);
    printers = jasmine.createSpyObj<PrinterService>('PrinterService', [
      'getCurrentUserPrinterSummaries',
    ]);
    printers.getCurrentUserPrinterSummaries.and.returnValue(
      of({
        items: [
          summary(3, 'A1 mini'),
          summary(5, 'X1C', 'bambu-lab-x1-carbon'),
          summary(6, 'Ender'),
        ],
        totalCount: 3,
      } as never)
    );
    catalog = jasmine.createSpyObj<PrinterCatalogService>(
      'PrinterCatalogService',
      ['match']
    );
    catalog.match.and.returnValue(
      of({ id: 'bambu-lab-x1-carbon', confidence: 'high' })
    );
    dialog = jasmine.createSpyObj<MatDialog>('MatDialog', ['open']);
    dialogRef = jasmine.createSpyObj('MatDialogRef', ['close']);
    toastr = jasmine.createSpyObj<ToastrService>('ToastrService', [
      'success',
      'error',
    ]);
    logging = jasmine.createSpyObj<LoggingService>('LoggingService', [
      'logEvent',
      'logException',
    ]);
  });

  it('lists printers no bridge watches first, and names the bridge of the others', async () => {
    await create();
    const options = component()['printerOptions']();
    expect(options.map((o) => o.id)).toEqual([6, 5, 3]);
    expect(options[2].watchedBy).toBe('Attic Pi');
  });

  it('preselects the one free printer of the model the bridge found', async () => {
    await create();
    expect(catalog.match).toHaveBeenCalledWith('X1 Carbon');
    expect(component().form.controls.printerId.value).toBe(5);
  });

  /** WebCrypto's promises aren't tracked by Angular: render until the condition holds. */
  async function until(condition: () => boolean): Promise<void> {
    for (let i = 0; i < 100; i++) {
      fixture.detectChanges();
      if (condition()) {
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, 5));
    }
    fail('timed out');
  }

  it('connects a discovered Bambu Lab printer, then asks for its access code sealed to the bridge', async () => {
    bridges.connect.and.returnValue(of(bridgePrinter({ id: 7 })));
    await create();
    submit();

    expect(bridges.connect).toHaveBeenCalledWith(42, {
      printerId: 5,
      discoveredPrinterId: 12,
    });
    expect(el().querySelector('h2')!.textContent).toContain('access code');
    await until(() => !!byTestId('credential-access_code'));
    expect(byTestId('credentials-fingerprint')!.textContent).toContain(
      TEST_BRIDGE_KEY.short
    );
    expect(byTestId('connect-snippet')).toBeNull();
    expect(dialogRef.close).not.toHaveBeenCalled();

    byTestId('connect-finish')!.click();
    expect(dialogRef.close).toHaveBeenCalledWith(
      jasmine.objectContaining({ id: 7 })
    );
  });

  it('shows the config-file section for a bridge without a key', async () => {
    bridges.connect.and.returnValue(of(bridgePrinter({ id: 7 })));
    await create({ bridge: bridge({ publicKey: null }) });
    submit();
    await until(() => !!byTestId('credentials-snippet'));
    expect(byTestId('credentials-snippet')!.textContent).toContain(
      '[app_printer 7]'
    );
  });

  it('reads the bridge again when its key changed under a credential', async () => {
    const entry = bridgePrinter({ id: 7 });
    bridges.connect.and.returnValue(of(entry));
    bridges.get.and.returnValue(
      of(bridge({ publicKey: OTHER_BRIDGE_KEY.publicKey }))
    );
    bridges.setSecret.and.returnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 409,
            error: { code: 'bridge_key_changed' },
          })
      )
    );
    await create();
    submit();
    await until(() => !!byTestId('credential-access_code'));
    const input = el().querySelector(
      '[data-testid="credential-input"]'
    ) as HTMLInputElement;
    input.value = '12345678';
    input.dispatchEvent(new Event('input'));
    byTestId('credential-save')!.click();
    await until(() => bridges.get.calls.count() === 1);
    await until(
      () =>
        !!byTestId('credentials-fingerprint')?.textContent?.includes(
          OTHER_BRIDGE_KEY.short
        )
    );
    expect(bridges.get).toHaveBeenCalledWith(42);
  });

  it('connects through an older API that lists no fields and shows its [app_printer] section', async () => {
    bridges.connect.and.returnValue(
      of(bridgePrinter({ id: 7, secretFields: undefined, secrets: undefined }))
    );
    await create();
    submit();

    expect(bridges.connect).toHaveBeenCalledWith(42, {
      printerId: 5,
      discoveredPrinterId: 12,
    });
    expect(byTestId('connect-snippet')!.textContent).toContain(
      '[app_printer 7]'
    );
    expect(byTestId('connect-snippet')!.textContent).toContain('access_code');
    expect(dialogRef.close).not.toHaveBeenCalled();

    byTestId('connect-finish')!.click();
    expect(dialogRef.close).toHaveBeenCalledWith(
      jasmine.objectContaining({ id: 7 })
    );
  });

  it('closes right away for a Moonraker printer, which needs no credential', async () => {
    const entry = bridgePrinter({
      kind: 'moonraker',
      id: 8,
      secretFields: ['moonraker_api_key'],
    });
    bridges.connect.and.returnValue(of(entry));
    await create({
      discovered: discovered({ kind: 'moonraker', model: 'Voron 2.4' }),
    });
    component().form.controls.printerId.setValue(6);
    submit();

    expect(dialogRef.close).toHaveBeenCalledWith(entry);
    expect(toastr.success).toHaveBeenCalled();
  });

  it('names the other bridge when the printer is watched elsewhere', async () => {
    bridges.connect.and.returnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 409,
            error: { code: 'printer_connected_elsewhere', bridgeId: 9 },
          })
      )
    );
    await create();
    submit();

    expect(byTestId('connect-error')!.textContent).toContain('Attic Pi');
    expect(logging.logEvent).toHaveBeenCalledWith('BridgeConnect_Failed', {
      code: 'printer_connected_elsewhere',
    });
  });

  it('adds a Bambu Lab printer by address only with its serial', async () => {
    bridges.connect.and.returnValue(of(bridgePrinter()));
    await create({ discovered: null });
    const form = component().form;
    form.patchValue({
      kind: 'bambu',
      host: ' 192.168.1.61 ',
      port: null,
      printerId: 6,
    });
    fixture.detectChanges();
    submit();
    expect(bridges.connect).not.toHaveBeenCalled();
    expect(byTestId('connect-serial-required')).not.toBeNull();

    form.controls.serial.setValue('01P00A999');
    submit();
    expect(bridges.connect).toHaveBeenCalledWith(42, {
      printerId: 6,
      kind: 'bambu',
      host: '192.168.1.61',
      serial: '01P00A999',
    });
  });

  it('sends the port of a printer added by address', async () => {
    bridges.connect.and.returnValue(
      of(
        bridgePrinter({
          kind: 'prusalink',
          id: 4,
          secretFields: ['password', 'username', 'api_key'],
        })
      )
    );
    await create({ discovered: null });
    component().form.patchValue({
      kind: 'prusalink',
      host: 'mk4.local',
      port: 8080,
      printerId: 6,
    });
    submit();
    expect(bridges.connect).toHaveBeenCalledWith(42, {
      printerId: 6,
      kind: 'prusalink',
      host: 'mk4.local',
      port: 8080,
    });
    expect(el().querySelector('h2')!.textContent).toContain('credentials');
    await until(() => !!byTestId('credential-password'));
  });

  it('creates a new printer from the catalog match and selects it', async () => {
    dialog.open.and.returnValue({
      afterClosed: () =>
        of({
          id: 77,
          name: 'Workshop X1C',
          make: 'Bambu Lab',
        } as PrinterDetail),
    } as never);
    await create();
    byTestId('connect-new-printer')!.click();

    const config = dialog.open.calls.mostRecent().args[1] as {
      data: Record<string, unknown>;
    };
    expect(config.data).toEqual(
      jasmine.objectContaining({
        source: 'bridges',
        initialModelId: 'bambu-lab-x1-carbon',
        initialName: 'Workshop X1C',
      })
    );
    expect(component().form.controls.printerId.value).toBe(77);
    expect(component()['printerOptions']()[0].id).toBe(77);
  });

  it('still offers a new printer when the printer list fails', async () => {
    printers.getCurrentUserPrinterSummaries.and.returnValue(
      throwError(() => new Error('down'))
    );
    await create();
    expect(component()['printersPhase']()).toBe('error');
    expect(byTestId('connect-new-printer')).not.toBeNull();
  });
});
