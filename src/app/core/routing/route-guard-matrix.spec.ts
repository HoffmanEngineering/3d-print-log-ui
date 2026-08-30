import { Routes } from '@angular/router';
import { AuthGuard } from '../guards/auth.guard';

// Import the route arrays under test (exported from their routing modules).
import { appRoutes } from '../../app-routing.module';
import { printRoutes } from '../../print/print-routing.module';
import { filamentRoutes } from '../../filament/filament-routing.module';
import { printerRoutes } from '../../printer/printer-routing.module';

function find(routes: Routes, path: string): Routes[number] | undefined {
  return routes.find((r) => r.path === path);
}
function guarded(route?: Routes[number]): boolean {
  return !!route?.canActivate?.includes(AuthGuard);
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
      expect(guarded(find(appRoutes, path)))
        .withContext(path)
        .toBe(true);
    }
  });

  it('guards private list/edit children but leaves public print view open', () => {
    const printChildren = find(printRoutes, '')?.children ?? [];
    expect(guarded(find(printChildren, '')))
      .withContext('prints list')
      .toBe(true);
    expect(guarded(find(printChildren, 'copy/:id')))
      .withContext('print copy')
      .toBe(true);
    expect(guarded(find(printChildren, ':id')))
      .withContext('print view is public')
      .toBe(false);
  });

  it('guards all filament children (detail is private)', () => {
    const children = find(filamentRoutes, '')?.children ?? [];
    for (const path of ['', 'copy/:id', ':id']) {
      expect(guarded(find(children, path)))
        .withContext(`filament ${path}`)
        .toBe(true);
    }
  });

  it('guards all printer children (detail is private)', () => {
    const children = find(printerRoutes, '')?.children ?? [];
    for (const path of ['', ':id']) {
      expect(guarded(find(children, path)))
        .withContext(`printer ${path}`)
        .toBe(true);
    }
  });
});
