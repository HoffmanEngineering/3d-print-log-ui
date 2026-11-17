import { Routes } from '@angular/router';
import { authGuard } from '../guards/auth.guard';

// Import the route arrays under test (exported from their routing modules).
import { appRoutes } from '../../app.routes';
import { PRINT_ROUTES } from '../../print/print.routes';
import { FILAMENT_ROUTES } from '../../filament/filament.routes';
import { PRINTER_ROUTES } from '../../printer/printer.routes';

function find(routes: Routes, path: string): Routes[number] | undefined {
  return routes.find((r) => r.path === path);
}
function guarded(route?: Routes[number]): boolean {
  return !!route?.canActivate?.includes(authGuard);
}

describe('route guard matrix', () => {
  it('guards wholly-private top-level modules', () => {
    for (const path of [
      'analytics',
      'settings',
      'api-keys',
      'printer-maintenance',
      'feed',
    ]) {
      expect(guarded(find(appRoutes, path)), path).toBe(true);
    }
  });

  it('guards private list/edit children but leaves public print view open', () => {
    const printChildren = find(PRINT_ROUTES, '')?.children ?? [];
    expect(guarded(find(printChildren, '')), 'prints list').toBe(true);
    expect(guarded(find(printChildren, 'copy/:id')), 'print copy').toBe(true);
    expect(guarded(find(printChildren, ':id')), 'print view is public').toBe(
      false
    );
  });

  it('guards all filament children (detail is private)', () => {
    const children = find(FILAMENT_ROUTES, '')?.children ?? [];
    for (const path of ['', 'copy/:id', ':id']) {
      expect(guarded(find(children, path)), `filament ${path}`).toBe(true);
    }
  });

  it('guards all printer children (detail is private)', () => {
    const children = find(PRINTER_ROUTES, '')?.children ?? [];
    for (const path of ['', ':id']) {
      expect(guarded(find(children, path)), `printer ${path}`).toBe(true);
    }
  });
});
