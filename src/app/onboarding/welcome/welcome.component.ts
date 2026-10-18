import { ChangeDetectionStrategy, Component } from '@angular/core';

/** Placeholder; the welcome flow replaces this template. */
@Component({
  selector: 'app-welcome',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<h1>Welcome to 3D Print Log</h1>`,
})
export class WelcomeComponent {}
