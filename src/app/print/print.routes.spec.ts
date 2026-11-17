import { Route } from '@angular/router';
import { PRINT_ROUTES } from './print.routes';
import { lastFilamentMeasureSettingResolver } from './resolvers/last-filament-measure-setting.resolver';
import { lastAllowCommentsSettingResolver } from '../core/resolvers/user-setting.resolvers';

describe('PRINT_ROUTES', () => {
  const child = (path: string): Route =>
    PRINT_ROUTES[0].children!.find((r) => r.path === path)!;

  // The edit form reads `lastMaterialMeasureSettings` and `lastAllowCommentsSetting`. The copy
  // route resolved the measures under another key, so Add Filament ignored the last measure and
  // changing one threw; no route resolved Allow Comments at all.
  for (const path of [':id/edit', 'copy/:id']) {
    it(`gives the edit form its remembered settings on ${path}`, () => {
      const resolve = child(path).resolve!;

      expect(resolve['lastMaterialMeasureSettings']).toBe(
        lastFilamentMeasureSettingResolver
      );
      expect(resolve['lastAllowCommentsSetting']).toBe(
        lastAllowCommentsSettingResolver
      );
      expect(resolve['lastFilamentMeasureSettings']).toBeUndefined();
    });
  }
});
