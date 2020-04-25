import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from 'src/app/core/services/auth.service';

@Component({
  selector: 'app-docs-getting-started',
  templateUrl: './docs-getting-started.component.html',
  styleUrls: ['./docs-getting-started.component.scss'],
})
export class DocsGettingStartedComponent implements OnInit {
  constructor(public authService: AuthService, public router: Router) {}

  ngOnInit() {}
}
