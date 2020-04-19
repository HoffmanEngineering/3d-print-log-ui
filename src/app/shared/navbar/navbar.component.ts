import { Component, OnInit } from '@angular/core';
import { AuthService } from 'src/app/core/services/auth.service';

@Component({
  selector: 'app-navbar',
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.scss'],
})
export class NavbarComponent implements OnInit {
  public profilePictureUrl: string | null = null;

  constructor(public auth: AuthService) {}

  ngOnInit() {
    this.auth.userProfile$.subscribe(user => {
      if (user && user.picture) {
        this.profilePictureUrl = user.picture;
      } else {
        this.profilePictureUrl = null;
      }
    });
  }
}
