import type { MockedObject } from 'vitest';
import { signal, WritableSignal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ToastrService } from 'ngx-toastr';

import { HttpErrorResponse } from '@angular/common/http';
import { of, Subject } from 'rxjs';
import { LoggingService } from 'src/app/core/services/logging.service';
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
      addPrintComment: vi.fn().mockName('PrintService.addPrintComment'),
    };

    const mockLoggingService = {
      logEvent: vi.fn().mockName('LoggingService.logEvent'),
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
        { provide: LoggingService, useValue: mockLoggingService },
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

  /**
   * Posting used to clear the box before the request went out and had no error
   * handler, so a refused comment vanished without a word. The text now stays
   * until the API accepts it, and a failure says why.
   */
  describe('posting a comment', () => {
    let posted: Subject<Comment>;
    let printService: MockedObject<PrintService>;
    let toastr: MockedObject<ToastrService>;
    let logging: MockedObject<LoggingService>;

    const root = () => fixture.nativeElement as HTMLElement;
    const replyBox = () =>
      root().querySelector('#add-comment-textarea') as HTMLTextAreaElement;
    const submit = () =>
      root().querySelector('#btn-add-print-comment') as HTMLButtonElement;

    const type = async (text: string) => {
      replyBox().value = text;
      replyBox().dispatchEvent(new Event('input'));
      fixture.detectChanges();
      await fixture.whenStable();
    };

    const settle = async () => {
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();
    };

    const refusal = (status: number, error: unknown) =>
      new HttpErrorResponse({ status, error });

    beforeEach(async () => {
      printService = TestBed.inject(PrintService) as MockedObject<PrintService>;
      toastr = TestBed.inject(ToastrService) as MockedObject<ToastrService>;
      logging = TestBed.inject(LoggingService) as MockedObject<LoggingService>;
      posted = new Subject<Comment>();
      printService.addPrintComment.mockReturnValue(posted.asObservable());

      userProfile.set({ id: 4, profilePicture: '' } as UserProfileInfo);
      fixture.componentRef.setInput('printId', 12);
      fixture.componentRef.setInput('allowComments', true);
      fixture.componentRef.setInput('comments', []);
      await settle();
      await type('Great print!');
    });

    it('posts the typed text for this print', () => {
      submit().click();

      expect(printService.addPrintComment).toHaveBeenCalledWith(
        12,
        'Great print!'
      );
    });

    it('clears the box and reports the comment once the API accepts it', async () => {
      const added: Comment[] = [];
      component.commentAdded.subscribe((c) => added.push(c));
      submit().click();
      await settle();

      // Still in flight: nothing is cleared yet.
      expect(replyBox().value).toBe('Great print!');

      const comment = { id: 50, body: 'Great print!' } as Comment;
      posted.next(comment);
      posted.complete();
      await settle();

      expect(added).toEqual([comment]);
      expect(replyBox().value).toBe('');
      expect(submit().disabled).toBe(false);
    });

    it('disables the submit button while the post is in flight', async () => {
      submit().click();
      await settle();

      expect(submit().disabled).toBe(true);

      // A second click (or a call that slips past the disabled button) cannot post twice.
      component.addComment();
      expect(printService.addPrintComment).toHaveBeenCalledTimes(1);
    });

    it('keeps the text and shows the API reason when rate limited', async () => {
      submit().click();
      await settle();

      posted.error(
        refusal(429, {
          code: 'comment_rate_limited',
          detail:
            'You are commenting on this print too often. Try again later.',
        })
      );
      await settle();

      expect(replyBox().value).toBe('Great print!');
      expect(submit().disabled).toBe(false);
      expect(toastr.error).toHaveBeenCalledWith(
        'You are commenting on this print too often. Try again later.'
      );
      expect(logging.logEvent).toHaveBeenCalledWith(
        'PrintComments_PostFailed',
        expect.objectContaining({
          printId: 12,
          status: 429,
          code: 'comment_rate_limited',
        })
      );
    });

    it('shows the API reason when the print has reached its comment limit', async () => {
      submit().click();
      await settle();

      posted.error(
        refusal(400, {
          code: 'comment_limit_reached',
          detail: 'This print has reached the limit of 1,000 comments.',
        })
      );
      await settle();

      expect(replyBox().value).toBe('Great print!');
      expect(toastr.error).toHaveBeenCalledWith(
        'This print has reached the limit of 1,000 comments.'
      );
    });

    it('shows a generic message, never the server text, for an uncoded failure', async () => {
      submit().click();
      await settle();

      posted.error(
        refusal(500, { detail: 'SqlException: something internal broke' })
      );
      await settle();

      expect(replyBox().value).toBe('Great print!');
      expect(submit().disabled).toBe(false);
      expect(toastr.error).toHaveBeenCalledWith(
        'Your comment could not be posted. Please try again.'
      );
      expect(JSON.stringify(toastr.error.mock.calls)).not.toContain(
        'SqlException'
      );
    });
  });
});
