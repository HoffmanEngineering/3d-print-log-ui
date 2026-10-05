import { Routes } from '@angular/router';

import { environment } from 'src/environments/environment';

export const ACHIEVEMENTS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./my-achievements/my-achievements.component').then(
        (m) => m.MyAchievementsComponent
      ),
  },
  // The art review sheet: development builds only, linked from nowhere.
  ...(environment.production
    ? []
    : [
        {
          path: 'gallery',
          loadComponent: () =>
            import('./achievement-gallery/achievement-gallery.component').then(
              (m) => m.AchievementGalleryComponent
            ),
        },
      ]),
];
