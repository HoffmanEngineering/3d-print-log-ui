import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { of } from 'rxjs';
import { AuthService } from 'src/app/core/services/auth.service';
import { PrintCommentsComponent } from './print-comments.component';

describe('PrintCommentsComponent', () => {
  let component: PrintCommentsComponent;
  let fixture: ComponentFixture<PrintCommentsComponent>;

  beforeEach(async(() => {
    const mockAuthService = { ...jasmine.createSpyObj<AuthService>('AuthService', ['getUser$']), userProfile$: of(null)};

    TestBed.configureTestingModule({
      declarations: [ PrintCommentsComponent ],
      providers: [{ provide: AuthService, useValue: mockAuthService }],
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(PrintCommentsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
