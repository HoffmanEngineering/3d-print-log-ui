import { Component, OnInit, inject } from '@angular/core';
import { AuthService } from 'src/app/core/services/auth.service';

@Component({
  selector: 'app-callback',
  templateUrl: './callback.component.html',
  styleUrls: ['./callback.component.scss'],
})
export class CallbackComponent implements OnInit {
  private auth = inject(AuthService);

  ngOnInit() {
    this.auth.handleAuthCallback();
  }
}
