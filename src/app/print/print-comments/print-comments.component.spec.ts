import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { ToastrService } from 'ngx-toastr';

import { of } from 'rxjs';
import { AuthService } from 'src/app/core/services/auth.service';
import { PrintService } from 'src/app/core/services/print.service';
import { PrintCommentsComponent } from './print-comments.component';

describe('PrintCommentsComponent', () => {
  let component: PrintCommentsComponent;
  let fixture: ComponentFixture<PrintCommentsComponent>;

  beforeEach(
    waitForAsync(() => {
      const mockAuthService = {
        ...jasmine.createSpyObj<AuthService>('AuthService', ['getUser$']),
        userProfile$: of(null),
      };

      const mockPrintService = jasmine.createSpyObj<PrintService>(
        'PrintService',
        ['deletePrintComment']
      );

      const mockToastrService = jasmine.createSpyObj<ToastrService>(
        'ToastrService',
        ['success', 'error']
      );

      TestBed.configureTestingModule({
        declarations: [PrintCommentsComponent],
        providers: [
          { provide: AuthService, useValue: mockAuthService },
          { provide: PrintService, useValue: mockPrintService },
          { provide: ToastrService, useValue: mockToastrService },
        ],
      }).compileComponents();
    })
  );

  beforeEach(() => {
    fixture = TestBed.createComponent(PrintCommentsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
