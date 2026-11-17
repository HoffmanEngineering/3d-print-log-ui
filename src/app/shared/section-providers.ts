import { EnvironmentProviders, Provider } from '@angular/core';
import { provideNativeDateAdapter } from '@angular/material/core';
import { MatDialog } from '@angular/material/dialog';

/**
 * What each lazy section's `''` route provides: the native DateAdapter its
 * datepickers need (there is no app-wide one), and a MatDialog of its own, so
 * the dialogs a section opens belong to that section.
 *
 * MAT_DATE_LOCALE comes from the app config. Everything else the old
 * SharedModule's imports carried is already provided in root.
 */
export function provideSectionProviders(): (Provider | EnvironmentProviders)[] {
  return [provideNativeDateAdapter(), MatDialog];
}
