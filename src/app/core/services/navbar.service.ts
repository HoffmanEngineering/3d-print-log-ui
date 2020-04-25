import { Injectable } from '@angular/core';
import { BehaviorSubject, Subject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class NavbarService {
  private showHamburgerMenuIcon = new BehaviorSubject<boolean>(false);
  public showHamburgerMenuIcon$ = this.showHamburgerMenuIcon.asObservable();

  private hamburgerMenuIconClick = new Subject();
  public hamburgerMenuIconClick$ = this.hamburgerMenuIconClick.asObservable();

  constructor() {}

  public menuClicked() {
    this.hamburgerMenuIconClick.next();
  }

  public showMenuIcon(showMenu: boolean) {
    this.showHamburgerMenuIcon.next(showMenu);
  }
}
