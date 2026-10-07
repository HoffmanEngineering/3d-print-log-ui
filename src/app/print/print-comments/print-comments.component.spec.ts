import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ToastrService } from 'ngx-toastr';

import { BehaviorSubject, of } from 'rxjs';
import {
  AuthService,
  UserProfileInfo,
} from 'src/app/core/services/auth.service';
import { Comment } from 'src/app/core/services/comment.service';
import { PrintService } from 'src/app/core/services/print.service';
import { PrintCommentsComponent } from './print-comments.component';

describe('PrintCommentsComponent', () => {
  let component: PrintCommentsComponent;
  let fixture: ComponentFixture<PrintCommentsComponent>;
  let userProfile$: BehaviorSubject<UserProfileInfo | null>;

  beforeEach(waitForAsync(() => {
    userProfile$ = new BehaviorSubject<UserProfileInfo | null>(null);
    const mockAuthService = {
      ...jasmine.createSpyObj<AuthService>('AuthService', ['getUser$']),
      userProfile$: userProfile$.asObservable(),
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
      imports: [PrintCommentsComponent, NoopAnimationsModule],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: PrintService, useValue: mockPrintService },
        { provide: ToastrService, useValue: mockToastrService },
      ],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(PrintCommentsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('unsubscribes from the user profile when destroyed', () => {
    expect(userProfile$.observed).toBeTrue();

    fixture.destroy();

    expect(userProfile$.observed).toBeFalse();
  });

  /**
   * Regression: deleting used to splice the comment straight out of the
   * `comments` input. The parent owns that list as a signal and is OnPush, so
   * the mutation removed the data without repainting - the comment stayed on
   * screen until the next full page load. Deletion is reported upward instead.
   */
  it('reports a deleted comment upward without mutating the input list', () => {
    const printService = TestBed.inject(
      PrintService
    ) as jasmine.SpyObj<PrintService>;
    printService.deletePrintComment.and.returnValue(of(null));

    const target = { id: 7 } as Comment;
    const comments = [target, { id: 8 } as Comment];
    component.printId = 1;
    component.comments = comments;

    let emitted: Comment | null = null;
    component.commentDeleted.subscribe((c) => (emitted = c));

    component.deleteComment(target);

    expect(printService.deletePrintComment).toHaveBeenCalledWith(1, 7);
    expect(emitted).toBe(target);
    expect(comments.length).toBe(2);
  });
});
