import type { MockedObject } from 'vitest';
import { signal, WritableSignal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ToastrService } from 'ngx-toastr';

import { of } from 'rxjs';
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
  let userProfile: WritableSignal<UserProfileInfo | null>;

  beforeEach(async () => {
    userProfile = signal<UserProfileInfo | null>(null);
    const mockAuthService = {
      ...{
        getUser$: vi.fn().mockName('AuthService.getUser$'),
      },
      userProfile,
    };

    const mockPrintService = {
      deletePrintComment: vi.fn().mockName('PrintService.deletePrintComment'),
    };

    const mockToastrService = {
      success: vi.fn().mockName('ToastrService.success'),
      error: vi.fn().mockName('ToastrService.error'),
    };

    await TestBed.configureTestingModule({
      imports: [PrintCommentsComponent, NoopAnimationsModule],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: PrintService, useValue: mockPrintService },
        { provide: ToastrService, useValue: mockToastrService },
      ],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(PrintCommentsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('the reply box', () => {
    const replyBox = () =>
      (fixture.nativeElement as HTMLElement).querySelector(
        '#add-comment-textarea'
      );
    const text = () => (fixture.nativeElement as HTMLElement).textContent;

    beforeEach(() => {
      fixture.componentRef.setInput('allowComments', true);
      fixture.componentRef.setInput('comments', []);
      fixture.detectChanges();
    });

    it('asks a signed-out visitor to log in', () => {
      expect(replyBox()).toBeNull();
      expect(text()).toContain('Please log in to add comments');
    });

    it('appears once the visitor signs in', () => {
      userProfile.set({ id: 4, profilePicture: '' } as UserProfileInfo);
      fixture.detectChanges();

      expect(replyBox()).not.toBeNull();
      expect(text()).not.toContain('Please log in to add comments');
    });

    it('goes away again when the user signs out', () => {
      userProfile.set({ id: 4, profilePicture: '' } as UserProfileInfo);
      fixture.detectChanges();

      userProfile.set(null);
      fixture.detectChanges();

      expect(replyBox()).toBeNull();
    });
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
    ) as MockedObject<PrintService>;
    printService.deletePrintComment.mockReturnValue(of(null));

    const target = { id: 7 } as Comment;
    const comments = [target, { id: 8 } as Comment];
    fixture.componentRef.setInput('printId', 1);
    fixture.componentRef.setInput('comments', comments);

    let emitted: Comment | null = null;
    component.commentDeleted.subscribe((c) => (emitted = c));

    component.deleteComment(target);

    expect(printService.deletePrintComment).toHaveBeenCalledWith(1, 7);
    expect(emitted).toBe(target);
    expect(comments.length).toBe(2);
  });
});
