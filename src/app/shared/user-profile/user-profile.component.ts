import { Component, OnInit } from '@angular/core';
import { AuthService } from 'src/app/core/services/auth.service';
import { UserService } from 'src/app/core/services/user.service';

@Component({
  selector: 'app-user-profile',
  templateUrl: './user-profile.component.html',
  styleUrls: ['./user-profile.component.scss'],
})
export class UserProfileComponent implements OnInit {
  constructor(public auth: AuthService, public user: UserService) {}

  public test;

  ngOnInit() {
    this.user.ping$().subscribe(data => {
      console.log('data', { data });
      this.test = data;
    });
  }
}
