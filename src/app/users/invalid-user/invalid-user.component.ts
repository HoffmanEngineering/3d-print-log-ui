import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-invalid-user',
  templateUrl: './invalid-user.component.html',
  styleUrls: ['./invalid-user.component.scss'],
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InvalidUserComponent {
  constructor() {}
}
