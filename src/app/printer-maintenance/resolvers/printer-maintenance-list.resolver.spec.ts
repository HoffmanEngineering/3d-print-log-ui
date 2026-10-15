import { TestBed } from '@angular/core/testing';
import {
  PrinterMaintenanceService,
  PrinterMaintenanceSortColumn,
} from 'src/app/core/services/printer-maintenance.service';
import { SortDirection } from 'src/app/core/types/sort-request';
import {
  routeSnapshot,
  runResolver,
} from 'src/app/core/resolvers/testing/run-resolver';
import { printerMaintenanceListResolver } from './printer-maintenance-list.resolver';

describe('printerMaintenanceListResolver', () => {
  let maintenance: jasmine.SpyObj<PrinterMaintenanceService>;

  beforeEach(() => {
    localStorage.removeItem('printer_maintenance_list_page_size');
    maintenance = jasmine.createSpyObj<PrinterMaintenanceService>(
      'PrinterMaintenanceService',
      ['getCurrentUserPrinterMaintenance']
    );
    TestBed.configureTestingModule({
      providers: [
        { provide: PrinterMaintenanceService, useValue: maintenance },
      ],
    });
  });

  afterEach(() =>
    localStorage.removeItem('printer_maintenance_list_page_size')
  );

  it('requests the first page of all entries, newest first, by default', () => {
    runResolver(printerMaintenanceListResolver);

    expect(
      maintenance.getCurrentUserPrinterMaintenance
    ).toHaveBeenCalledOnceWith(
      1,
      10,
      '',
      [],
      true,
      true,
      SortDirection.Desc,
      PrinterMaintenanceSortColumn.Date
    );
  });

  it('forwards the paging, search and printer filters from the URL', () => {
    localStorage.setItem('printer_maintenance_list_page_size', '25');

    runResolver(
      printerMaintenanceListResolver,
      routeSnapshot({
        queryParams: {
          pageNumber: '2',
          searchText: 'nozzle',
          filterByPrinterId: ['4', '9'],
        },
      })
    );

    const args =
      maintenance.getCurrentUserPrinterMaintenance.calls.mostRecent().args;
    expect(args.slice(0, 4)).toEqual(['2', 25, 'nozzle', [4, 9]]);
  });
});
