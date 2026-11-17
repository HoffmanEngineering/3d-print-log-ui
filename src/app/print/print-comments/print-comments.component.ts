import {
  Component,
  ElementRef,
  inject,
  input,
  output,
  viewChild,
  ChangeDetectionStrategy,
  computed,
  signal,
} from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { ToastrService } from 'ngx-toastr';
import { LoggingService } from 'src/app/core/services/logging.service';
import { AuthService } from 'src/app/core/services/auth.service';
import { Comment } from 'src/app/core/services/comment.service';
import { PrintService } from 'src/app/core/services/print.service';
import { CommentComponent } from 'src/app/shared/comments/comment/comment.component';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

/**
 * The refusals whose `detail` the API writes for the user to read. Any other
 * failure gets the generic message, so server text from an unexpected error
 * (a 500's ProblemDetails, a proxy's HTML page) never reaches the screen.
 */
const USER_FACING_COMMENT_REFUSALS = new Set([
  'comment_rate_limited',
  'comment_limit_reached',
]);

const GENERIC_COMMENT_ERROR =
  'Your comment could not be posted. Please try again.';

/** The ProblemDetails `code` of a failed comment post, or null. */
function commentErrorCode(err: unknown): string | null {
  if (!(err instanceof HttpErrorResponse)) {
    return null;
  }
  const body = err.error as { code?: unknown } | null;
  return typeof body?.code === 'string' ? body.code : null;
}

/** The message to show for a failed comment post. */
function commentErrorMessage(err: unknown): string {
  const code = commentErrorCode(err);
  if (code !== null && USER_FACING_COMMENT_REFUSALS.has(code)) {
    const detail = (err as HttpErrorResponse).error?.detail;
    if (typeof detail === 'string' && detail.trim() !== '') {
      return detail;
    }
  }
  return GENERIC_COMMENT_ERROR;
}

@Component({
  selector: 'app-print-comments',
  templateUrl: './print-comments.component.html',
  styleUrls: ['./print-comments.component.scss'],
  imports: [
    CommentComponent,
    FormsModule,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PrintCommentsComponent {
  private readonly authService = inject(AuthService);
  private readonly printService = inject(PrintService);
  private readonly toastrService = inject(ToastrService);
  private readonly loggingService = inject(LoggingService);

  readonly printId = input<number>();
  readonly printOwnerUserId = input<number>();
  readonly comments = input<Comment[]>();
  readonly allowComments = input<boolean>();

  /**
   * A comment the API has accepted. This component posts it, so it can keep
   * the typed text and report a refusal; the parent owns the comment list as a
   * signal and appends the new row.
   */
  readonly commentAdded = output<Comment>();

  /**
   * Deletion is reported upward for the same reason `commentAdded` is: the
   * parent owns the comment list as a signal and is OnPush, so removing the row
   * from this component's input array mutates the array without repainting
   * anything.
   */
  readonly commentDeleted = output<Comment>();

  readonly newCommentTextArea = viewChild<ElementRef>('newCommentTextArea');

  readonly notLoggedIn = viewChild<ElementRef>('notLoggedIn');

  private readonly user = this.authService.userProfile;

  readonly isLoggedIn = computed(() => this.user() !== null);
  readonly currentUserId = computed(() => this.user()?.id ?? null);
  readonly currentUserProfilePicture = computed(
    () => this.user()?.profilePicture ?? ''
  );

  /** The reply box's text. Cleared only once the API has accepted the comment. */
  readonly newComment = signal('');

  /** True while a post is in flight; disables the submit button. */
  readonly posting = signal(false);

  /**
   * Posts the reply box's text. The text stays in the box until the API
   * accepts it, so a refused or failed post never loses what the user typed.
   */
  public addComment() {
    const body = this.newComment();
    const printId = this.printId();
    if (body === '' || this.posting() || printId === undefined) {
      return;
    }

    this.posting.set(true);
    this.printService.addPrintComment(printId, body).subscribe({
      next: (comment) => {
        this.posting.set(false);
        this.newComment.set('');
        this.commentAdded.emit(comment);
      },
      error: (err: unknown) => {
        this.posting.set(false);
        const code = commentErrorCode(err);
        this.loggingService.logEvent('PrintComments_PostFailed', {
          printId,
          status: err instanceof HttpErrorResponse ? err.status : null,
          code,
        });
        this.toastrService.error(commentErrorMessage(err));
      },
    });
  }

  public scrollToReply() {
    const newCommentTextArea = this.newCommentTextArea();
    const notLoggedIn = this.notLoggedIn();
    if (newCommentTextArea) {
      newCommentTextArea.nativeElement.scrollIntoView();
      newCommentTextArea.nativeElement.focus();
    } else if (notLoggedIn) {
      notLoggedIn.nativeElement.scrollIntoView();
    }
  }

  public deleteComment(comment: Comment) {
    this.printService.deletePrintComment(this.printId(), comment.id).subscribe(
      () => {
        this.toastrService.success('Comment deleted successfully.');

        this.commentDeleted.emit(comment);
      },
      (err) => {
        const message = err?.error ?? err?.message ?? '';
        this.toastrService.error(message);
      }
    );
  }
}
