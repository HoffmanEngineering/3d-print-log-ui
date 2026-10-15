import {
  createEnvironmentInjector,
  EnvironmentInjector,
  Provider,
} from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { DateAdapter } from '@angular/material/core';
import { MatDialog } from '@angular/material/dialog';
import { Routes } from '@angular/router';
import { FILAMENT_ROUTES } from '../../filament/filament.routes';
import { PRINT_ROUTES } from '../../print/print.routes';
import { CuraParserService } from '../../print/services/integration/cura-parser.service';
import { PRINTER_MAINTENANCE_ROUTES } from '../../printer-maintenance/printer-maintenance.routes';

/**
 * These sections render a datepicker but provide no DateAdapter of their own;
 * it comes from the providers on their `''` route. Without them the page still
 * loads, and fails only when the datepicker opens.
 */
describe('feature route providers', () => {
  function sectionInjector(routes: Routes): EnvironmentInjector {
    const section = routes.find((route) => route.path === '');
    return createEnvironmentInjector(
      (section?.providers ?? []) as Provider[],
      TestBed.inject(EnvironmentInjector)
    );
  }

  it('the root injector has no DateAdapter, so the sections must bring one', () => {
    expect(TestBed.inject(DateAdapter, null)).toBeNull();
  });

  for (const [name, routes] of [
    ['prints', PRINT_ROUTES],
    ['materials', FILAMENT_ROUTES],
    ['printer-maintenance', PRINTER_MAINTENANCE_ROUTES],
  ] as const) {
    it(`gives ${name} a DateAdapter and a MatDialog`, () => {
      const injector = sectionInjector(routes);

      expect(injector.get(DateAdapter, null)).not.toBeNull();
      expect(injector.get(MatDialog, null)).not.toBeNull();
    });
  }

  // Not root-provided; the print detail resolver injects it.
  it('provides the Cura parser to prints', () => {
    const section = PRINT_ROUTES.find((route) => route.path === '');
    expect(section?.providers).toContain(CuraParserService);
  });
});
